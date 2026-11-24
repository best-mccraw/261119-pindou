export const LEGACY_PALETTE_VERSION = 'generic-32-v1';
export const PALETTE_VERSION = 'generic-96-v1';
const hex = ['#FFFFFF', '#191D23', '#6B7280', '#C6CDD3', '#FCE7C0', '#EBC190', '#B77950', '#6E4534', '#FCE0DD', '#F5A3AB', '#E95869', '#B62F47', '#FFD875', '#F5AE38', '#E47B28', '#B65023', '#E3EBC0', '#B9D679', '#74AD61', '#31875A', '#185343', '#D0EDE5', '#87CBB8', '#389E9B', '#D9ECF8', '#97C5E3', '#568EC2', '#35598A', '#E4DDF2', '#B6A0D5', '#8467AD', '#5C407A'];
// P01～P32 与旧版一致，新增色号只追加。
hex.push(
    '#000000', '#333333', '#494949', '#5E5E5E', '#858585', '#969696', '#AAAAAA', '#B8B8B8',
    '#DADADA', '#E8E8E8', '#F4F4F4', '#FCFCFC', '#B2A4B2', '#B7A6B9', '#75506F', '#999199',
    '#8A7E8C', '#CDC2CF', '#968996', '#D8CED9', '#A59EAB', '#5F5662', '#C0B9C2', '#7E747F',
    '#FFF0DC', '#F4D7BD', '#E8B89E', '#D9977B', '#BD7F64', '#A3654E', '#7E4D3D', '#4A302A',
    '#FFEFF2', '#F9CDD7', '#E8A5B6', '#D17C96', '#A9506E', '#71354E', '#FFF5D2', '#FFE8A3',
    '#EFD68A', '#D9B46B', '#B9904C', '#F3C49F', '#EBF2E6', '#C9D8BE', '#9FB59A', '#6C9A7A',
    '#49735E', '#294C3D', '#B8CEC2', '#8CA99C', '#E9EFF4', '#C3D3DF', '#9CB1C3', '#738DA6',
    '#4D667E', '#293B52', '#F2EAF4', '#D8C8E1', '#BBA3CA', '#9A7BAE', '#755A8B', '#483953',
);
export const palette = hex.map((hex, i) => ({ id: `P${String(i + 1).padStart(2, '0')}`, hex, rgb: [1, 3, 5].map(n => parseInt(hex.slice(n, n + 2), 16)) }));
export interface Pattern {
    width: number;
    height: number;
    paletteVersion: string;
    cells: number[];
    counts: {
        index: number;
        id: string;
        hex: string;
        count: number;
    }[];
}
export function dimensions(w: unknown, h: unknown) { const read = (v: unknown) => { if (!/^\d+$/.test(String(v)))
    throw Error('宽高请填写 10～100 的整数'); const n = Number(v); if (n < 10 || n > 100)
    throw Error('宽高请填写 10～100 的整数'); return n; }; return { width: read(w), height: read(h) }; }
function lab(rgb: number[]) { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; }
const labs = palette.map(p => lab(p.rgb));
// 中性灰只在黑白灰中匹配；低彩度颜色额外避免被放大为鲜艳色。
// 只改变新图片的选色，不改变固定色表、色号或已保存的格子数据。
export function nearest(rgb: number[]) {
    const exact = palette.findIndex(color => color.rgb.every((value, i) => value === rgb[i]));
    if (exact >= 0) return exact;
    const v = lab(rgb), chroma = Math.hypot(v[1], v[2]);
    const neutral = Math.max(...rgb) - Math.min(...rgb) <= 12;
    const saturationWeight = 10 * Math.max(0, 1 - chroma / .08);
    let best = 0, dist = Infinity;
    labs.forEach((p, i) => {
        if (neutral && i > 3 && !(palette[i].rgb[0] === palette[i].rgb[1] && palette[i].rgb[1] === palette[i].rgb[2])) return;
        const excessChroma = Math.max(0, Math.hypot(p[1], p[2]) - chroma);
        const d = p.reduce((n, x, j) => n + (x - v[j]) ** 2, 0)
            + saturationWeight * excessChroma ** 2;
        if (d < dist) { dist = d; best = i; }
    });
    return best;
}
export function getPalette(version: string) {
    if (version === LEGACY_PALETTE_VERSION) return palette.slice(0, 32);
    if (version === PALETTE_VERSION) return palette;
    throw Error('此图纸的色表版本暂不支持，请更新版本后查看');
}
export function fromCells(width: number, height: number, cells: number[], version = PALETTE_VERSION): Pattern {
    dimensions(width, height);
    const colors = getPalette(version);
    if (cells.length !== width * height || cells.some(i => !Number.isInteger(i) || i < 0 || i >= colors.length))
        throw Error('图纸数据不完整，请重新加载');
    const counts = colors.map((color, index) => ({ index, id: color.id, hex: color.hex, count: 0 }));
    cells.forEach(index => counts[index].count++);
    return { width, height, paletteVersion: version, cells, counts: counts.filter(color => color.count) };
}
export function quantize(data: Uint8ClampedArray, sw: number, sh: number, width: number, height: number) { dimensions(width, height); if (sw < width || sh < height || data.length !== sw * sh * 4)
    throw Error('图片采样失败，请重新选择'); const cells: number[] = []; for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
        const sums = [0, 0, 0];
        let count = 0;
        for (let sy = Math.floor(y * sh / height); sy < Math.floor((y + 1) * sh / height); sy++)
            for (let sx = Math.floor(x * sw / width); sx < Math.floor((x + 1) * sw / width); sx++) {
                const p = (sy * sw + sx) * 4, a = data[p + 3] / 255;
                for (let c = 0; c < 3; c++)
                    sums[c] += data[p + c] * a + 255 * (1 - a);
                count++;
            }
        cells.push(nearest(sums.map(n => n / count)));
    } return fromCells(width, height, cells); }
export function cropRect(sw: number, sh: number, w: number, h: number, zoom = 1, dx = 0, dy = 0) { let width = Math.min(sw, sh * w / h) / Math.max(1, Math.min(4, zoom)), height = width * h / w; return { width, height, x: Math.max(0, Math.min(sw - width, (sw - width) / 2 + dx)), y: Math.max(0, Math.min(sh - height, (sh - height) / 2 + dy)) }; }
export function ink(index: number) { const [r, g, b] = palette[index].rgb; return .2126 * r + .7152 * g + .0722 * b > 150 ? '#191D23' : '#FFFFFF'; }
