import { privacyMethods } from '../../services/privacy-gate';
import { api, message } from '../../services/api';
Page({ ...privacyMethods, data: { q: '', filters: ['全部', '15×15', '30×30', '50×50', '100×100', '自定义尺寸'], filter: 0, width: '', height: '', items: [] as any[], loading: false, error: false, next: '', loaded: false }, seq: 0,
    onLoad() { this.search(); }, field(e: any) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); }, select(e: any) { this.setData({ filter: Number(e.currentTarget.dataset.i) }); if (this.data.filter !== 5)
        this.search(); },
    async search() { this.seq++; this.setData({ items: [], next: '', loaded: false, error: false, loading: false }); await this.load(false); },
    async load(more = true) { if (this.data.loading || (more && !this.data.next))
        return; const seq = this.seq; this.setData({ loading: true, error: false }); try {
        let w = 0, h = 0;
        if (this.data.filter === 5) {
            const d = require('../../core/pattern');
            const dim = d.dimensions(this.data.width, this.data.height);
            w = dim.width;
            h = dim.height;
        }
        else if (this.data.filter > 0)
            w = h = [0, 15, 30, 50, 100][this.data.filter];
        const r = await api('list', { q: this.data.q.trim(), width: w, height: h, cursor: more ? this.data.next : '' });
        if (seq !== this.seq)
            return;
        this.setData({ items: more ? [...this.data.items, ...r.items] : r.items, next: r.next, loaded: true });
    }
    catch (e) {
        if (seq === this.seq) {
            this.setData({ error: true });
            message(e);
        }
    }
    finally {
        if (seq === this.seq)
            this.setData({ loading: false });
    } },
    onReachBottom() { this.load(); }, more() { this.load(); }, retry() { this.load(this.data.items.length > 0); }, open(e: any) { wx.navigateTo({ url: '/pages/detail/index?id=' + encodeURIComponent(e.currentTarget.dataset.id) }); }, imageError(e: any) { const items = this.data.items.map(x => x._id === e.currentTarget.dataset.id ? { ...x, broken: true } : x); this.setData({ items }); }
});
