const { notarize } = require('@electron/notarize');
notarize({
  appPath: './dist/mac-arm64/剪映自动化大师.app',          // 应用的路径 xxx.app 结尾的 
  appBundleId: 'com.yxxz.jianying-auto-master',      // appid
  appleId: '431666648@qq.com',          // 苹果开发者 id
  appleIdPassword: 'wben-rclb-gqbs-elev',  // 应用专用密码
  ascProvider: 'CCQKQG9HUK',       // 证书提供者
  teamId: "CCQKQG9HUK",
});