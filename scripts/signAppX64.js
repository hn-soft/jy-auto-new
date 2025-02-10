const { signAsync } = require('@electron/osx-sign');

signAsync({
    app: '/Users/peichen/Documents/hehedawo/剪映自动化大师.app'
  })
    .then(function () {
        console.log('pei signed successfully');
    })
    .catch(function (err) {
        console.log('pei failed to sign');
        console.log(err);
    })