import * as fs from "fs";
import { cloneDeep, filter, uniq } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { cutAudioBySourcePoints } from "../../utils/cutAudioByPoints";
import type { CutMsAudioParamType } from "../../utils/types";

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

type SilenceInfoItemType = {
  stSec: number;
  stUS: number;
  endSec: number;
  endUS: number;
  duration: number;
  durationUS: number;
  midSec: number;
  midUS: number;
  noiseLevelNum: number;
};

type DetectSilenceResultType = {
  sourcePointsWithEdge: number[];
  sourcePointsWithoutEdge: number[];
  rangeAttributes: boolean[];
  loudyRangeCount: number;
  silenceRangeCount: number;
};

export const detectSilence = (
  filepath: string,
  aeg: any,
  noiseLevel: string,
  sildur: number
) => {
  return new Promise((resolve, reject) => {
    const silenceInfo: SilenceInfoItemType[] = [];
    const sildurStr = `${sildur - 0.25}`; // 超过此秒数的沉默才作数
    ffmpeg(filepath)
      .audioFilters({
        filter: "silencedetect",
        options: { n: noiseLevel, d: sildurStr },
      })
      .addOption("-f", null)
      .on("codecData", function (data: any) {
        // console.log(
        //   "Input is " + data.audio + " audio " + "with " + data.video + " video"
        // );
      })
      .on("stderr", function (stderrLine: any) {
        if (stderrLine.includes(" silence_end: ")) {
          const endInfo: string[] = stderrLine
            .split(" silence_end: ")[1]
            .split(" | silence_duration: ");
          const [endSec, duration] = endInfo.map((s) => +s);
          // console.log('Stderr output: ' + stderrLine)
          // console.log(endSec, duration)
          const stSec = endSec - duration;
          silenceInfo.push({
            stSec,
            stUS: pureTransformDuration(stSec),
            endSec,
            endUS: pureTransformDuration(endSec),
            duration,
            durationUS: pureTransformDuration(duration),
            midSec: (stSec + endSec) / 2,
            midUS:
              (pureTransformDuration(stSec) + pureTransformDuration(endSec)) /
              2,
            noiseLevelNum: parseInt(
              noiseLevel.substring(0, noiseLevel.length - 2)
            ),
          });
        }
      })
      .on("error", function (error: any) {
        console.error("Error:", error, noiseLevel);
        reject({ status: "error", data: `${error}` });
      })
      .on("end", function (stdout: any, stderr: any) {
        // console.log("Transcoding succeeded,  silenceInfo:", silenceInfo);
        // console.log("silenceInfo length:", silenceInfo.length);
        const stAegSrc = aeg.source_timerange.start;
        const endAegSrc =
          aeg.source_timerange.start + aeg.source_timerange.duration;
        // filter掉的是完全不在range内的
        let inrangeSilenceInfo = silenceInfo.filter((info) => {
          if (info.endUS <= stAegSrc) {
            return false;
          }
          if (info.stUS >= endAegSrc) {
            return false;
          }
          return true;
        });
        // 对于部分在range内，部分不在的，我们把信息值设置为从边缘开始，舍弃掉range外的部分。
        // 对于末尾的容错很重要，容错0.1s，这是因为剪映的微秒长度可能跟ffmpeg探测的有细微区别。
        inrangeSilenceInfo.forEach((info) => {
          if (info.stUS - 100000 < stAegSrc && info.endUS > stAegSrc) {
            info.stUS = stAegSrc;
          }
          if (info.stUS < endAegSrc && info.endUS + 100000 > endAegSrc) {
            info.endUS = endAegSrc;
          }
        });
        const keyPoints = [];
        let silenceRangeCount = 0;
        let loudyRangeCount = 0;
        inrangeSilenceInfo.forEach((item) => {
          keyPoints.push(item.stUS);
          keyPoints.push(item.endUS);
        });
        keyPoints.push(stAegSrc);
        keyPoints.push(endAegSrc);
        const sourcePointsWithEdge = uniq(keyPoints);
        sourcePointsWithEdge.sort((a, b) => a - b);
        const rangeAttributes = [];
        for (let i = 0; i < sourcePointsWithEdge.length - 1; i++) {
          const rangeLeft = sourcePointsWithEdge[i];
          const rangeRight = sourcePointsWithEdge[i + 1];
          const silenceIdx = inrangeSilenceInfo.findIndex(
            (item) => item.stUS === rangeLeft && item.endUS === rangeRight
          );
          // 由关键点组成的区间如果是一个沉默区间，那么rangeAttribute设为false，如果是有声区间，那么rangeAttribute设为true。
          if (silenceIdx === -1) {
            rangeAttributes.push(true);
            loudyRangeCount++;
          } else {
            rangeAttributes.push(false);
            silenceRangeCount++;
          }
        }
        resolve({
          status: "success",
          data: {
            sourcePointsWithEdge,
            sourcePointsWithoutEdge: sourcePointsWithEdge.slice(
              1,
              sourcePointsWithEdge.length - 1
            ),
            rangeAttributes,
            loudyRangeCount,
            silenceRangeCount,
          },
        });
        return;
      })
      .on("data", function (data: any) {
        // console.log("ffmpeg stdout data = " + JSON.stringify(data));
      })
      .output("nowhere")
      .run();
  });
};

