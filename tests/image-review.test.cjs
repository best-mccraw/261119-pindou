const { test } = require('node:test');
const assert = require('node:assert/strict');

test('选图必须等到审核通过；违规、待复核和未知结果都不能继续', async () => {
    const { waitForReview, ImageReviewTimeout } = require('../build/services/image-review');
    const outcomes = ['pending', 'pass'];
    await waitForReview(async () => outcomes.shift(), () => true, async () => {});
    assert.equal(outcomes.length, 0);
    const noDelay = async () => {};
    await assert.rejects(waitForReview(async () => 'risky', () => true, noDelay), /违规/);
    await assert.rejects(waitForReview(async () => 'review', () => true, noDelay), /未能通过/);
    await assert.rejects(waitForReview(async () => 'error', () => true, noDelay), /重试/);
    await assert.rejects(waitForReview(async () => 'pending', () => true, noDelay), ImageReviewTimeout);
});

test('微信只在返回最终通过时放行；平台错误和待复核均不能放行', () => {
    const { verdict } = require('../cloudfunctions/api/image-review');
    const event = { errcode: 0, result: { suggest: 'pass' } };
    assert.equal(verdict(event), 'pass');
    assert.equal(verdict({ ...event, errcode: -1 }), 'error');
    assert.equal(verdict({ ...event, result: { suggest: 'risky' } }), 'risky');
    assert.equal(verdict({ ...event, result: { suggest: 'review' } }), 'review');
    assert.equal(verdict({ errcode: 0 }), 'error');
});

function reviewBackend() {
    const { imageReview } = require('../cloudfunctions/api/image-review');
    const jobs = new Map(), files = new Set(), remove = Symbol('remove');
    const db = {
        command: { lte: value => ({ lte: value }), remove: () => remove },
        async runTransaction(run) { return run(db); },
        collection() {
            return {
                doc(id) {
                    return {
                        async get() {
                            return { data: jobs.get(id) ?? null };
                        },
                        async set({ data }) { jobs.set(id, { _id: id, ...data }); },
                        async update({ data }) {
                            const job = jobs.get(id);
                            for (const [key, value] of Object.entries(data)) {
                                if (value === remove) delete job[key];
                                else job[key] = value;
                            }
                        },
                        async remove() { jobs.delete(id); }
                    };
                },
                where(condition) {
                    return { limit(count) { return { async get() {
                        const data = [...jobs.values()].filter(job => Object.entries(condition).every(
                            ([key, value]) => value?.lte === undefined ? job[key] === value : job[key] <= value.lte
                        ));
                        return { data: data.slice(0, count) };
                    } }; } };
                }
            };
        }
    };
    const cloud = {
        async uploadFile({ cloudPath }) {
            assert.match(cloudPath, /^image-review\/[a-f0-9]{32}\.jpg$/);
            const fileID = 'cloud://test.bucket/' + cloudPath;
            files.add(fileID);
            return { fileID };
        },
        async getTempFileURL() { return { fileList: [{ status: 0, tempFileURL: 'https://example.test/review.jpg' }] }; },
        async deleteFile({ fileList }) {
            files.delete(fileList[0]);
            return { fileList: [{ status: 0 }] };
        },
        openapi: { security: { async mediaCheckAsync(request) {
            assert.equal(request.openid, 'platform-openid');
            assert.equal(request.mediaType, 2);
            return { errCode: 0, traceId: 'test-trace' };
        } } }
    };
    const review = imageReview(cloud, db);
    const now = 1000;
    const start = () => review.start('/9j/2Q==', 'owner', 'platform-openid', 'wx-app', now);
    const receive = (suggest, appid = 'wx-app') => review.receive({
        MsgType: 'event', Event: 'wxa_media_check', appid, trace_id: 'test-trace',
        version: 2, errcode: 0, result: { suggest }
    }, now + 1);
    return { review, cloud, files, jobs, start, receive, now };
}

test('任务受用户身份保护，微信回调收到后删除图片，重发不改写判定', async () => {
    const { review, files, start, receive, now } = reviewBackend();
    const { id } = await start();
    assert.equal(files.size, 1);
    assert.deepEqual(await review.status(id, 'owner', 'wx-app', now), { status: 'pending' });
    await assert.rejects(review.status(id, 'other', 'wx-app', now), /invalid review ticket/);
    await receive('pass', 'wrong-app');
    assert.deepEqual(await review.status(id, 'owner', 'wx-app', now), { status: 'pending' });
    await receive('risky');
    await receive('pass');
    assert.equal(files.size, 0);
    assert.deepEqual(await review.status(id, 'owner', 'wx-app', now), { status: 'risky' });
});

test('回调先到也能关联任务并删除副本，长时间无回调则定时回收', async () => {
    const early = reviewBackend();
    await early.receive('pass');
    const { id } = await early.start();
    assert.equal(early.files.size, 0);
    assert.deepEqual(await early.review.status(id, 'owner', 'wx-app', early.now), { status: 'pass' });

    const pending = reviewBackend();
    const ticket = await pending.start();
    const expired = pending.now + 31 * 60 * 1000;
    await pending.review.sweep(expired);
    assert.equal(pending.files.size, 0);
    assert.deepEqual(await pending.review.status(ticket.id, 'owner', 'wx-app', expired), { status: 'error' });
    await pending.review.sweep(expired + 60 * 60 * 1000);
    assert.equal(pending.jobs.size, 0);
});

test('清理任务只能删除匹配当前检测任务路径的图片', async () => {
    const fixture = reviewBackend();
    const { id } = await fixture.start();
    const job = fixture.jobs.get(id);
    const fileID = 'cloud://test.bucket/covers/gallery.jpg';
    fixture.files.add(fileID);
    job.fileID = fileID;
    await fixture.review.sweep(job.deleteAfter);
    assert.equal(fixture.files.has(fileID), true);
});

test('微信拒绝创建检测任务时立即删除已上传的副本', async () => {
    const { cloud, files, start } = reviewBackend();
    cloud.openapi.security.mediaCheckAsync = async () => ({ errCode: -1 });
    await assert.rejects(start(), /submission failed/);
    assert.equal(files.size, 0);
});
