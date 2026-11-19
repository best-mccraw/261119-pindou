const fs = require('node:fs'), assert = require('node:assert/strict');
const p = JSON.parse(fs.readFileSync('project.config.json', 'utf8'));
const { config } = require('../build/config');
try {
    assert.equal(config.deviceTestBuild, false, 'Device test build must not be released');
    assert.match(p.appid, /^wx[a-f\d]{16}$/);
    assert.ok(config.cloudEnv && config.cloudEnv !== 'YOUR_CLOUD_ENV');
    assert.match(config.adUnitId, /^adunit-[a-zA-Z\d]+$/);
    const ad = fs.readFileSync('miniprogram/services/ad.ts', 'utf8');
    assert.ok(!/mock|simulate|模拟/.test(ad));
    console.log('Static configuration checks passed; manual release gates still apply.');
}
catch {
    console.error('Release blocked: current build is for device testing; restore release configuration and complete manual gates before publishing.');
    process.exitCode = 1;
}