const detectSplitPoints = async (
  jyConfig: any,
  aegs: any[],
  tegs: any,
  sildur: number,
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  }
) => {
  const wantedSplitCount = tegs.length;
  if (wantedSplitCount < 2) {
    // 尽量不要进入这个判断，前置解决为好，这里仅做预防性报错
    return { status: "error", data: "字幕段落数不够2段，不需要分割音频" };
  }
  let matchedAegResults: DetectSilenceResultType[] | null = null;
  let nearestLoudyRangeCountForErrorReport = 0;
  for (let j = -60; j <= -20; j += 5) {
    const noiseLevel = `${j}dB`;
    const aegResults = [];
    for (let i = 0; i < aegs.length; i++) {
      const aeg = aegs[i];
      const audioMaterial = jyConfig.materials.audios.find(
        (item: any) => item.id === aeg.material_id
      );
      if (audioMaterial == undefined || audioMaterial.path == null) {
        return { status: "error", data: "找不到音频文件" };
      }
      const filepath = audioMaterial.path;
      try {
        const aegResultObj: any = await detectSilence(
          filepath,
          aeg,
          noiseLevel,
          sildur
        );
        if (aegResultObj.status === "error") {
          return aegResultObj;
        }
        aegResults.push(aegResultObj.data);
      } catch (e) {
        return {
          status: "error",
          // @ts-ignore
          data: `this round detectSilence encounters error: ${e?.message || e}`,
        };
      }
    }
    progressHandler.updateProgressInfo({
      fraction: (j + 60) / 41,
      indication: "正在智能分割...",
    });
    const loudyRangeCountOnTrack = aegResults.reduce(
      (accumulator, currentValue) => {
        return accumulator + currentValue.loudyRangeCount;
      },
      0
    );
    if (loudyRangeCountOnTrack === wantedSplitCount) {
      matchedAegResults = aegResults;
      break;
    } else {
      if (
        Math.abs(loudyRangeCountOnTrack - wantedSplitCount) <
        Math.abs(nearestLoudyRangeCountForErrorReport - wantedSplitCount)
      ) {
        nearestLoudyRangeCountForErrorReport = loudyRangeCountOnTrack;
      }
    }
  }
  if (matchedAegResults === null) {
    return {
      status: "error",
      data: `剪映草稿中的这${aegs.length}段长音频看起来比较有可能分割成${nearestLoudyRangeCountForErrorReport}段，不是字幕段落数${wantedSplitCount}。所以无法完成操作。请检查语音朗读内容是否充足，也请检查是否每一句字幕的朗读之间有${sildur}s的停顿，只有足够长的停顿，本软件才能批量分割。`,
    };
  }
  return { status: "success", data: matchedAegResults };
};

