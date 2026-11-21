const { test } = require('node:test');
const a = require('node:assert/strict');
const { fromCells } = require('../build/core/pattern');
const { draw, layout } = require('../build/services/render');
const { RewardAd } = require('../build/services/ad');
const { config } = require('../build/config');
test('编号开关仅影响绘制，100×100画布容纳统计且每格28px', () => { const p = fromCells(100, 100, Array.from({ length: 10000 }, (_, i) => i % 32)), before = JSON.stringify(p); const text = []; const ctx = new Proxy({ fillText: (...x) => text.push(x) }, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => (o[k] = v, true) }); const l = draw(ctx, p, true); a.equal(text.filter(x => /^P\d\d$/.test(x[0])).length, 10000); a.equal(l.cell, 28); a.ok(l.width < 4096 && l.height < 4096); text.length = 0; draw(ctx, p, false); a.equal(text.filter(x => /^P\d\d$/.test(x[0])).length, 0); a.equal(JSON.stringify(p), before); a.ok(text.every(x => x[2] < l.height)); a.ok(layout(p, { x: 50, y: 50, w: 50, h: 50 }).width < 1600); });
test('真实广告完成一次，取消与加载失败不授权，释放监听', async () => { config.adUnitId = 'adunit-test'; let close, error, mode = 'complete', count = 0; const ad = { onClose: f => close = f, offClose: () => { close = undefined; }, onError: f => error = f, offError: () => { error = undefined; }, load: async () => { if (mode === 'error')
        throw Error('load'); }, show: async () => { const f = close; f({ isEnded: mode === 'complete' }); f({ isEnded: true }); }, destroy: () => { } }; global.wx = { createRewardedVideoAd: () => ad }; const service = new RewardAd(); await service.play().then(() => count++); a.equal(count, 1); a.equal(close, undefined); a.equal(error, undefined); mode = 'cancel'; await a.rejects(service.play()); mode = 'error'; await a.rejects(service.play()); service.destroy(); config.adUnitId = ''; });
test('未配置广告时拒绝，不提供绕过', async () => { config.adUnitId = ''; const ad = new RewardAd(); await a.rejects(ad.play(), /暂不可用/); });
test('图库停用旧示例并保留小猫，所有原创图纸编号和统计一致', () => { const data = require('../data/patterns.json'); a.ok(!data.some(p => /^original-\d{2}$/.test(p._id))); a.ok(data.some(p => p._id === 'user-cat-001')); a.equal(new Set(data.map(p => p._id)).size, data.length); a.ok(new Set(data.map(p => p.width + 'x' + p.height)).size >= 3); for (const p of data) {
    const v = fromCells(p.width, p.height, p.cells);
    a.equal(v.counts.reduce((n, c) => n + c.count, 0), p.width * p.height);
    a.ok(p.source.author && p.source.license && p.source.record);
    a.ok(require('node:fs').existsSync(p.source.record));
    a.ok(require('node:fs').existsSync(p.cover));
    for (const c of p.counts)
        a.equal(v.counts.find(x => x.index === c.index).count, c.count);
} });
