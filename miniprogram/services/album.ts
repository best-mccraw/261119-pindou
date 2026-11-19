export async function privacy() { if (wx.requirePrivacyAuthorize)
    await wx.requirePrivacyAuthorize({}); }
export async function saveFile(path: string) { await privacy(); const setting = await wx.getSetting({}); if (setting.authSetting['scope.writePhotosAlbum'] === false) {
    const r = await wx.showModal({ title: '允许保存到相册', content: '请在设置中允许保存到相册，然后重试。', confirmText: '去设置' });
    if (r.confirm)
        await wx.openSetting({});
    throw Error('授权后请再次点击保存');
} try {
    await wx.saveImageToPhotosAlbum({ filePath: path });
}
catch {
    throw Error('未能保存，请检查相册权限后重试');
} }
export async function removeFiles(paths: string[]) { const fs = wx.getFileSystemManager(); for (const filePath of paths)
    try {
        fs.unlinkSync(filePath);
    }
    catch { /* 系统临时文件可能已被清理 */ } }
