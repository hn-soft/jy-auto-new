const { signAsync } = require('@electron/osx-sign');

signAsync({
    app: '/Users/mac/WebstormProjects/jy-auto-new/dist/mac/jianying-auto-master.app'
  })
    .then(function () {
        console.log('pei signed successfully');
    })
    .catch(function (err) {
        console.log('pei failed to sign');
        console.log(err);
    })