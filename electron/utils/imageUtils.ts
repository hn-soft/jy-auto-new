const imageSize = require("image-size");

export const getImageDimensions = (filePath: string) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    imageSize(
      filePath,
      function (err: Error, dimensions: { width: number; height: number }) {
        if (err) {
          reject(err);
          return;
        }
        resolve(dimensions);
      }
    );
  });
};
