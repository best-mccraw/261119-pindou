const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');
const { dayKey, canRedeem } = require('./rules');
const { fromCells, getPalette } = require('./core/pattern');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database(), _ = db.command;
const safeSummary = x => ({ _id: x._id, name: x.name, width: x.width, height: x.height, cover: x.cover });
async function get(collection, id) { try {
    return (await db.collection(collection).doc(id).get()).data;
}
catch (e) {
    if (e.errCode === -502005 || e.code === 'DATABASE_DOCUMENT_NOT_EXIST' || String(e.errMsg || e.message).includes('not exist'))
        return null;
    throw e;
} }
exports.main = async (event) => {
    try {
        const { OPENID } = cloud.getWXContext();
        if (!OPENID)
            throw Error('identity required');
        const now = Date.now(), day = dayKey(now), uid = crypto.createHash('sha256').update(OPENID).digest('hex');
        const action = event.action;
        if (action === 'list') {
            const q = String(event.q || '').trim().slice(0, 40);
            let condition = { status: 'published' };
            if (q) {
                const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                condition.searchText = db.RegExp({ regexp: escaped, options: 'i' });
            }
            if (event.width) {
                const d = require('./core/pattern').dimensions(event.width, event.height);
                condition = { ...condition, ...d };
            }
            if (event.cursor)
                condition._id = _.gt(String(event.cursor).slice(0, 80));
            const r = await db.collection('patterns').where(condition).field({ _id: true, name: true, width: true, height: true, cover: true }).orderBy('_id', 'asc').limit(13).get();
            const items = r.data.slice(0, 12).map(safeSummary);
            // 保持云存储私有，仅给本次已上架图纸的封面签发临时读取链接。
            const fileList=items.map(x=>x.cover).filter(x=>typeof x==='string' && /^cloud:\/\/[^/]+\/covers\/[A-Za-z0-9_-]+\.(png|jpe?g|webp)$/.test(x));
            if(fileList.length){
                const signed=await cloud.getTempFileURL({fileList});
                const urls=new Map(signed.fileList.map(x=>[x.fileID,x.status===0?x.tempFileURL:'']));
                items.forEach(x=>{if(urls.has(x.cover))x.cover=urls.get(x.cover)});
            }
            return { ok: true, data: { items, next: r.data.length > 12 ? items[items.length - 1]._id : '' } };
        }
        if (action === 'detail') {
            const p = await get('patterns', String(event.id || ''));
            if (!p || p.status !== 'published')
                throw Error('unavailable');
            getPalette(p.paletteVersion);
            const checked = fromCells(p.width, p.height, p.cells, p.paletteVersion);
            return { ok: true, data: { ...checked, name: p.name, _id: p._id } };
        }
        const key = uid + '_' + day;
        if (action === 'status') {
            const record = await get('unlocks', key);
            return { ok: true, data: { day, unlocked: !!record } };
        }
        if (action === 'challenge') {
            const token = crypto.randomBytes(24).toString('hex');
            await db.collection('challenges').doc(uid).set({ data: { token, purpose: 'library', day, created: now, expires: now + 180000, expiresAt: new Date(now + 180000) } });
            return { ok: true, data: { token } };
        }
        if (action === 'redeem') {
            const result = await db.runTransaction(async (tx) => { const grants = tx.collection('unlocks').doc(key); let existing; try {
                existing = (await grants.get()).data;
            }
            catch { } if (existing)
                return { day, unlocked: true }; const ref = tx.collection('challenges').doc(uid); const ticket = (await ref.get()).data; if (ticket.token !== event.token || !canRedeem(ticket, now, event.ended))
                throw Error('invalid proof'); await grants.set({ data: { day, created: now, expiresAt: new Date(now + 2 * 86400000) } }); await ref.remove(); return { day, unlocked: true }; });
            return { ok: true, data: result };
        }
        throw Error('unknown action');
    }
    catch (e) {
        console.warn('[api] request failed', e.code || e.errCode || 'operation');
        return { ok: false };
    }
};
