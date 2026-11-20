import { privacyMethods } from '../../services/privacy-gate';
import { orientationTransform } from '../../core/orientation';
import { dimensions, cropRect, quantize } from '../../core/pattern';
import { selectPhoto } from '../../services/photo-picker';
import { message } from '../../services/api';
import { canvasNode, canvasBox, fitPreviewRect } from '../../services/render';
import { session } from '../../services/session';
Page({ ...privacyMethods, data: { busy: false, path: '', width: '30', height: '30', presets: [30, 50, 100], custom: false, labels: true, zoom: 1, dx: 0, dy: 0, status: '' }, image: undefined as any, source: undefined as any, alive: true, cropViewport: undefined as {width:number;height:number}|undefined, drag: undefined as {x:number;y:number;dx:number;dy:number;scale:number}|undefined,
    onLoad() { this.alive = true; },
    onUnload() { this.alive = false; this.image = undefined; this.source = undefined; },
    async start() {
        if (this.data.busy) return;
        this.setData({ busy: true, status: '正在打开相册…' });
        try { await this.choose(); }
        catch (e) { if (this.alive) message(e); }
        finally { if (this.alive) this.setData({ busy: false, status: '' }); }
    },
    async newRound() { await this.start(); },
    async choose() {
        try {
            const r = await selectPhoto();
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
            await new Promise<void>(resolve=>this.setData({path:f.tempFilePath,zoom:1,dx:0,dy:0},resolve));
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
        const d = dimensions(this.data.width, this.data.height), box = await canvasBox(this, '#crop'), c=box.canvas;
        if(!box.width || !box.height) return;
        const width = Math.round(box.width), height = Math.round(box.height);
        c.width = width;
        c.height = height;
        this.cropViewport={width:box.width,height:box.height};
        const r = cropRect(this.source.width, this.source.height, d.width, d.height, this.data.zoom, this.data.dx, this.data.dy);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#FFF0F2';
        ctx.fillRect(0,0,width,height);
        const dest=fitPreviewRect(d.width,d.height,width,height);
        ctx.fillStyle='white';ctx.fillRect(dest.x,dest.y,dest.width,dest.height);
        ctx.drawImage(this.image,r.x,r.y,r.width,r.height,dest.x,dest.y,dest.width,dest.height);
    }
    catch { /* 输入尚未完成时保留已选图片 */ } },
    customSize() { this.setData({custom:true}); }, labels(e:any) { this.setData({labels:e.detail.value}); },
    field(e: any) { this.setData({ custom:true, [e.currentTarget.dataset.key]: e.detail.value }); this.paint(); }, preset(e: any) { const n = String(e.currentTarget.dataset.n); this.setData({ width: n, height: n, custom:false, dx: 0, dy: 0 }); this.paint(); }, zoom(e: any) { this.setData({ zoom: e.detail.value }); this.paint(); },
    touchStart(e:any) {
        this.drag=undefined;
        if(this.data.busy || !this.source || !this.cropViewport || e.touches.length!==1) return;
        try {
            const d=dimensions(this.data.width,this.data.height);
            const r=cropRect(this.source.width,this.source.height,d.width,d.height,this.data.zoom,this.data.dx,this.data.dy);
            const dest=fitPreviewRect(d.width,d.height,this.cropViewport.width,this.cropViewport.height);
            if(dest.width<=0) return;
            this.drag={x:e.touches[0].clientX,y:e.touches[0].clientY,
                dx:r.x-(this.source.width-r.width)/2,dy:r.y-(this.source.height-r.height)/2,
                scale:dest.width/r.width};
        } catch { /* 参数输入未完成时不启动拖动 */ }
    },
    touchMove(e:any) {
        if(!this.drag || this.data.busy) return;
        if(e.touches.length!==1) { this.drag=undefined; return; }
        const d=dimensions(this.data.width,this.data.height),touch=e.touches[0];
        const r=cropRect(this.source.width,this.source.height,d.width,d.height,this.data.zoom,
            this.drag.dx-(touch.clientX-this.drag.x)/this.drag.scale,
            this.drag.dy-(touch.clientY-this.drag.y)/this.drag.scale);
        const dx=r.x-(this.source.width-r.width)/2,dy=r.y-(this.source.height-r.height)/2;
        this.setData({dx,dy});
        // 每次以实际边界位置续接，避免拖过边界后要滑很远才能反向移动。
        this.drag={...this.drag,x:touch.clientX,y:touch.clientY,dx,dy};
        this.paint();
    },
    touchEnd() { this.drag=undefined; },
    async generate() { if (this.data.busy || !this.image)
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
        session.generatedLabels = this.data.labels;
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
