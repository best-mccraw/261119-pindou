const fs = require('node:fs');
const assert = require('node:assert/strict');
const project = JSON.parse(fs.readFileSync('project.config.json', 'utf8'));
const { config } = require('../build/config');

try {
    assert.equal(config.releaseMode, 'no-ads', '当前发布流程支持正式无广告模式');
    assert.equal(config.adUnitId, '', '无广告模式应留空广告位，接入广告须另行确认并验收');
    assert.match(project.appid, /^wx[a-f\d]{16}$/, '请配置真实 AppID');
    assert.ok(config.cloudEnv && config.cloudEnv !== 'YOUR_CLOUD_ENV', '请配置真实云环境');
    assert.ok(config.functionName, '请配置云函数名称');
    console.log('正式无广告版本静态配置检查通过。');
    console.log('提交审核前确认备案通过。提交发布前提醒用户核对云环境到期时间、续费方式和费用。');
} catch (error) {
    console.error('发布配置检查失败：' + error.message);
    process.exitCode = 1;
}
