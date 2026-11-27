import { removeFiles } from './album';
import { api } from './api';
import { orientationTransform } from '../core/orientation';

const pollDelay = 2000;
const pollLimit = 16;
const maxJpegLength = 980000;
const unavailable = '图片检测暂不可用，请稍后重试';
const delay = () => new Promise<void>(resolve => setTimeout(resolve, pollDelay));

export class ImageReviewTimeout extends Error {
    constructor() {
        super('图片仍在检测，可点击继续等待');
    }
}

export async function waitForReview(
    status: () => Promise<unknown>, isActive: () => boolean, pause = delay
) {
    const deadline = Date.now() + pollLimit * pollDelay;
    for (let attempt = 0; attempt < pollLimit && isActive() && Date.now() < deadline; attempt++) {
        await pause();
        if (!isActive()) return;
        const result = await status();
        if (!isActive()) return;
        if (result === 'pass') return;
        if (result === 'risky') throw Error('图片包含违规信息，请更换图片');
        if (result === 'review') throw Error('图片未能通过内容检测，请更换图片');
        if (result !== 'pending') throw Error(unavailable);
    }
    if (isActive()) throw new ImageReviewTimeout();
}

export async function startImageReview(
    page: any, image: WechatMiniprogram.Image, sample: WechatMiniprogram.Canvas,
    info: Pick<WechatMiniprogram.GetImageInfoSuccessCallbackResult, 'width' | 'height' | 'orientation'>,
    isActive: () => boolean
) {
    const source = orientationTransform(info.width, info.height, info.orientation, 1280);
    const width = sample.width = Math.max(1, source.width);
    const height = sample.height = Math.max(1, source.height);
    const context = sample.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    const [a, b, c, d, x, y] = source.matrix;
    context.setTransform(a, b, c, d, x, y);
    context.drawImage(image, 0, 0, info.width, info.height);

    let tempFilePath: string | undefined;
    try {
        const options = { canvas: sample, fileType: 'jpg' as const, width, height, destWidth: width, destHeight: height };
        ({ tempFilePath } = await wx.canvasToTempFilePath({ ...options, quality: 0.8 }, page));
        const fs = wx.getFileSystemManager();
        let jpeg = fs.readFileSync(tempFilePath, 'base64') as string;
        if (jpeg.length > maxJpegLength) {
            await removeFiles([tempFilePath]);
            ({ tempFilePath } = await wx.canvasToTempFilePath({ ...options, quality: 0.55 }, page));
            jpeg = fs.readFileSync(tempFilePath, 'base64') as string;
        }
        if (!isActive()) return;
        if (jpeg.length > maxJpegLength) throw Error(unavailable);
        const created = await api('imageReviewStart', { jpeg });
        if (typeof created?.id !== 'string' || !created.id) throw Error(unavailable);
        return created.id as string;
    } catch {
        throw Error(unavailable);
    } finally {
        if (tempFilePath) await removeFiles([tempFilePath]);
        sample.width = sample.height = 1;
    }
}

export function checkImageReview(ticket: string, isActive: () => boolean) {
    return waitForReview(async () => {
        try {
            return (await api('imageReviewStatus', { id: ticket }))?.status;
        } catch {
            throw Error(unavailable);
        }
    }, isActive);
}
