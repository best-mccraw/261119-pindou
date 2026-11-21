const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function check(config,appid='wxf3840d9f8a43d8c5'){
    const process={exitCode:0},output=[];
    vm.runInNewContext(fs.readFileSync('scripts/release-check.cjs','utf8'),{
        require(name){
            if(name==='../build/config')return {config};
            if(name==='node:fs')return {readFileSync(path,...args){return path==='project.config.json'?JSON.stringify({appid}):fs.readFileSync(path,...args)}};
            return require(name);
        },
        process,console:{log:message=>output.push(message),error:message=>output.push(message)}
    });
    return {exitCode:process.exitCode,output:output.join('\n')};
}
const config={releaseMode:'no-ads',adUnitId:'',cloudEnv:'pindou-dev-d8ghhp2zc376a0ec9',functionName:'api'};
test('正式无广告版本允许空广告位并提示发布前检查',()=>{
    const result=check(config);assert.equal(result.exitCode,0,result.output);
    assert.match(result.output,/云环境/);assert.match(result.output,/备案/);
});
test('发布检查拒绝错误AppID和占位云环境',()=>{
    assert.equal(check(config,'touristappid').exitCode,1);
    assert.equal(check({...config,cloudEnv:'YOUR_CLOUD_ENV'}).exitCode,1);
    assert.equal(check({...config,cloudEnv:''}).exitCode,1);
});
test('无广告发布检查拒绝未经支持的模式或意外配置的广告位',()=>{
    assert.equal(check({...config,releaseMode:'test'}).exitCode,1);
    assert.equal(check({...config,adUnitId:'adunit-unconfirmed'}).exitCode,1);
});
