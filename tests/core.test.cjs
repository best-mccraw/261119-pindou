const { test } = require('node:test');
const a = require('node:assert/strict');
let c;
try {
    c = require('../build/core/pattern.js');
}
catch {
    c = {};
}
test('尺寸仅接受10到100整数', () => { a.equal(typeof c.dimensions, 'function'); for (const x of ['', null, 9, 101, 15.5, '1e2', '30x'])
    a.throws(() => c.dimensions(x, 30)); for (const n of [15, 30, 50, 100])
    a.deepEqual(c.dimensions(n, n), { width: n, height: n }); a.deepEqual(c.dimensions('17', '23'), { width: 17, height: 23 }); });
test('纯色可复现且每格一颗，透明白色合成', () => { a.equal(typeof c.quantize, 'function'); for (const [w, h] of [[15, 15], [30, 30], [50, 50], [100, 100], [17, 23]]) {
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    const p = c.quantize(rgba, w, h, w, h);
    a.equal(p.cells.length, w * h);
    a.equal(p.counts.reduce((n, x) => n + x.count, 0), w * h);
    a.equal(p.counts.length, 1);
    a.deepEqual(p, c.quantize(rgba, w, h, w, h));
    a.equal(c.quantize(new Uint8ClampedArray(w * h * 4), w, h, w, h).cells[0], p.cells[0]);
} });
test('区域采用平均色而不是单个点', () => { a.equal(typeof c.quantize, 'function'); let d = new Uint8ClampedArray(20 * 20 * 4); for (let i = 0; i < 400; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = i % 2 ? 255 : 0;
    d[i * 4 + 3] = 255;
} const p = c.quantize(d, 20, 20, 10, 10); a.equal(new Set(p.cells).size, 1); a.notEqual(p.cells[0], 0); });
test('裁剪保持目标比例且限制在源图片内', () => { a.equal(typeof c.cropRect, 'function'); for (const [w, h] of [[400, 100], [100, 400]])
    for (const z of [1, 2, 4]) {
        const r = c.cropRect(w, h, 30, 50, z, 999, -999);
        a.ok(Math.abs(r.width / r.height - .6) < 1e-9);
        a.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= w + 1e-8 && r.y + r.height <= h + 1e-8);
    } });
