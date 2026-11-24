const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../build/core/pattern');
const {layout,draw}=require('../build/services/render');
test('新图默认96色并可精确使用新增灰紫色',()=>{
 assert.equal(core.palette.length,96);
 assert.equal(new Set(core.palette.map(p=>p.hex)).size,96);
 assert.equal(core.PALETTE_VERSION,'generic-96-v1');
 for(let i=0;i<96;i++)assert.equal(core.nearest(core.palette[i].rgb),i);
 const pixels=new Uint8ClampedArray(10*10*4);for(let i=0;i<100;i++)pixels.set([183,166,185,255],i*4);
 const p=core.quantize(pixels,10,10,10,10);
 assert.equal(p.paletteVersion,'generic-96-v1');assert.equal(p.counts[0].hex,'#B7A6B9');assert.equal(p.counts[0].count,100);
});
test('所有旧图库色号格子数量及版本逐项保持，拒绝错误版本和越界格子',()=>{
 for(const old of require('../data/patterns.json')){
  const p=core.fromCells(old.width,old.height,old.cells,old.paletteVersion);
  assert.equal(p.paletteVersion,old.paletteVersion);assert.deepEqual(p.cells,old.cells);assert.deepEqual(p.counts,old.counts);
 }
 assert.throws(()=>core.fromCells(10,10,Array(100).fill(32),'generic-32-v1'));
 assert.throws(()=>core.fromCells(10,10,Array(100).fill(96)));
 assert.throws(()=>core.fromCells(10,10,Array(100).fill(0),'unknown'));
});
test('96色完整用豆表在100x100与极端比例中可完整排版',()=>{
 for(const [width,height]of [[100,100],[10,100],[100,10]]){
 const p=core.fromCells(width,height,Array.from({length:width*height},(_,i)=>i%96));
 const rendered=[];const context=new Proxy({fillText(...args){rendered.push(args)}},{get:(obj,key)=>key in obj?obj[key]:()=>{},set:(obj,key,value)=>(obj[key]=value,true)});
 const l=draw(context,p,true);assert.equal(rendered.filter(x=>/^P\d\d \d+颗$/.test(x[0])).length,96);
 assert.ok(l.width<4096&&l.height<4096);assert.ok(rendered.every(x=>x[1]<l.width&&x[2]<l.height));
 }
});
