const { test } = require('node:test');
const a = require('node:assert/strict');
const { config } = require('../build/config');
const { fromCells } = require('../build/core/pattern');
const { RewardAd } = require('../build/services/ad');
const album = require('../build/services/album'), render = require('../build/services/render');
function detail() { let page; global.Page = p => page = p; delete require.cache[require.resolve('../build/pages/detail/index')]; require('../build/pages/detail/index'); page.data = { ...page.data }; page.setData = d => Object.assign(page.data, d); page.pattern = fromCells(15, 15, Array(225).fill(0)); page.alive = true; page.files = []; return page; }
test('图库直接保存，不调用广告或每日资格接口；相册失败可重试', async () => {
 let saves=0, exports=0, failSave=true, cloudCalls=0, ads=0;
 global.wx={showToast(){},cloud:{callFunction:async()=>{cloudCalls++;throw Error('不应查询资格')}}};
 const p=detail();p.data.source='library';p.ad={play:async()=>{ads++;throw Error('不应播放广告')}};
 album.saveFile=async()=>{saves++;if(failSave)throw Error('相册失败')};
 render.exportFiles=async()=>{exports++;return ['tmp.png']};
 await p.save();a.equal(saves,1);a.equal(p.data.busy,false);
 failSave=false;await p.save();a.equal(saves,2);a.equal(exports,1);a.equal(cloudCalls,0);a.equal(ads,0);
});
test('免费放大查看关闭系统下载菜单，不能出现广告外显式保存入口', () => { let options; global.wx = { previewImage: o => options = o }; const p = detail(); p.data.preview = 'preview.png'; p.zoom(); a.equal(options.showmenu, false); });
test('首次及再次选图都直接打开选择器，不依赖广告资格', async () => {
 global.wx={showToast(){}};let p;global.Page=x=>p=x;delete require.cache[require.resolve('../build/pages/create/index')];require('../build/pages/create/index');p.data={...p.data};p.setData=d=>Object.assign(p.data,d);p.alive=true;
 let choices=0,ads=0;p.choose=async()=>choices++;p.ad={play:async()=>{ads++;throw Error('不应播放广告')}};
 await p.start();await p.newRound();a.equal(choices,2);a.equal(ads,0);a.equal(p.data.busy,false);
});
test('隐私模板明确传递可见状态对象', () => { const fs = require('node:fs'); for (const n of ['create', 'library', 'detail'])
    a.ok(fs.readFileSync(`miniprogram/pages/${n}/index.wxml`, 'utf8').includes('data="{{privacyVisible: privacyVisible}}"')); });
test('页面在导出期间退出后不再调用相册保存',async()=>{global.wx={showToast(){}};const p=detail();p.data.source='generated';let saves=0;render.exportFiles=async()=>{p.alive=false;return['tmp.png']};album.removeFiles=async()=>{};album.saveFile=async()=>saves++;await p.save();a.equal(saves,0)});

