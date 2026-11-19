import { privacyMethods } from '../../services/privacy-gate';
import { orientationTransform } from '../../core/orientation';
import { dimensions, cropRect, quantize } from '../../core/pattern';
import { privacy } from '../../services/album';
import { RewardAd } from '../../services/ad';
import { message } from '../../services/api';
import { canvasNode } from '../../services/render';
import { session } from '../../services/session';
Page({ ...privacyMethods, data: { qualified: false, busy: false, path: '', width: '30', height: '30', presets: [15, 30, 50, 100], zoom: 1, dx: 0, dy: 0, status: '' }, ad: undefined as RewardAd | undefined, image: undefined as any, source: undefined as any, alive: true, drag: undefined as any,
    onLoad() { this.alive = true; this.ad = new RewardAd(); }, onHide() { this.ad?.destroy(); this.ad = undefined; }, onShow() { if (!this.ad)
        this.ad = new RewardAd(); }, onUnload() { this.alive = false; this.ad?.destroy(); this.image = undefined; this.source = undefined; },
    async start() { if (this.data.busy)
        return; this.setData({ busy: true, status: '正在准备广告…' }); try {
        if (!this.data.qualified) {
            await this.ad!.play();
            if (!this.alive)
                return;
            this.setData({ qualified: true });
        }
        await this.choose();
    }
    catch (e) {
        message(e);
    }
    finally {
        if (this.alive)
            this.setData({ busy: false, status: '' });
    } },
    async newRound() { if (this.data.busy)
        return; this.setData({ qualified: false }); await this.start(); },
    async choose() {
        try {
            await privacy();
            const r = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] });
            if (!this.alive)
                return;
            const f = r.tempFiles[0];
            if (f.size > 10 * 1024 * 1024)
                throw Error('图片超过 10MB，请压缩后重试');
            const info = await wx.getImageInfo({ src: f.tempFilePath });
            if (info.width * info.height > 12000000 || Math.max(info.width, info.height) > 12000)
                throw Error('图片分辨率过大，请先缩小至 1200 万像素以内');
            const c = await canvasNode(this, '#crop');
            const img = c.createImage();
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(Error('图片无法读取，请改用 JPEG 或 PNG')); img.src = f.tempFilePath; });
            const normalized = await canvasNode(this, '#normalized');
            const o = orientationTransform(info.width, info.height, info.orientation);
            normalized.width = o.width;
            normalized.height = o.height;
            const nctx = normalized.getContext('2d');
            nctx.setTransform(...o.matrix);
            nctx.drawImage(img, 0, 0, info.width, info.height);
            this.image = normalized;
            this.source = { width: o.width, height: o.height };
            this.setData({ path: f.tempFilePath, zoom: 1, dx: 0, dy: 0 });
            await this.paint();
        }
        catch (e: any) {
            if (!String(e?.errMsg || '').includes('cancel'))
                throw e;
        }
    },
    async change() { if (this.data.busy)
        return; this.setData({ busy: true }); try {
        await this.choose();
    }
    catch (e) {
        message(e);
    }
    finally {
        this.setData({ busy: false });
    } },
    async paint() { if (!this.image || !this.source)
        return; try {
        const d = dimensions(this.data.width, this.data.height), c = await canvasNode(this, '#crop');
        const width = 320, height = 320 * d.height / d.width;
        c.width = width;
        c.height = height;
        const r = cropRect(this.source.width, this.source.height, d.width, d.height, this.data.zoom, this.data.dx, this.data.dy);
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(this.image, r.x, r.y, r.width, r.height, 0, 0, width, height);
        this.setData({ cropHeight: Math.round(600 * d.height / d.width) });
    }
    catch { /* 输入尚未完成时保留已选图片 */ } },
    field(e: any) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); this.paint(); }, preset(e: any) { const n = String(e.currentTarget.dataset.n); this.setData({ width: n, height: n, dx: 0, dy: 0 }); this.paint(); }, zoom(e: any) { this.setData({ zoom: e.detail.value }); this.paint(); },
    touchStart(e: any) { if (!this.source)
        return; const t = e.touches[0]; this.drag = { x: t.clientX, y: t.clientY, dx: this.data.dx, dy: this.data.dy }; }, touchMove(e: any) { if (!this.drag || this.data.busy)
        return; const t = e.touches[0], r = cropRect(this.source.width, this.source.height, Number(this.data.width) || 30, Number(this.data.height) || 30, this.data.zoom); this.setData({ dx: this.drag.dx - (t.clientX - this.drag.x) * r.width / 300, dy: this.drag.dy - (t.clientY - this.drag.y) * r.height / 300 }); this.paint(); },
    async generate() { if (this.data.busy || !this.data.qualified || !this.image)
        return; this.setData({ busy: true, status: '正在计算颜色与用豆数量…' }); try {
        const { width, height } = dimensions(this.data.width, this.data.height);
        await new Promise(r => setTimeout(r, 30));
        const c = await canvasNode(this, '#sample');
        c.width = width * 4;
        c.height = height * 4;
        const ctx = c.getContext('2d'), r = cropRect(this.source.width, this.source.height, width, height, this.data.zoom, this.data.dx, this.data.dy);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(this.image, r.x, r.y, r.width, r.height, 0, 0, c.width, c.height);
        session.pattern = quantize(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, width, height);
        if (this.alive)
            wx.navigateTo({ url: '/pages/detail/index?source=generated' });
    }
    catch (e) {
        message(e);
    }
    finally {
        if (this.alive)
            this.setData({ busy: false, status: '' });
    } }
});
