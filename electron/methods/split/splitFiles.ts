import * as path from "path";
import * as fs from "fs";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { getVideoDimensions, getVideoBitrate } from "../../utils/ffmpegUtils";
import {
  isVideoFileToSplit,
  getDurationRanges,
  canCodecCopy,
  edgeThrowRanges,
  getOutputFilePath,
  getCropOptionsObj,
  getRandomVideoSpeed,
} from "../../utils/splitUtils";
import { randomizeArrayOrder } from "../../utils/mathUtils";

const Store = require("electron-store");
const store = new Store();
const ffmpeg = require("fluent-ffmpeg");
const ffprobe = require("ffprobe-static");
const pathToFfprobe = ffprobe.path.replace("app.asar", "app.asar.unpacked");
const pathToFfmpeg = require("ffmpeg-static").replace(
  "app.asar",
  "app.asar.unpacked"
);
ffmpeg.setFfprobePath(pathToFfprobe);
ffmpeg.setFfmpegPath(pathToFfmpeg);

const EDGE_THROW_SPAN = { front: {lower: 0.1, higher: 0.1}, back: {lower: 0.1, higher: 0.1}};
const CROP_RATIO_SPAN = [0.1, 0.2];
const SPEEDING_RATIO_SPAN = [1.05, 1.1];
const FLIP_CHANCE = 0.5;
import type { SplitFilesParamType } from "../../utils/types";

