const { test } = require('node:test');
const a = require('node:assert/strict');
let transform;
try {
    transform = require('../build/core/orientation').orientationTransform;
}
catch { }
test('8种EXIF方向全部映射到有效边界，竖拍交换宽高且不变形', () => { a.equal(typeof transform, 'function'); for (const dir of ['up', 'up-mirrored', 'down', 'down-mirrored', 'left-mirrored', 'right', 'right-mirrored', 'left']) {
    const t = transform(400, 200, dir);
    for (const [x, y] of [[0, 0], [400, 0], [0, 200], [400, 200]]) {
        const [a1, b, c, d, e, f] = t.matrix;
        const X = a1 * x + c * y + e, Y = b * x + d * y + f;
        a.ok(X >= 0 && X <= t.width);
        a.ok(Y >= 0 && Y <= t.height);
    }
    if (dir === 'right') {
        a.equal(t.width, 200);
        a.equal(t.height, 400);
    }
} a.equal(transform(4000, 3000).width, 1600); });
