import { config } from '../config';
export async function api(action: string, data: Record<string, unknown> = {}): Promise<any> {
    if (config.cloudEnv === 'YOUR_CLOUD_ENV')
        throw Error('服务暂未就绪，请稍后重试');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const result = await Promise.race([wx.cloud.callFunction({ name: config.functionName, data: { action, ...data } }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('网络较慢，请重试')), 15000); })]);
        const r = result.result as any;
        if (!r?.ok)
            throw Error('暂时无法完成，请稍后重试');
        return r.data;
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
export function message(e: unknown) { console.warn('[pindou] operation failed', e instanceof Error ? e.message : 'platform operation'); wx.showToast({ title: e instanceof Error ? e.message : '操作未完成，请重试', icon: 'none', duration: 3000 }); }