export const handleCutMsAudio = async (
  _event: any,
  param: CutMsAudioParamType,
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
    const jyConfigOriginal = JSONbig.parse(jsonString);
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }

    const textTracks = filter(tracks, {
      type: "text",
      attribute: 0,
    });
    if (textTracks.length === 0) {
      return {
        status: "error",
        data: "没有任何文字（字幕）轨道，无法执行对齐操作，请确保你已经添加了字幕并关闭草稿",
      };
    }
    if (textTracks.length > 1) {
      return {
        status: "error",
        data: "不可以有多条文字（字幕）轨道，请你将字幕之外的文字隐藏或删除，先专注于对齐。如果你的字幕在朗读AI语音后就散落多个轨道，那你的错误应该是你勾选了朗读跟随文本更新，请去掉此勾选再朗读，使得字幕只出现在一条轨道。",
      };
    }
    // text segs is tegs
    const tegs = textTracks[0].segments;
    if (tegs.length < 2) {
      return {
        status: "error",
        data: "少于2段字幕的情况下不需要分割音频。请你检查是否添加足够的字幕片段数。",
      };
    }

    // // 分割好视频之后，接下来是让音频变速到指定倍数
    const audioTracks = filter(tracks, {
      type: "audio",
      attribute: 0,
    });
    if (audioTracks.length === 0) {
      return {
        status: "error",
        data: "没有任何非静音非锁定的音频轨道，请确保你已经添加了语音片段并关闭草稿",
      };
    }
    if (audioTracks.length > 1) {
      return {
        status: "error",
        data: `请确保你的外来长音频（可以有一段或多段）都添加到同一条音频轨道，当前发现有${audioTracks.length}条，所以无法为你进行分割操作。`,
      };
    }
    const audioTrack = audioTracks[0];
    if (audioTrack.segments.length === 0) {
      return {
        status: "error",
        data: "没有任何非静音非锁定的音频片段，请确保你已经添加了语音片段并关闭草稿",
      };
    }
    if (audioTrack.segments.length >= tegs.length) {
      return {
        status: "error",
        data: `发现有${audioTrack.segments.length}段音频，与此同时有${tegs.length}段字幕。所以音频轨道上的应该不是长音频，不需要分割。有可能是你已经分割过了，不可重复操作。`,
      };
    }

    const longAegs = audioTrack.segments;
    try {
      const detectRes: any = await detectSplitPoints(
        jyConfig,
        longAegs,
        tegs,
        param.sildur,
        progressHandler
      );
      if (detectRes.status === "error") {
        // 分割时如果遇到错误直接报错结束
        return detectRes;
      }
      const detectResData: DetectSilenceResultType[] = detectRes.data;
      const sourcePointsWithoutEdgeList = detectResData.map(
        (item) => item.sourcePointsWithoutEdge
      );
      const rangeAttributesList = detectResData.map(
        (item) => item.rangeAttributes
      );
      for (let i = 0; i < sourcePointsWithoutEdgeList.length; i++) {
        const sourcePointsWithoutEdge = sourcePointsWithoutEdgeList[i];
        const rangeAttributes = rangeAttributesList[i];
        for (let j = 1; j < rangeAttributes.length - 1; j++) {
          const rangeAttribute = rangeAttributes[j];
          const rangeLeftSourcePoint = sourcePointsWithoutEdge[j - 1];
          const rangeRightSourcePoint = sourcePointsWithoutEdge[j];
          if (
            !rangeAttribute &&
            rangeRightSourcePoint - rangeLeftSourcePoint >
              pureTransformDuration(param.sildur)
          ) {
            const redundantEdgeSilence =
              rangeRightSourcePoint -
              rangeLeftSourcePoint -
              pureTransformDuration(param.sildur);
            const halfRedundantEdgeSilence = redundantEdgeSilence / 2;
            sourcePointsWithoutEdge[j - 1] =
              sourcePointsWithoutEdge[j - 1] +
              halfRedundantEdgeSilence +
              pureTransformDuration(param.stripSilence);
            sourcePointsWithoutEdge[j] =
              sourcePointsWithoutEdge[j] -
              halfRedundantEdgeSilence -
              pureTransformDuration(param.stripSilence);
          }
        }
      }
      cutAudioBySourcePoints(
        jyConfig,
        audioTrack,
        sourcePointsWithoutEdgeList,
        rangeAttributesList
      );
      // 尽量让音频段落的位置接近其对应的字幕，以便让用户能够看得清楚，但是要防止重叠，所以执行两遍循环
      // 第一遍是让音频aegs的start对准对应index的字幕，第二遍是将重叠的音频aegs往右排
      for (let i = 0; i < audioTrack.segments.length; i++) {
        const curAeg = audioTrack.segments[i];
        const curTeg = tegs[i];
        curAeg.target_timerange.start = curTeg.target_timerange.start;
      }
      for (let i = 1; i < audioTrack.segments.length; i++) {
        const prevAeg = audioTrack.segments[i - 1];
        const curAeg = audioTrack.segments[i];
        if (doesSegsOverlapAnyInList(curAeg, audioTrack.segments.slice(0, i))) {
          curAeg.target_timerange.start =
            prevAeg.target_timerange.start + prevAeg.target_timerange.duration;
        }
      }

      flushVideoTotalDuration(jyConfig);
      store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
      const resultStr = JSONbig.stringify(jyConfig);
      fs.writeFileSync(param.infoPath, resultStr, "utf8");

      return {
        status: "success",
        data: {
          longAegCount: longAegs.length,
          tegCount: tegs.length,
        },
      };
    } catch (e) {
      return {
        status: "error",
        // @ts-ignore
        data: `分割长音频时发生了错误被捕获: ${e?.message || e}`,
      };
    }
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const doesSegsOverlap = (segA: any, segB: any) => {
  const aStart = segA.target_timerange.start;
  const aEnd = segA.target_timerange.start + segA.target_timerange.duration;
  const bStart = segB.target_timerange.start;
  const bEnd = segB.target_timerange.start + segB.target_timerange.duration;
  if (aEnd <= bStart || bEnd <= aStart) {
    return false;
  } else {
    return true;
  }
};

