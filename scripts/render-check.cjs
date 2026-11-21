const fs = require('node:fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { draw, layout } = require('../build/services/render');
const { fromCells } = require('../build/core/pattern');
const font = 'C:/Windows/Fonts/msyh.ttc';
if (fs.existsSync(font))
    GlobalFonts.registerFromPath(font, 'sans-serif');
fs.mkdirSync('artifacts', { recursive: true });
for (const labels of [true, false]) {
    const p = fromCells(100, 100, Array.from({ length: 10000 }, (_, i) => Math.floor(i / 100) % 32)), l = layout(p, { x: 0, y: 0, w: 100, h: 100 });
    const c = createCanvas(l.width, l.height);
    draw(c.getContext('2d'), p, labels);
    fs.writeFileSync(`artifacts/100x100-${labels ? 'labels' : 'colors'}.png`, c.toBuffer('image/png'));
    console.log(`${l.width}x${l.height} PNG, labels=${labels}`);
}
// 全色表导出验证，覆盖最多32种颜色的统计布局。
const p = fromCells(30, 30, Array.from({ length: 900 }, (_, i) => i % 32)), l = layout(p, { x: 0, y: 0, w: 30, h: 30 }), c = createCanvas(l.width, l.height);
draw(c.getContext('2d'), p, true);
fs.writeFileSync('artifacts/all-colors.png', c.toBuffer('image/png'));
const examples=[['tall-10x100',10,100],['wide-100x10',100,10],['full-100x100',100,100]];
for(const [name,w,h]of examples){const p=fromCells(w,h,Array.from({length:w*h},(_,i)=>i%32)),l=layout(p,{x:0,y:0,w,h}),canvas=createCanvas(l.width,l.height);draw(canvas.getContext('2d'),p,true);fs.writeFileSync(`artifacts/${name}.png`,canvas.toBuffer('image/png'));console.log(`${name}: ${l.width}x${l.height}, legend columns ${l.legendColumns}`)}
