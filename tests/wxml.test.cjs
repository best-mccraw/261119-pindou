const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.wxml')?[path.join(dir,e.name)]:[])}
test('页面和模板条件必须绑定数据，不能把条件当作恒真的字符串',()=>{
 for(const p of files('miniprogram'))for(const m of fs.readFileSync(p,'utf8').matchAll(/wx:(?:if|elif)="([^"]*)"/g))assert.match(m[1],/^{{[\s\S]*}}$/,p+': '+m[1]);
});
test('隐私弹层在未请求授权时隐藏，仅在需要时显示',()=>{
 const text=fs.readFileSync('miniprogram/templates/privacy.wxml','utf8');
 const value=text.match(/wx:if="([^"]*)"/)[1];
 const expression=value.match(/^{{([\s\S]*)}}$/);
 const visible=privacyVisible=>expression?Function('privacyVisible',`return (${expression[1]})`)(privacyVisible):value;
 assert.equal(Boolean(visible(false)),false);
 assert.equal(Boolean(visible(true)),true);
});