const doesSegsOverlapAnyInList = (seg: any, segList: any) => {
  for (let i = 0; i < segList.length; i++) {
    const targetSeg = segList[i];
    if (seg.id !== targetSeg.id && doesSegsOverlap(seg, targetSeg)) {
      return true;
    }
  }
  return false;
};

export const flushVideoTotalDuration = (jyConfig: any) => {
  if (jyConfig.duration === undefined) {
    return { status: "error", data: "Duration does not exist" };
  }
  let durationToSet = 0;
  const tracks = jyConfig.tracks;
  if (!Array.isArray(tracks)) {
    return { status: "error", data: "Tracks is not an array." };
  }
  tracks.forEach((track) => {
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      return;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    if (lastEnd > durationToSet) {
      durationToSet = lastEnd;
    }
  });
  jyConfig.duration = durationToSet;
};

export const getVideoTrackDuration = (jyConfig: any) => {
  const tracks = jyConfig.tracks;
  const videoTracks = filter(tracks, {
    type: "video",
  });
  let largestDuration = 0;
  videoTracks.forEach((track: any) => {
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      return;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    if (lastEnd > largestDuration) {
      largestDuration = lastEnd;
    }
  });
  return largestDuration;
};

const pureTransformDuration = (readableDuration: number) => {
  return Math.round(readableDuration * 1000000);
};
