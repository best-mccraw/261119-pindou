let pending: ((r: any) => void)[] = [];
export function installPrivacyGate() { if (wx.onNeedPrivacyAuthorization)
    (wx.onNeedPrivacyAuthorization as any)((resolve: (r: any) => void) => { pending.push(resolve); const pages = getCurrentPages(); const page = pages[pages.length - 1]; page?.setData({ privacyVisible: true }); }); }
export const privacyMethods = {
    privacyAgree() { const pages = getCurrentPages(); pages[pages.length - 1]?.setData({ privacyVisible: false }); const list = pending; pending = []; list.forEach(resolve => resolve({ event: 'agree', buttonId: 'privacy-agree' })); },
    privacyDecline() { const pages = getCurrentPages(); pages[pages.length - 1]?.setData({ privacyVisible: false }); const list = pending; pending = []; list.forEach(resolve => resolve({ event: 'disagree' })); },
    privacyContract() { wx.openPrivacyContract({ fail: () => wx.showToast({ title: '隐私指引暂时无法打开，请稍后重试', icon: 'none' }) }); }
};
