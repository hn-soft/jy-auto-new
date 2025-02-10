import * as path from "path";
import { cloneDeep, filter } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { getVideoBitrate } from "../../utils/ffmpegUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
const ffmpeg = require("fluent-ffmpeg");
const ffprobe = require("ffprobe-static");
const pathToFfprobe = ffprobe.path.replace("app.asar", "app.asar.unpacked");
const pathToFfmpeg = require("ffmpeg-static").replace(
  "app.asar",
  "app.asar.unpacked"
);
ffmpeg.setFfprobePath(pathToFfprobe);
ffmpeg.setFfmpegPath(pathToFfmpeg);
import type { ExportMainTrackAllClipsParamType } from "../../utils/types";

const EXPORT_MODE = {
  SINGLE_TRACK: "SINGLE_TRACK",
  MULTI_TRACK: "MULTI_TRACK",
};

const COPY_CODEC = {
  YES: "YES",
  NO: "NO",
};

// 此函数是导出主轨道上所有视频片段
export const handleExportMainTrackAllClips = async (
  _event: any,
  param: ExportMainTrackAllClipsParamType,
  jsonString: string,
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
    const { infoPath, folderDir, copyCodec, exportMode, wholeOutputFilePath } =
      param;
    if (folderDir.length === 0) {
      return {
        status: "error",
        data: "你未选择目录",
      };
    }
    if (
      exportMode === EXPORT_MODE.MULTI_TRACK &&
      wholeOutputFilePath.length === 0
    ) {
      return {
        status: "error",
        data: "你未选择完整视频文件。你需要先自己手动导出该草稿的包含完整时间线的视频，然后由本软件根据视频主轨道的分割点进行分割，输出切片文件。",
      };
    }
    const jyConfigOriginal = JSONbig.parse(jsonString);
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    const allVideoTracks = filter(tracks, {
      type: "video",
    });
    const mainTrack = allVideoTracks[0];
    let totalExportSegCount = 0;
    if (exportMode === EXPORT_MODE.SINGLE_TRACK) {
      totalExportSegCount = await exportSingleTrack({
        mainTrack,
        jyConfig,
        progressHandler,
        infoPath,
        folderDir,
        copyCodec,
      });
    } else if (exportMode === EXPORT_MODE.MULTI_TRACK) {
      totalExportSegCount = await exportMultiTrack({
        mainTrack,
        progressHandler,
        infoPath,
        folderDir,
        wholeOutputFilePath,
        copyCodec,
      });
    }

    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    return {
      status: "success",
      data: totalExportSegCount,
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const exportSingleTrack = async (param: {
  mainTrack: any;
  jyConfig: any;
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  };
  infoPath: string;
  folderDir: string;
  copyCodec: string;
}) => {
  const {
    mainTrack,
    jyConfig,
    progressHandler,
    infoPath,
    folderDir,
    copyCodec,
  } = param;
  let currentExportCount = 0;
  const countMap = new Map<string, number>();
  for (let i = 0; i < mainTrack.segments.length; i++) {
    progressHandler.updateProgressInfo({
      fraction: i / mainTrack.segments.length,
      indication: `当前进度`,
    });
    const seg = mainTrack.segments[i];
    const material = findMaterials(seg.material_id, jyConfig, "videos");
    if (material === undefined || material.type !== "video") {
      continue;
    }
    if (!material.path) {
      continue;
    }
    const filepath = getFilepath(material.path, infoPath);
    const basename = path.basename(filepath);
    const suffix = path.extname(filepath);
    const prefix = basename.replace(/\.[^/.]+$/, "");
    const currentBasenameCount = countMap.get(basename) || 0;
    countMap.set(basename, currentBasenameCount + 1);
    const source_timerange = seg.source_timerange;
    await excuteExportRange({
      filepath,
      timerange: source_timerange,
      folderDir,
      prefix,
      countMark: currentBasenameCount + 1,
      suffix,
      copyCodec,
    });
    currentExportCount++;
  }
  return currentExportCount;
};

const exportMultiTrack = async (param: {
  mainTrack: any;
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  };
  infoPath: string;
  folderDir: string;
  wholeOutputFilePath: string;
  copyCodec: string;
}) => {
  const {
    mainTrack,
    progressHandler,
    folderDir,
    wholeOutputFilePath,
    copyCodec,
  } = param;
  let currentExportCount = 0;
  for (let i = 0; i < mainTrack.segments.length; i++) {
    progressHandler.updateProgressInfo({
      fraction: i / mainTrack.segments.length,
      indication: `当前进度`,
    });
    const seg = mainTrack.segments[i];
    const target_timerange = seg.target_timerange;
    const basename = path.basename(wholeOutputFilePath);
    const suffix = path.extname(basename);
    const prefix = basename.replace(/\.[^/.]+$/, "");
    await excuteExportRange({
      filepath: wholeOutputFilePath,
      timerange: target_timerange,
      folderDir,
      prefix,
      countMark: currentExportCount + 1,
      suffix,
      copyCodec,
    });
    currentExportCount++;
  }
  return currentExportCount;
};

const excuteExportRange = async (param: {
  filepath: string;
  timerange: { start: number; duration: number };
  folderDir: string;
  prefix: string;
  countMark: number;
  suffix: string;
  copyCodec: string;
}) => {
  const {
    filepath,
    timerange,
    folderDir,
    prefix,
    countMark,
    suffix,
    copyCodec,
  } = param;
  if (copyCodec === COPY_CODEC.YES) {
    await new Promise((resolve, reject) => {
      ffmpeg(filepath)
        .setStartTime(timerange.start / 1000000)
        .setDuration(timerange.duration / 1000000)
        .withVideoCodec("copy")
        .withAudioCodec("copy")
        .output(path.join(folderDir, `${prefix}-p${countMark}${suffix}`))
        .on("end", function () {
          resolve(null);
        })
        .on("error", (err: any) => reject(err))
        .run();
    });
  } else {
    const bitrateRes = await getVideoBitrate(filepath);
    const bitrate = bitrateRes.bitrate;
    await new Promise((resolve, reject) => {
      ffmpeg(filepath)
        .setStartTime(timerange.start / 1000000)
        .setDuration(timerange.duration / 1000000)
        .videoBitrate(`${Math.round(bitrate / 1000)}k`)
        .output(path.join(folderDir, `${prefix}-p${countMark}${suffix}`))
        .on("end", function () {
          resolve(null);
        })
        .on("error", (err: any) => reject(err))
        .run();
    });
  }
};

const findMaterials = (
  materialId: string,
  jyConfig: any,
  materialSubCategory: string
) => {
  const subMaterials = jyConfig.materials[materialSubCategory];
  return subMaterials.find((item: any) => item.id === materialId);
};

const getFilepath = (materialPath: string, infoPath: string) => {
  const draftPlaceholderRegex = /##_draftpath_placeholder_.+?_##/;
  if (materialPath.match(draftPlaceholderRegex)) {
    const subpath = materialPath.replace(draftPlaceholderRegex, "");
    const fullpath = path.join(infoPath, "..", subpath);
    console.log(fullpath);
    return fullpath;
  } else {
    return materialPath;
  }
};
