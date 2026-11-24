import { Pattern, palette, ink } from '../core/pattern';
export interface Tile {
    x: number;
    y: number;
    w: number;
    h: number;
}
export function fitPreviewRect(w:number,h:number,boxWidth:number,boxHeight:number) {
    const scale=Math.min(boxWidth/w,boxHeight/h);
    const width=w*scale,height=h*scale;
    return {x:(boxWidth-width)/2,y:(boxHeight-height)/2,width,height};
}
export function layout(p: Pattern, t: Tile) {
    const cell=28,margin=56,top=90,legendWidth=p.counts.length>32 ? Math.ceil(p.counts.length/16)*270+48 : 640,
        width=Math.max(legendWidth,t.w*cell+margin*2);
    const legendColumns=Math.max(1,Math.min(p.counts.length>32 ? 6 : 4,Math.floor((width-48)/270)));
    const legendRowHeight=58,legendStart=top+t.h*cell+76;
    const legendRows=Math.ceil(p.counts.length/legendColumns);
    return {cell,margin,top,width,legendColumns,legendRowHeight,legendStart,
        height:legendStart+24+legendRows*legendRowHeight+90};
}
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
    const top = l.top;
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
    for (let x = 0; x < t.w; x++) {
        const label=String(x+t.x+1),cx=margin+x*cell+cell/2;
        ctx.fillText(label,cx,top-10);
        ctx.fillText(label,cx,top+t.h*cell+24);
    }
    for (let y = 0; y < t.h; y++) {
        const label=String(y+t.y+1),cy=top+y*cell+18;
        ctx.fillText(label,margin-22,cy);
        ctx.fillText(label,margin+t.w*cell+26,cy);
    }
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
    const start = l.legendStart;
    ctx.fillStyle = '#153F36';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('整张图纸用豆表（含白色背景）', 24, start);
    p.counts.forEach((c,i)=>{
        const x=24+(i%l.legendColumns)*((width-48)/l.legendColumns);
        const y=start+24+Math.floor(i/l.legendColumns)*l.legendRowHeight;
        ctx.fillStyle=c.hex;ctx.fillRect(x,y,36,36);
        ctx.strokeStyle='#BAC5BE';ctx.strokeRect(x,y,36,36);
        ctx.fillStyle='#153F36';ctx.font='32px sans-serif';
        ctx.fillText(`${c.id} ${c.count}颗`,x+48,y+31);
    });
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64746D';
    ctx.fillText('通用颜色编号，非品牌色号；实际选豆请对照颜色。', 24, height - 30);
    return l;
}
export async function canvasBox(page:any,id:string):Promise<{canvas:any;width:number;height:number}> {
    return new Promise((resolve,reject)=>wx.createSelectorQuery().in(page).select(id)
        .fields({node:true,size:true},(res:any)=>res?.node ? resolve({canvas:res.node,width:res.width,height:res.height}) : reject(Error('画布未就绪，请重试'))).exec());
}
export async function canvasNode(page:any,id:string):Promise<any>{return (await canvasBox(page,id)).canvas;}
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
