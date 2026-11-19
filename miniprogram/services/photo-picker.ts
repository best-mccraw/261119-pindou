import { privacy } from './album';

export async function selectPhoto(): Promise<WechatMiniprogram.ChooseMediaSuccessCallbackResult> {
    await privacy();
    if (!wx.chooseMedia) throw Error('当前微信版本不支持选择图片，请更新微信后重试');
    return new Promise((resolve, reject) => {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album'],
            sizeType: ['compressed'],
            success: resolve,
            fail: error => {
                const detail = error.errMsg || '';
                if (/cancel/i.test(detail)) { reject(error); return; }
                console.warn('[pindou][choose-media]', detail);
                if (/privacy|declare|agreement/i.test(detail)) {
                    reject(Error('相册隐私授权不可用，请检查小程序隐私配置后重试'));
                } else if (/auth|permission|deny|denied/i.test(detail)) {
                    reject(Error('相册权限未开启，请在手机设置中允许微信访问照片后重试'));
                } else {
                    reject(Error('相册打开失败，请退出小程序重新进入后重试'));
                }
            }
        });
    });
}