export const handleSplitFiles = async (
  _event: any,
  param: SplitFilesParamType,
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  }
) => {
  const activationStatus = handleGetActivationStatus();
  if (activationStatus.status === "expired") {
    const expiredDate = new Date(activationStatus.gt * 1000).toLocaleDateString(
      "zh-CN",
      { timeZone: "Asia/Shanghai" }
    );
    return {
      status: "error",
      data: `该软件已经到期，无法执行此操作，过期日期是 ${expiredDate}。诚挚恳请您续费，请跳转到"激活软件"页面获取新的产品信息码和联系方式。`,
    };
  }
  try {
    const trialTimeLeft = store.get(STORE_KEY.TRIAL_TIME_LEFT);
    if (activationStatus.status === "trial" && trialTimeLeft === 0) {
      return {
        status: "error",
        data: `您的剩余试用次数为0。诚挚恳请您购买正式版，请跳转到"激活软件"页面获取产品信息码和联系方式。`,
      };
    }
    // 之所以 oftl 要用小于等于，是为了防止漏网之鱼让它掉到0以下。
    if (
      activationStatus.status === "official" &&
      activationStatus.tier === "basic" &&
      activationStatus.oftl <= 0
    ) {
      return {
        status: "error",
        data: `您在有效期内剩余可用次数为0。无法为您执行本操作。建议您考虑续费不限次数的正式版。`,
      };
    }
    const { by } = param;
    const {
      inputFolderDir,
      outputFolderDir,
      duration = 3,
      sceneThreshold = 10,
      outputStoredTogether,
      obfuscator,
    } = param;
    if (inputFolderDir.length === 0) {
      return {
        status: "error",
        data: "未选择输入文件夹。",
      };
    }
    if (outputFolderDir.length === 0) {
      return {
        status: "error",
        data: "未选择输出文件夹。",
      };
    }
    if (!fs.existsSync(inputFolderDir)) {
      return {
        status: "error",
        data: "你选择的输入文件夹已不存在",
      };
    }
    if (!fs.existsSync(outputFolderDir)) {
      return {
        status: "error",
        data: "你选择的输出文件夹已不存在",
      };
    }
    const inputCandidates = fs.readdirSync(inputFolderDir, {
      withFileTypes: true,
    });
    const inputFilenames = inputCandidates
      .filter((item) => item.isFile() && isVideoFileToSplit(item.name))
      .map((item) => item.name);
    if (activationStatus.status === "trial" && inputFilenames.length > 3) {
      return {
        status: "error",
        data: `试用版只能同时对不超过3个视频文件进行分割。当前输入文件夹里共有${inputFilenames.length}个视频文件。请移除部分视频文件再进行试用。正式版支持输入文件夹里有无限多的视频文件。如果您试用满意，请跳转到"激活软件"页面获取产品信息码和联系方式。`,
      };
    }

    fs.rmSync(outputFolderDir, { recursive: true, force: true });
    fs.mkdirSync(outputFolderDir);

    let flipIndexes: number[] = [];
    if (obfuscator.flip.isNeed) {
      flipIndexes = inputFilenames.map((_val: string, index: number) => {
        return index;
      });
      flipIndexes = randomizeArrayOrder(flipIndexes);
      const flipCount = Math.floor(inputFilenames.length * FLIP_CHANCE);
      flipIndexes = flipIndexes.slice(0, flipCount);
    }

    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);

    let clipCount = 0;
    for (let i = 0; i < inputFilenames.length; i++) {
      const inputFilename = inputFilenames[i];
      if (!outputStoredTogether) {
        createSubfolder(inputFilename, outputFolderDir);
      }
      const inputPath = path.join(inputFolderDir, inputFilename);
      const videoDim = await getVideoDimensions(inputPath);
      const bitrateOption = await getBitrateOption(inputPath);
      let ranges: { start: number; end: number }[] = [];
      if (by === "time") {
        ranges = getDurationRanges(videoDim.durationInS, duration);
      } else {
        ranges = await getSceneRanges(
          sceneThreshold,
          inputPath,
          videoDim.durationInS
        );
      }
      if (obfuscator.edgeThrow.isNeed) {
        ranges = edgeThrowRanges(ranges, EDGE_THROW_SPAN);
      }
      for (let j = 0; j < ranges.length; j++) {
        progressHandler.updateProgressInfo({
          fraction:
            i / inputFilenames.length +
            ((1 / inputFilenames.length) * j) / ranges.length,
          indication: `当前进度`,
        });
        const range = ranges[j];
        const videoSpeedStr = obfuscator.speeding.isNeed
          ? getRandomVideoSpeed(SPEEDING_RATIO_SPAN).toFixed(3)
          : "1";
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .inputOptions([
              `-ss ${range.start.toFixed(3)}`,
              `-t ${(range.end - range.start).toFixed(3)}`,
            ])
            .videoFilters(
              [
                obfuscator.speeding.isNeed
                  ? `setpts=(PTS-STARTPTS)/${videoSpeedStr}`
                  : undefined,
                obfuscator.crop.isNeed
                  ? {
                      filter: "crop",
                      options: getCropOptionsObj(videoDim, CROP_RATIO_SPAN),
                    }
                  : undefined,
                obfuscator.flip.isNeed && flipIndexes.includes(j)
                  ? "hflip"
                  : undefined,
              ].filter((x) => x !== undefined)
            )
            .audioFilters(
              [
                obfuscator.speeding.isNeed
                  ? `atempo=${videoSpeedStr}`
                  : undefined,
              ].filter((x) => x !== undefined)
            )
            .outputOptions(
              [
                !canCodecCopy(param) ? bitrateOption : undefined,
                canCodecCopy(param) ? "-c copy" : undefined,
              ].filter((x) => x !== undefined)
            )
            .output(
              getOutputFilePath(
                inputFilename,
                j,
                outputFolderDir,
                outputStoredTogether
              )
            )
            .on("end", function () {
              resolve(null);
            })
            .on("error", (err: any) => reject(err))
            .run();
        });
      }
      clipCount += ranges.length;
    }
    return {
      status: "success",
      data: {
        inputFileCount: inputFilenames.length,
        clipCount,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const createSubfolder = (inputFilename: string, outputFolderDir: string) => {
  const inputFilenamePrefix = inputFilename.replace(/\.[^/.]+$/, "");
  const outputSubfolderDir = path.join(outputFolderDir, inputFilenamePrefix);
  if (fs.existsSync(outputSubfolderDir)) {
    fs.rmSync(outputSubfolderDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputSubfolderDir);
};

const getBitrateOption = async (inputPath: string) => {
  const bitrateRes = await getVideoBitrate(inputPath);
  const bitrate = bitrateRes.bitrate;
  return `-b:v ${Math.round(bitrate / 1000)}k`;
};

export const getSceneRanges = (
  sceneThreshold: number,
  inputPath: string,
  duration: number
) => {
  const st = (sceneThreshold / 100).toFixed(2);
  const points: number[] = [];
  return new Promise<{start: number, end: number}[]>((resolve, _reject) => {
    ffmpeg(inputPath)
      .videoFilters({
        filter: "select",
        options: `'gt(scene,${st})',showinfo`,
      })
      .addOption("-f", null)
      .on("stderr", function (stderrLine: any) {
        if (stderrLine.includes("pts_time:")) {
          const valStr = stderrLine.split("pts_time:")[1].split("duration:");
          const val = parseFloat(valStr);
          points.push(val);
        }
      })
      .on("end", function (stdout: any, stderr: any) {
        if (points.length === 0) {
          resolve([{ start: 0, end: duration }]);
          return;
        }
        const ranges = [];
        for (let i = 0; i < points.length; i++) {
          const prevPoint = i === 0 ? 0 : points[i - 1];
          ranges.push({ start: prevPoint, end: points[i] });
        }
        ranges.push({ start: points[points.length - 1], end: duration });
        resolve(ranges);
      })
      .on("error", function (error: any) {
        resolve([{ start: 0, end: duration }]);
      })
      .output("nowhere")
      .run();
  });
};
