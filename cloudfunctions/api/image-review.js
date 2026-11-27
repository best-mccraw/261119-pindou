const { createHash, randomBytes } = require('node:crypto');

const reviewWindow = 31 * 60 * 1000;
const retention = 60 * 60 * 1000;
const maxJpegLength = 980000;
const validTrace = value => typeof value === 'string' && /^[a-z0-9_-]{1,128}$/i.test(value);
const resultKey = (appid, trace) => 'result-' + createHash('sha256').update(appid + ':' + trace).digest('hex');

function verdict(event) {
    const suggestion = event.result?.suggest;
    return event.errcode === 0 && ['pass', 'review', 'risky'].includes(suggestion) ? suggestion : 'error';
}

function imageReview(cloud, db) {
    const jobs = db.collection('image_reviews');

    async function read(ref) {
        return (await ref.get()).data;
    }

    async function deleteFile(fileID) {
        const { fileList } = await cloud.deleteFile({ fileList: [fileID] });
        if (![0, -503003].includes(fileList?.[0]?.status)) throw Error('review file deletion failed');
    }

    async function cleanup(id, fileID, now) {
        if (/^[a-f0-9]{32}$/.test(id) && typeof fileID === 'string'
            && fileID.startsWith('cloud://') && fileID.split('/').slice(3).join('/') === 'image-review/' + id + '.jpg') {
            await deleteFile(fileID);
        }
        await jobs.doc(id).update({
            data: {
                fileID: db.command.remove(),
                deleteAfter: db.command.remove(),
                expiresAt: new Date(now + retention)
            }
        });
    }

    async function cleanupQuietly(id, fileID, now) {
        try {
            await cleanup(id, fileID, now);
        } catch {
            console.warn('[image-review] temporary file cleanup will be retried');
        }
    }

    async function start(jpeg, uid, openid, appid, now) {
        if (!appid || typeof jpeg !== 'string' || jpeg.length > maxJpegLength
            || !/^[A-Za-z0-9+/]+={0,2}$/.test(jpeg) || jpeg.length % 4 !== 0) {
            throw Error('invalid review request');
        }
        const fileContent = Buffer.from(jpeg, 'base64');
        if (fileContent[0] !== 0xff || fileContent[1] !== 0xd8 || fileContent[2] !== 0xff
            || fileContent[fileContent.length - 2] !== 0xff || fileContent[fileContent.length - 1] !== 0xd9) {
            throw Error('invalid review image');
        }

        const id = randomBytes(16).toString('hex');
        const ref = jobs.doc(id);
        const deleteAfter = now + reviewWindow;
        await ref.set({ data: { uid, appid, deleteAfter, deadline: deleteAfter } });
        let fileID;
        try {
            ({ fileID } = await cloud.uploadFile({ cloudPath: 'image-review/' + id + '.jpg', fileContent }));
            if (!fileID) throw Error('review upload failed');
            await ref.update({ data: { fileID } });
            const { fileList } = await cloud.getTempFileURL({ fileList: [{ fileID, maxAge: 2100 }] });
            const file = fileList?.[0];
            if (file?.status !== 0 || !file.tempFileURL?.startsWith('https://')) throw Error('review URL unavailable');

            const response = await cloud.openapi.security.mediaCheckAsync({
                mediaUrl: file.tempFileURL, mediaType: 2, version: 2, scene: 4, openid
            });
            const trace = response?.traceId ?? response?.trace_id;
            if ((response?.errCode ?? response?.errcode) !== 0 || !validTrace(trace)) {
                throw Error('review submission failed');
            }
            const key = resultKey(appid, trace);
            await ref.update({ data: { resultKey: key } });
            if (await read(jobs.doc(key))) await finish(id, fileID, now);
            return { id };
        } catch (error) {
            await cleanupQuietly(id, fileID, now);
            throw error;
        }
    }

    async function status(id, uid, appid, now) {
        if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw Error('invalid review ticket');
        const job = await read(jobs.doc(id));
        if (!job || job.uid !== uid || job.appid !== appid) throw Error('invalid review ticket');
        if (now >= job.deadline) return { status: 'error' };
        const result = job.resultKey ? await read(jobs.doc(job.resultKey)) : null;
        return { status: result?.status ?? 'pending' };
    }

    async function finish(id, fileID, now) {
        if (!fileID) return;
        await jobs.doc(id).update({ data: { deleteAfter: now } });
        await cleanupQuietly(id, fileID, now);
    }

    async function receive(event, now) {
        const { appid, trace_id: trace } = event;
        if (event.MsgType !== 'event' || event.Event !== 'wxa_media_check'
            || event.version !== 2 || !validTrace(appid) || !validTrace(trace)) return;

        const key = resultKey(appid, trace);
        // The callback may arrive before the submission persists its trace ID.
        await db.runTransaction(async tx => {
            const ref = tx.collection('image_reviews').doc(key);
            if (!await read(ref)) {
                await ref.set({ data: { status: verdict(event), expiresAt: new Date(now + retention) } });
            }
        });
        const { data } = await jobs.where({ resultKey: key }).limit(1).get();
        const job = data[0];
        if (job) await finish(job._id, job.fileID, now);
    }

    async function sweep(now) {
        const [overdue, expired] = await Promise.all([
            jobs.where({ deleteAfter: db.command.lte(now) }).limit(25).get(),
            jobs.where({ expiresAt: db.command.lte(new Date(now)) }).limit(25).get()
        ]);
        await Promise.all([
            ...overdue.data.map(job => cleanupQuietly(job._id, job.fileID, now)),
            ...expired.data.map(job => jobs.doc(job._id).remove())
        ]);
        return { overdue: overdue.data.length, expired: expired.data.length };
    }

    return { start, status, receive, sweep };
}

module.exports = { imageReview, verdict };
