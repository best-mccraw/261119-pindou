const tcb = require('@cloudbase/node-sdk');
const app = tcb.init({ env: process.env.CLOUDBASE_ENV_ID, secretId: process.env.TENCENTCLOUD_SECRETID, secretKey: process.env.TENCENTCLOUD_SECRETKEY, sessionToken: process.env.TENCENTCLOUD_SESSIONTOKEN });
const db = app.database();
async function main() { for (const name of ['challenges', 'unlocks']) {
    let removed = 0;
    while (true) {
        const q = await db.collection(name).where({ expiresAt: db.command.lt(new Date()) }).limit(100).get();
        if (!q.data.length)
            break;
        for (const x of q.data) {
            await db.collection(name).doc(x._id).remove();
            removed++;
        }
    }
    console.log(`${name}: removed ${removed} expired records`);
} }
main().catch(() => { console.error('Cleanup failed; check admin credentials and database access'); process.exitCode = 1; });
