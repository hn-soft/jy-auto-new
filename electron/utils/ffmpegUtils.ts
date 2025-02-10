const ffmpeg = require("fluent-ffmpeg");
const ffprobe = require("ffprobe-static");
const pathToFfprobe = ffprobe.path.replace("app.asar", "app.asar.unpacked");
ffmpeg.setFfprobePath(pathToFfprobe);

export const getVideoDimensions = (filePath: string) => {
    // duration in US 是以微秒表示的时长，U其实是miu.
    return new Promise<{ width: number; height: number, durationInUS: number, durationInS: number }>((resolve, reject) => {
        ffmpeg.ffprobe(filePath, function (err: any, metadata: any) {
            if (err) {
              reject(err);
              return;
            }
            const videoStream = metadata?.streams?.find((item: any) => item.codec_type === "video");
            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            const durationInS = videoStream.duration || 0;
            const durationInUS = Math.round(durationInS * 1000000);
            resolve({ width, height, durationInUS, durationInS });
          });
      });
}

export const getVideoBitrate = (filePath: string) => {
  return new Promise<{ bitrate: number }>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, function (err: any, metadata: any) {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata?.streams?.find((item: any) => item.codec_type === "video");
        const bitrate = videoStream.bit_rate || 3000000;
        resolve({ bitrate });
      });
  });
}