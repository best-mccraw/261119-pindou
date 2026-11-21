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

test('灰阶及JPEG轻微偏色保持黑白灰，不把头发和轮廓变绿', () => {
    for (let v = 0; v <= 255; v++) a.ok([0, 1, 2, 3].includes(c.nearest([v, v, v])), `灰阶 ${v} 偏成彩色`);
    for (const rgb of [[142,142,142],[66,66,66],[44,45,40],[140,143,141]]) a.ok([0,1,2,3].includes(c.nearest(rgb)));
});

test('灰紫毛色不被强化为鲜紫，已有豆色和真实绿色保持可识别', () => {
    for (const rgb of [[178,164,178],[183,166,185]]) {
        const matched = c.palette[c.nearest(rgb)].rgb;
        a.ok(Math.max(...matched)-Math.min(...matched) <= 32, '低饱和毛色被匹配为浓艳颜色');
    }
    for (let i=0;i<c.palette.length;i++) a.equal(c.nearest(c.palette[i].rgb),i, c.palette[i].id+' 颜色自匹配失败');
    for (const rgb of [[50,135,89],[28,80,62],[56,154,153]]) a.ok([18,19,20,22,23].includes(c.nearest(rgb)), '真正绿色丢失');
});

test('整块灰色从采样到统计保持灰阶，已有图纸不会因匹配规则改变而重着色', () => {
    const pixels=new Uint8ClampedArray(20*20*4);for(let i=0;i<400;i++)pixels.set([142,142,142,255],i*4);
    const p=c.quantize(pixels,20,20,10,10);a.equal(p.counts.length,1);a.ok([0,1,2,3].includes(p.cells[0]));a.equal(p.counts[0].count,100);
    const old=c.fromCells(10,10,Array(100).fill(23));a.equal(old.counts[0].hex,'#389E9B');
});
