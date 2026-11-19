import { privacyMethods } from '../../services/privacy-gate';
import { Pattern, fromCells, PALETTE_VERSION } from '../../core/pattern';
import { session } from '../../services/session';
import { api, message } from '../../services/api';
import { exportFiles, renderFile } from '../../services/render';
import { saveFile, removeFiles } from '../../services/album';
Page({ ...privacyMethods, data: { title: '我的拼豆图纸', labels: true, busy: false, loading: true, error: false, preview: '', width: 0, height: 0, total: 0, counts: [] as Pattern['counts'], source: '', split: false }, pattern: undefined as Pattern | undefined, files: [] as string[], previewFile: '', id: '', alive: true,
    async onLoad(o: any) { this.alive = true; this.id = o.id || ''; this.setData({ source: o.source || 'library', labels: o.source==='generated' ? session.generatedLabels !== false : true }); await this.load(); }, onUnload() { this.alive = false; removeFiles([...this.files, this.previewFile]); },
    async load() { this.setData({ loading: true, error: false }); try {
        let p: Pattern;
        if (this.data.source === 'generated') {
            if (!session.pattern)
                throw Error('本轮图纸已结束，请返回重新生成');
            p = session.pattern;
        }
        else {
            const r = await api('detail', { id: this.id });
            if (r.paletteVersion !== PALETTE_VERSION)
                throw Error('此图纸需要更新版本后查看');
            p = fromCells(r.width, r.height, r.cells);
            this.setData({ title: r.name });
        }
        this.pattern = p;
        this.setData({ width: p.width, height: p.height, total: p.width * p.height, counts: p.counts });
        await this.preview();
    }
    catch (e) {
        this.setData({ error: true });
        message(e);
    }
    finally {
        if (this.alive)
            this.setData({ loading: false });
    } },
    async preview() { if (!this.pattern)
        return; try {
        const old = this.previewFile;
        this.previewFile = await renderFile(this, this.pattern, this.data.labels);
        if (this.alive)
            this.setData({ preview: this.previewFile, split: false });
        if (old)
            removeFiles([old]);
    }
    catch {
        this.setData({ preview: '', split: true });
    } },
    async toggle(e: any) { if (this.data.busy)
        return; this.setData({ labels: e.detail.value.length > 0, busy: true }); await removeFiles(this.files); this.files = []; try {
        await this.preview();
    }
    finally {
        this.setData({ busy: false });
    } },
    zoom() { if (this.data.preview)
        wx.previewImage({ urls: [this.data.preview], current: this.data.preview, showmenu: false }); },
    async save() {
        if (this.data.busy || !this.pattern)
            return;
        this.setData({ busy: true });
        try {
            if (!this.alive) return;
            if (!this.files.length)
                this.files = await exportFiles(this, this.pattern, this.data.labels);
            if (!this.alive) { await removeFiles(this.files); return; }
            if (this.files.length > 1) {
                const r = await wx.showModal({ title: `将保存 ${this.files.length} 张分图`, content: '设备无法导出整张大图，已按区域拆分。每张带全局坐标与完整用豆表，请全部保存。', confirmText: '保存全部' });
                if (!r.confirm)
                    return;
            }
            for (const file of this.files) {
                if (!this.alive) return;
                await saveFile(file);
            }
            if (this.alive) wx.showToast({ title: '已保存到相册', icon: 'success' });
        }
        catch (e) {
            message(e);
        }
        finally {
            if (this.alive)
                this.setData({ busy: false });
        }
    },
    async viewTiles() { if (!this.pattern || this.data.busy)
        return; this.setData({ busy: true }); try {
        this.files = await exportFiles(this, this.pattern, this.data.labels);
        wx.previewImage({ urls: this.files, current: this.files[0], showmenu: false });
    }
    catch (e) {
        message(e);
    }
    finally {
        this.setData({ busy: false });
    } }
});
