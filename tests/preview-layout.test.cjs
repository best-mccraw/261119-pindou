const {test}=require('node:test');const a=require('node:assert/strict');const {fromCells}=require('../build/core/pattern');const render=require('../build/services/render');
function record(){const text=[];const ctx=new Proxy({font:'',fillText(...args){text.push({text:String(args[0]),x:args[1],y:args[2],font:this.font})}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});return {ctx,text}}
test('四边坐标与行列一致，分图继续使用全局编号',()=>{const p=fromCells(20,30,Array(600).fill(0)),r=record();render.draw(r.ctx,p,false,{x:5,y:10,w:10,h:10});for(const n of ['6','15','11','20'])a.ok(r.text.filter(x=>x.text===n).length>=2,'坐标 '+n+' 应在相对两边出现');});
test('用豆表32px字号并按导出宽度排版，全部文字在画布内',()=>{for(const [w,h]of [[10,100],[100,10],[100,100]]){const p=fromCells(w,h,Array.from({length:w*h},(_,i)=>i%32)),r=record(),l=render.draw(r.ctx,p,false);const legend=r.text.filter(x=>/^P\d\d \d+颗$/.test(x.text));a.equal(legend.length,32);a.ok(legend.every(x=>x.font==='32px sans-serif'));a.ok(r.text.every(x=>x.y<l.height&&x.x<l.width));a.ok(l.width<4096&&l.height<4096);}});
test('长宽极端预览等比放入固定视口，不拉伸或截断',()=>{a.equal(typeof render.fitPreviewRect,'function');for(const [w,h]of [[10,100],[100,10],[30,30]]){const r=render.fitPreviewRect(w,h,320,260);a.ok(Math.abs(r.width/r.height-w/h)<1e-9);a.ok(r.x>=0&&r.y>=0&&r.x+r.width<=320&&r.y+r.height<=260);}});

test('限高留白预览按实际图像比例拖动，边界后可立即反向移动',()=>{
 let p;global.Page=x=>p=x;delete require.cache[require.resolve('../build/pages/create/index')];require('../build/pages/create/index');
 p.data={...p.data,width:'10',height:'100',busy:false};p.setData=d=>Object.assign(p.data,d);p.source={width:1000,height:500};p.cropViewport={width:320,height:260};p.paint=()=>{};
 a.equal(typeof p.touchStart,'function');const touch=x=>({touches:[{clientX:x,clientY:100}]});
 p.touchStart(touch(100));p.touchMove(touch(74));a.ok(Math.abs(p.data.dx-50)<1e-8);
 p.touchMove(touch(-100000));a.equal(p.data.dx,475);p.touchEnd();
 p.touchStart(touch(100));p.touchMove(touch(126));a.ok(Math.abs(p.data.dx-425)<1e-8);
 p.touchEnd();const before=p.data.dx;p.touchStart({touches:[{clientX:0,clientY:0},{clientX:10,clientY:10}]});p.touchMove(touch(50));a.equal(p.data.dx,before);
});
