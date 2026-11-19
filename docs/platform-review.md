# 微信平台文档复核记录
日期：2026-11-19（北京时间）。
本次尝试读取以下微信官方在线页面，工具返回不可读取；不能宣称完成当前线上规则核验。实现参考已安装的官方 miniprogram-api-typings 4.0.7 中 API 签名与官方说明注释；广告完整播放语义另参考腾讯广告培训文档。

上线前负责人需在可访问的浏览器及对应小程序管理后台核对：
- [激励广告](https://developers.weixin.qq.com/miniprogram/dev/api/ad/wx.createRewardedVideoAd.html)：广告位开通条件、页面生命周期、onClose isEnded、真实填充和失败行为，以及后台是否提供可用服务端验证。
- [相册保存](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html)：scope.writePhotosAlbum、用户拒绝后的 openSetting 路径、系统相册结果。
- [隐私授权](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)：隐私接口声明、onNeedPrivacyAuthorization、自定义弹窗及 agreePrivacyAuthorization 按钮。
- [选择媒体](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/wx.chooseMedia.html)：压缩路径、相机授权、格式与方向在真机中的表现。
- [发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)：主体、类目、隐私、审核与备案要求，以当前后台为准，不在本地假定符合。
- [腾讯广告培训文档](https://training.tencentads.com/uploads/202406/nTROJ2vg_hpC4C1.pdf)：完整播放后关闭的 isEnded 语义；这不能代替最新微信后台规则。

不声明存在服务端广告签名验证；当前挑战只防止普通流程的误用和重复核销，恶意客户端仍能伪造完成事件。官方规则复核是提交审核前阻塞项。
