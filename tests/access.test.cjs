const { test } = require('node:test');
const a = require('node:assert/strict');
let r;
try {
    r = require('../cloudfunctions/api/rules.js');
}
catch {
    r = {};
}
test('北京时间零点重置，与本地时区无关', () => { a.equal(typeof r.dayKey, 'function'); a.equal(r.dayKey(Date.parse('2026-11-19T15:59:59Z')), '2026-11-19'); a.equal(r.dayKey(Date.parse('2026-11-19T16:00:00Z')), '2026-11-20'); });
test('挑战仅用于图库且有时效，取消/失败不能授权', () => { a.equal(typeof r.canRedeem, 'function'); const t = { purpose: 'library', created: 1000, expires: 200000, day: r.dayKey(31000) }; a.equal(r.canRedeem(t, 31000, true), true); for (const ended of [false, undefined])
    a.equal(r.canRedeem(t, 31000, ended), false); a.equal(r.canRedeem({ ...t, purpose: 'generate' }, 31000, true), false); a.equal(r.canRedeem(t, 200001, true), false); a.equal(r.canRedeem(t, 1001, true), false); });
test('搜索与精确尺寸筛选叠加，游标分页不重复', () => { a.equal(typeof r.filterList, 'function'); const list = Array.from({ length: 30 }, (_, i) => ({ _id: String(i).padStart(2, '0'), name: '花' + i, keywords: ['原创'], width: i % 2 ? 15 : 30, height: 30, status: 'published' })); let p = r.filterList(list, '原创', 30, 30, '', 6); a.equal(p.items.length, 6); let q = r.filterList(list, '原创', 30, 30, p.next, 6); a.equal(q.items.length, 6); a.equal(new Set([...p.items, ...q.items].map(x => x._id)).size, 12); a.equal(r.filterList(list, '无结果', 0, 0, '', 6).items.length, 0); });
