import { config } from '../config';
export class RewardAd {
    private ad?: WechatMiniprogram.RewardedVideoAd;
    private busy = false;
    private cancel?: () => void;
    constructor() { if (config.adUnitId && wx.createRewardedVideoAd)
        this.ad = wx.createRewardedVideoAd({ adUnitId: config.adUnitId }); }
    play(): Promise<void> { if (this.busy)
        return Promise.reject(Error('广告正在播放，请稍候')); if (!this.ad)
        return Promise.reject(Error('广告暂不可用，请稍后重试')); this.busy = true; const ad = this.ad; return new Promise((resolve, reject) => { let done = false; const finish = (ok: boolean, text = '广告未完整观看，请重试') => { if (done)
        return; done = true; clearTimeout(timer); ad.offClose(close); ad.offError(error); this.busy = false; this.cancel = undefined; ok ? resolve() : reject(Error(text)); }; const close = (r: {
        isEnded: boolean;
    }) => finish(r?.isEnded === true); const error = () => finish(false, '广告加载失败，请稍后重试'); const timer = setTimeout(() => finish(false, '广告等待超时，请重试'), 180000); this.cancel = () => finish(false, '已结束本轮广告'); ad.onClose(close); ad.onError(error); ad.load().then(() => ad.show()).catch(error); }); }
    destroy() { this.cancel?.(); this.ad?.destroy(); }
}
