import { Pattern, palette, ink } from '../core/pattern';
export interface Tile {
    x: number;
    y: number;
    w: number;
    h: number;
}
export function layout(p: Pattern, t: Tile) { const cell = 28, margin = 56; return { cell, margin, width: Math.max(640, t.w * cell + margin * 2), height: t.h * cell + margin + 130 + Math.ceil(p.counts.length / 4) * 38 + 110 }; }
// 同一个绘制函数用于预览、完整导出和低内存设备的分图。
export function draw(ctx: any, p: Pattern, labels: boolean, t: Tile = { x: 0, y: 0, w: p.width, h: p.height }) {
    const l = layout(p, t), { cell, margin, width, height } = l;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#153F36';
    ctx.font = 'bold 23px sans-serif';
    ctx.fillText(`拼豆图纸  ${p.width}×${p.height}  共 ${p.width * p.height} 颗`, 24, 30);
    ctx.font = '14px sans-serif';
    ctx.fillText(`范围：横 ${t.x + 1}–${t.x + t.w}，纵 ${t.y + 1}–${t.y + t.h}`, 24, 51);
    const top = 90;
    for (let y = 0; y < t.h; y++)
        for (let x = 0; x < t.w; x++) {
            const i = p.cells[(y + t.y) * p.width + x + t.x];
            ctx.fillStyle = palette[i].hex;
            ctx.fillRect(margin + x * cell, top + y * cell, cell, cell);
            if (labels) {
                ctx.fillStyle = ink(i);
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(palette[i].id, margin + x * cell + cell / 2, top + y * cell + 18);
            }
        }
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#153F36';
    for (let x = 0; x < t.w; x++)
        ctx.fillText(String(x + t.x + 1), margin + x * cell + 14, top - 10);
    for (let y = 0; y < t.h; y++)
        ctx.fillText(String(y + t.y + 1), margin - 18, top + y * cell + 18);
    for (let x = 0; x <= t.w; x++) {
        ctx.strokeStyle = (x + t.x) % 5 === 0 ? '#64746D' : '#BAC5BE';
        ctx.lineWidth = (x + t.x) % 5 === 0 ? 1.5 : .5;
        ctx.beginPath();
        ctx.moveTo(margin + x * cell, top);
        ctx.lineTo(margin + x * cell, top + t.h * cell);
        ctx.stroke();
    }
    for (let y = 0; y <= t.h; y++) {
        ctx.strokeStyle = (y + t.y) % 5 === 0 ? '#64746D' : '#BAC5BE';
        ctx.lineWidth = (y + t.y) % 5 === 0 ? 1.5 : .5;
        ctx.beginPath();
        ctx.moveTo(margin, top + y * cell);
        ctx.lineTo(margin + t.w * cell, top + y * cell);
        ctx.stroke();
    }
    ctx.textAlign = 'left';
    const start = top + t.h * cell + 40;
    ctx.fillStyle = '#153F36';
    ctx.font = '18px sans-serif';
    ctx.fillText('整张图纸用豆表（含白色背景）', 24, start);
    p.counts.forEach((c, i) => { const x = 24 + (i % 4) * ((width - 48) / 4), y = start + 20 + Math.floor(i / 4) * 38; ctx.fillStyle = c.hex; ctx.fillRect(x, y, 22, 22); ctx.strokeStyle = '#BAC5BE'; ctx.strokeRect(x, y, 22, 22); ctx.fillStyle = '#153F36'; ctx.font = '15px sans-serif'; ctx.fillText(`${c.id} ${c.count}颗`, x + 28, y + 17); });
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64746D';
    ctx.fillText('通用颜色编号，非品牌色号；实际选豆请对照颜色。', 24, height - 30);
    return l;
}
export async function canvasNode(page: any, id: string): Promise<any> { return new Promise((resolve, reject) => wx.createSelectorQuery().in(page).select(id).fields({ node: true, size: true }, (res: any) => res?.node ? resolve(res.node) : reject(Error('画布未就绪，请重试'))).exec()); }
export async function renderFile(page: any, p: Pattern, labels: boolean, t: Tile = { x: 0, y: 0, w: p.width, h: p.height }) { const canvas = await canvasNode(page, '#export'), l = layout(p, t); canvas.width = l.width; canvas.height = l.height; draw(canvas.getContext('2d'), p, labels, t); const r = await wx.canvasToTempFilePath({ canvas, fileType: 'png', destWidth: l.width, destHeight: l.height, width: l.width, height: l.height }, page); return r.tempFilePath; }
export async function exportFiles(page: any, p: Pattern, labels: boolean) { try {
    return [await renderFile(page, p, labels)];
}
catch {
    if (p.width <= 50 && p.height <= 50)
        throw Error('导出失败，请关闭其他应用后重试');
    const files: string[] = [];
    for (let y = 0; y < p.height; y += 50)
        for (let x = 0; x < p.width; x += 50)
            files.push(await renderFile(page, p, labels, { x, y, w: Math.min(50, p.width - x), h: Math.min(50, p.height - y) }));
    return files;
} }
