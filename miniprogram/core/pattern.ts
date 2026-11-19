export const PALETTE_VERSION = 'generic-32-v1';
const hex = ['#FFFFFF', '#191D23', '#6B7280', '#C6CDD3', '#FCE7C0', '#EBC190', '#B77950', '#6E4534', '#FCE0DD', '#F5A3AB', '#E95869', '#B62F47', '#FFD875', '#F5AE38', '#E47B28', '#B65023', '#E3EBC0', '#B9D679', '#74AD61', '#31875A', '#185343', '#D0EDE5', '#87CBB8', '#389E9B', '#D9ECF8', '#97C5E3', '#568EC2', '#35598A', '#E4DDF2', '#B6A0D5', '#8467AD', '#5C407A'];
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
export function nearest(rgb: number[]) { const v = lab(rgb); let best = 0, dist = Infinity; labs.forEach((p, i) => { const d = p.reduce((n, x, j) => n + (x - v[j]) ** 2, 0); if (d < dist) {
    dist = d;
    best = i;
} }); return best; }
export function fromCells(width: number, height: number, cells: number[]): Pattern { dimensions(width, height); if (cells.length !== width * height || cells.some(i => !Number.isInteger(i) || i < 0 || i >= 32))
    throw Error('图纸数据不完整，请重新加载'); const counts = palette.map((p, index) => ({ index, id: p.id, hex: p.hex, count: 0 })); cells.forEach(i => counts[i].count++); return { width, height, paletteVersion: PALETTE_VERSION, cells, counts: counts.filter(c => c.count) }; }
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
