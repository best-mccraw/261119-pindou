// 使用 CloudBase 管理 SDK 和环境变量执行，密钥从不进入小程序。
const fs = require('node:fs');
const { fromCells } = require('../build/core/pattern');
async function main() { const args = process.argv.slice(2), source = JSON.parse(fs.readFileSync('data/patterns.json', 'utf8')); for (const p of source) {
    const v = fromCells(p.width, p.height, p.cells);
    if (v.paletteVersion !== p.paletteVersion || v.counts.reduce((n, c) => n + c.count, 0) !== p.width * p.height)
        throw Error('Invalid pattern');
    p.counts = v.counts;
    p.searchText = [p.name, ...p.keywords].join(' ');
} if (args.includes('--check')) {
    console.log(`Validated ${source.length} patterns`);
    return;
} if (!process.env.CLOUDBASE_ENV_ID || !process.env.TENCENTCLOUD_SECRETID || !process.env.TENCENTCLOUD_SECRETKEY)
    throw Error('Set CloudBase credentials in environment; see README'); const tcb = require('@cloudbase/node-sdk'); const app = tcb.init({ env: process.env.CLOUDBASE_ENV_ID, secretId: process.env.TENCENTCLOUD_SECRETID, secretKey: process.env.TENCENTCLOUD_SECRETKEY, sessionToken: process.env.TENCENTCLOUD_SESSIONTOKEN }); for (const p of source) {
    const uploaded = await app.uploadFile({ cloudPath: `covers/${p._id}.png`, fileContent: fs.createReadStream(p.cover) });
    p.cover = uploaded.fileID;
    const id = p._id;
    delete p._id;
    await app.database().collection('patterns').doc(id).set(p);
} console.log(`Imported ${source.length} patterns`); }
main().catch(e => { console.error(e.message); process.exitCode = 1; });
