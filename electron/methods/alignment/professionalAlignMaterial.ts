import * as fs from "fs";
import { cloneDeep, filter } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { getIsCapCut } from "../../utils/nationVal";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
const semver = require("semver");
import type { ProfessionalAlignMaterialParamType } from "../../utils/types";

export const handleProfessionalAlignMaterial = async (
  _event: any,
  param: ProfessionalAlignMaterialParamType,
  jsonString: string
) => {
  if (!param.quantityRatio) {
    return {
      status: "error",
      data: `请先完成所有设置再点选草稿进行操作。`,
    };
  }
  if (param.quantityRatio === "custom" && param.customParagraphs.length === 0) {
    return {
      status: "error",
      data: `自定义分镜规则还没有设置，无法对齐，请先在设置中完成。`,
    };
  }
  if (param.alignTarget !== "text" && param.quantityRatio === "custom") {
    return {
      status: "error",
      data: `对齐目标须为字幕才可以自定义分镜。`,
    }
  }
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
    if (activationStatus.status === "official" && activationStatus.tier === "basic" && activationStatus.oftl <= 0) {
      return {
        status: "error",
        data: `您在有效期内剩余可用次数为0。无法为您执行本操作。建议您考虑续费不限次数的正式版。`,
      }
    }
    const jyConfigOriginal = JSONbig.parse(jsonString);
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    const videoTracks = filter(tracks, {
      type: "video",
      attribute: 0,
    });
    if (videoTracks.length === 0) {
      return { status: "error", data: "没有非锁定非静音的视频轨道。请检查是否静音或者锁定了主轨道，请先解除。" };
    }
    const sourceTrack = videoTracks[0];
    if (sourceTrack.segments.length === 0) {
      return {
        status: "error",
        data: "主视频轨道上没有任何图片或视频片段，请你将需要对齐的素材片段放置于主视频轨道上，关闭剪映草稿后，再回本软件重试。",
      };
    }
    if (
      activationStatus.status === "trial" &&
      sourceTrack.segments.length > 10
    ) {
      return {
        status: "error",
        data: `主视频轨道上有图片或视频片段共${sourceTrack.segments.length}段，超过了试用版不大于10段的限制（正式版无此上限限制）。请你将不超过10段需要对齐的素材片段放置于主视频轨道上，将超出的素材删除，关闭剪映草稿后，再回本软件重试。试用满意的话，恳请您点击左侧的"激活软件"激活正式版~`,
      };
    }
    let targetTrack;
    if (param.alignTarget === "text") {
      const textTracks = filter(tracks, {
        type: "text",
        attribute: 0,
      });
      if (textTracks.length === 0) {
        return { status: "error", data: "没有任何非隐藏非锁定的文字轨道" };
      }
      textTracks.sort((a, b) => b.segments.length - a.segments.length);
      targetTrack = textTracks[0];
    }
    if (param.alignTarget === "audio") {
      const audioTracks = filter(tracks, {
        type: "audio",
        attribute: 0,
      });
      if (audioTracks.length === 0) {
        return { status: "error", data: "没有任何非隐藏非锁定的音频轨道" };
      }
      audioTracks.sort((a, b) => b.segments.length - a.segments.length);
      targetTrack = audioTracks[0];
    }
    if (!targetTrack) {
      // will not happen
      return { status: "error", data: "瞄准的目标轨道找不到" };
    }
    if (targetTrack.segments.length === 0) {
      return {
        status: "error",
        data: `目标${mapAlignTargetValueToText(
          param.alignTarget
        )}轨道上没有任何片段`,
      };
    }

    let curSrcIdx = 0;
    let curTgtIdx = 0;

    if (param.quantityRatio === "custom") {
      const paraIndexes: number[] = [];
      for (let i = 0; i < targetTrack.segments.length; i++) {
        const lastParaIndex = paraIndexes.length > 0 ? paraIndexes[paraIndexes.length - 1] : 0;
        const lastPara = param.customParagraphs[lastParaIndex];
        const nextPara = param.customParagraphs[lastParaIndex + 1];
        if (doesBelongTo(targetTrack.segments[i], lastPara, jyConfig)) {
          paraIndexes.push(lastParaIndex);
          continue;
        }
        if (doesBelongTo(targetTrack.segments[i], nextPara, jyConfig)) {
          paraIndexes.push(lastParaIndex + 1);
        } else {
          // backup, not very reasonable
          paraIndexes.push(lastParaIndex);
        }
      }
      
      for (curSrcIdx = 0; curSrcIdx < sourceTrack.segments.length; curSrcIdx++) {
        const leftTargetIdx = paraIndexes.indexOf(curSrcIdx);
        if (leftTargetIdx === -1) {
          break;
        }
        const rightTargetIdx = paraIndexes.lastIndexOf(curSrcIdx);
        const leftTargetSeg = targetTrack.segments[leftTargetIdx];
        const leftTargetLeftTime = leftTargetSeg.target_timerange.start;
        const rightTargetSeg = targetTrack.segments[rightTargetIdx];
        const rightTargetRightTime = rightTargetSeg.target_timerange.start + rightTargetSeg.target_timerange.duration;
        const sourceSeg = sourceTrack.segments[curSrcIdx];
        if (getSegMaterialType(sourceSeg, jyConfig) === "photo&gif") {
          sourceSeg.target_timerange.start = leftTargetLeftTime;
          sourceSeg.target_timerange.duration = rightTargetRightTime - leftTargetLeftTime;
          sourceSeg.source_timerange.duration =
            sourceSeg.target_timerange.duration;
          sourceSeg.source_timerange.start = 0; // unchanged, just in case
        } else {
          handleVideoAlign({
            sourceSeg,
            durationToSet: rightTargetRightTime - leftTargetLeftTime,
            startToSet: leftTargetLeftTime,
            jyConfig,
            longVideoTreatment: param.longVideoTreatment,
          });
        }
        // update curTgtIdx
        curTgtIdx = rightTargetIdx + 1;
      }
    } else {
      while (
        curSrcIdx < sourceTrack.segments.length &&
        curTgtIdx < targetTrack.segments.length
      ) {
        const sourceSeg = sourceTrack.segments[curSrcIdx];
        const targetSeg = targetTrack.segments[curTgtIdx];
        const materialType = getSegMaterialType(sourceSeg, jyConfig);
        if (materialType === "photo&gif") {
          if (param.quantityRatio === "1:1") {
            sourceSeg.target_timerange.start = targetSeg.target_timerange.start;
            sourceSeg.target_timerange.duration =
              targetSeg.target_timerange.duration;
            sourceSeg.source_timerange.duration =
              sourceSeg.target_timerange.duration;
            sourceSeg.source_timerange.start = 0; // unchanged, just in case
            curSrcIdx = curSrcIdx + 1;
            curTgtIdx = curTgtIdx + 1;
          } else if (param.quantityRatio === "1:2") {
            const targetSeg2 = targetTrack.segments[curTgtIdx + 1];
            if (targetSeg2 !== undefined) {
              sourceSeg.target_timerange.start = targetSeg.target_timerange.start;
              sourceSeg.target_timerange.duration =
                targetSeg2.target_timerange.start +
                targetSeg2.target_timerange.duration -
                targetSeg.target_timerange.start;
              sourceSeg.source_timerange.duration =
                sourceSeg.target_timerange.duration;
              sourceSeg.source_timerange.start = 0; // unchanged, just in case
              curSrcIdx = curSrcIdx + 1;
            }
            curTgtIdx = curTgtIdx + (targetSeg2 === undefined ? 1 : 2);
          } else if (param.quantityRatio === "2:1") {
            const halfTgtDuration = Math.floor(
              targetSeg.target_timerange.duration / 2
            );
            sourceSeg.target_timerange.start = targetSeg.target_timerange.start;
            sourceSeg.target_timerange.duration = halfTgtDuration;
            sourceSeg.source_timerange.duration =
              sourceSeg.target_timerange.duration;
            sourceSeg.source_timerange.start = 0; // unchanged, just in case
            const sourceSeg2 = sourceTrack.segments[curSrcIdx + 1];
            if (sourceSeg2 !== undefined) {
              const durationToSet =
                targetSeg.target_timerange.duration - halfTgtDuration;
              const startToSet =
                targetSeg.target_timerange.start + halfTgtDuration;
              if (getSegMaterialType(sourceSeg2, jyConfig) === "photo&gif") {
                sourceSeg2.target_timerange.start = startToSet;
                sourceSeg2.target_timerange.duration = durationToSet;
                sourceSeg.source_timerange.duration =
                  sourceSeg.target_timerange.duration;
                sourceSeg.source_timerange.start = 0; // unchanged, just in case
              } else {
                handleVideoAlign({
                  sourceSeg: sourceSeg2,
                  durationToSet,
                  startToSet,
                  jyConfig,
                  longVideoTreatment: param.longVideoTreatment,
                });
              }
            }
            curSrcIdx = curSrcIdx + (sourceSeg2 === undefined ? 1 : 2);
            curTgtIdx = curTgtIdx + 1;
          }
        } else if (materialType === "video") {
          if (param.quantityRatio === "1:1") {
            handleVideoAlign({
              sourceSeg,
              durationToSet: targetSeg.target_timerange.duration,
              startToSet: targetSeg.target_timerange.start,
              jyConfig,
              longVideoTreatment: param.longVideoTreatment,
            });
            curSrcIdx = curSrcIdx + 1;
            curTgtIdx = curTgtIdx + 1;
          } else if (param.quantityRatio === "1:2") {
            const targetSeg2 = targetTrack.segments[curTgtIdx + 1];
            if (targetSeg2 !== undefined) {
              handleVideoAlign({
                sourceSeg,
                durationToSet:
                  targetSeg2.target_timerange.start +
                  targetSeg2.target_timerange.duration -
                  targetSeg.target_timerange.start,
                startToSet: targetSeg.target_timerange.start,
                jyConfig,
                longVideoTreatment: param.longVideoTreatment,
              });
              curSrcIdx = curSrcIdx + 1;
            }
            curTgtIdx = curTgtIdx + (targetSeg2 === undefined ? 1 : 2);
          } else if (param.quantityRatio === "2:1") {
            const halfTgtDuration = Math.floor(
              targetSeg.target_timerange.duration / 2
            );
            handleVideoAlign({
              sourceSeg,
              durationToSet: halfTgtDuration,
              startToSet: targetSeg.target_timerange.start,
              jyConfig,
              longVideoTreatment: param.longVideoTreatment,
            });
            const sourceSeg2 = sourceTrack.segments[curSrcIdx + 1];
            if (sourceSeg2 !== undefined) {
              const durationToSet =
                targetSeg.target_timerange.duration - halfTgtDuration;
              const startToSet =
                targetSeg.target_timerange.start + halfTgtDuration;
              if (getSegMaterialType(sourceSeg2, jyConfig) === "photo&gif") {
                sourceSeg2.target_timerange.start = startToSet;
                sourceSeg2.target_timerange.duration = durationToSet;
                sourceSeg.source_timerange.duration =
                  sourceSeg.target_timerange.duration;
                sourceSeg.source_timerange.start = 0; // unchanged, just in case
              } else {
                handleVideoAlign({
                  sourceSeg: sourceSeg2,
                  durationToSet,
                  startToSet,
                  jyConfig,
                  longVideoTreatment: param.longVideoTreatment,
                });
              }
            }
            curSrcIdx = curSrcIdx + (sourceSeg2 === undefined ? 1 : 2);
            curTgtIdx = curTgtIdx + 1;
          }
        } else {
          // will not happen, but we should do this to go out of the loop if strange thing happens
          curSrcIdx = curSrcIdx + 1;
        }
      }
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    for (let i = curSrcIdx; i < sourceTrack.segments.length; i++) {
      const sourceSeg = sourceTrack.segments[i];
      const prevSegEnd = sourceTrack.segments[i - 1] ? sourceTrack.segments[i - 1].target_timerange.start + sourceTrack.segments[i - 1].target_timerange.duration : 0;
      sourceSeg.target_timerange.start = prevSegEnd;
    }
    flushVideoTotalDuration(jyConfig);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(param.infoPath, resultStr, "utf8");
    return { status: "success", data: JSON.stringify({
      totalSrcCount: sourceTrack.segments.length,
      totalTgtCount: targetTrack.segments.length,
      alignedSrcCount: curSrcIdx,
      alignedTgtCount: curTgtIdx,
    }) };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
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

const mapAlignTargetValueToText = (val: string) => {
  switch (val) {
    case "text":
      return "字幕";
    case "audio":
      return "音频";
    default:
      return "";
  }
};

const getSegMaterialType = (seg: any, jyConfig: any) => {
  const videos = jyConfig.materials.videos;
  const material = videos.find(
    (element: any) => element.id === seg.material_id
  );
  if (material.type === "photo" || material.type === "gif") {
    return "photo&gif";
  }
  return material.type;
};

const handleVideoAlign = (param: {
  sourceSeg: any;
  durationToSet: any;
  startToSet: any;
  jyConfig: any;
  longVideoTreatment: string;
}) => {
  const { sourceSeg, durationToSet, startToSet, jyConfig, longVideoTreatment } =
    param;
  if (
    sourceSeg.target_timerange.duration > durationToSet &&
    longVideoTreatment === "cutright"
  ) {
    const cutRatio = durationToSet / sourceSeg.target_timerange.duration;
    sourceSeg.target_timerange.duration = durationToSet;
    sourceSeg.source_timerange.duration = Math.round(
      sourceSeg.source_timerange.duration * cutRatio
    );
    sourceSeg.target_timerange.start = startToSet;
  } else {
    const speedRatio = sourceSeg.source_timerange.duration / durationToSet;
    sourceSeg.target_timerange.duration = durationToSet;
    sourceSeg.target_timerange.start = startToSet;
    sourceSeg.speed = speedRatio;
    setSpeedPart(sourceSeg, jyConfig, speedRatio);
  }
};

const setSpeedPart = (seg: any, jyConfig: any, speedRatio: number) => {
  const speeds = jyConfig.materials.speeds;
  if (!speeds || !Array.isArray(speeds)) {
    throw new Error("请安装剪映4.0.0以上版本");
  }
  let speedObj = null;
  for (let i = 0; i < speeds.length; i++) {
    const curSpeedObj = speeds[i];
    if (seg.extra_material_refs.includes(curSpeedObj.id)) {
      speedObj = curSpeedObj;
      break;
    }
  }
  if (speedObj === null) {
    const speedId = `${seg.id.substring(0, 24)}00000000001`;
    speeds.push({
      curve_speed: null,
      id: speedId,
      mode: 0,
      speed: speedRatio,
      type: "speed",
    });
    seg.extra_material_refs.push(speedId);
    return;
  }
  speedObj.speed = speedRatio;
};

const extractSegPureContent = (seg: any, jyConfig: any) => {
  const isJsonFormatText = (appVer: string) => {
    if (getIsCapCut()) {
      return semver.gte(appVer, "2.9.8");
    } else {
      return semver.gte(appVer, "4.9.8");
    }
  }
  const extractPureTextContentOlder = (content: string) => {
    if (typeof content !== "string") {
      return "";
    }
    const startLeftIndex = content.lastIndexOf(">[");
    if (startLeftIndex === -1) {
      return "";
    }
    const startIndex = startLeftIndex + 2;
    const endIndex = content.indexOf("]</");
    if (endIndex === -1) {
      return "";
    }
    return content.substring(startIndex, endIndex);
  };
  const extractPureTextContentNewer = (content: string) => {
    try {
      const textObj = JSONbig.parse(content);
      return textObj.text;
    } catch (e) {
      return "";
    }
  };
  const extractPureTextContent = (content: string) => {
    const appVer = jyConfig.last_modified_platform.app_version;
    if (isJsonFormatText(appVer)) {
      return extractPureTextContentNewer(content);
    } else {
      return extractPureTextContentOlder(content);
    }
  }
  const materialTexts = jyConfig.materials.texts;
  const materialText = materialTexts.find(
    (item: any) => item.id === seg.material_id
  );
  if (materialText === undefined) {
    return "-";
  }
  return extractPureTextContent(materialText.content);
};

const doesBelongTo = (seg: any, para: any, jyConfig: any) => {
  if (para == undefined) {
    return false;
  }
  const pureContent = extractSegPureContent(seg, jyConfig);
  const toReplaceRgx = /\r\n/g;
  const pureContentSmall = pureContent.replace(toReplaceRgx, "\n").trim();
  const paraNormalized = para.replace(toReplaceRgx, "\n");
  return paraNormalized.indexOf(pureContentSmall) > -1;
}