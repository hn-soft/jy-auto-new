const { notarize } = require('@electron/notarize');
notarize({
  appPath: '/Users/peichen/Documents/elec/elec-ts/jianying-align-professional/dist/mac-universal/剪映图片视频素材对齐能手.app',          // 应用的路径 xxx.app 结尾的 
  appBundleId: 'com.yxxz.jianying-align-professional',      // appid
  appleId: '431666648@qq.com',          // 苹果开发者 id
  appleIdPassword: 'wben-rclb-gqbs-elev',  // 应用专用密码
  ascProvider: 'CCQKQG9HUK',       // 证书提供者
  teamId: "CCQKQG9HUK",
});