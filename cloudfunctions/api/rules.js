const dayKey = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
const canRedeem = (t, now, ended) => !!t && t.purpose === 'library' && ended === true && now >= t.created + 1000 && now <= t.expires && t.day === dayKey(now);
function filterList(list, q, w, h, cursor = '', limit = 12) { const found = list.filter(x => x.status === 'published' && (!q || [x.name, ...x.keywords].join(' ').toLowerCase().includes(q.toLowerCase())) && (!w || (x.width === w && x.height === h)) && x._id > cursor).sort((a, b) => a._id.localeCompare(b._id)); const items = found.slice(0, limit); return { items, next: found.length > limit ? items[items.length - 1]._id : '' }; }
module.exports = { dayKey, canRedeem, filterList };
