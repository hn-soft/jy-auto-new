import * as fs from "fs";
import { cloneDeep } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { isLocked } from "../../utils/replaceUtils";
import { voteRandomInt } from "../../utils/randomUtils";
import { genRandom4DigitHexStr } from "../../utils/animationUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { AddEffectsParamType } from "../../utils/types";

export const RANDOM_MODE = {
  ORDER: "ORDER",
  PURE_RANDOM: "PURE_RANDOM",
};

export const handleAddBasics = async (
  _event: any,
  param: AddEffectsParamType,
  refJsonString: string,
  targetJsonString: string,
  trackType: string
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
    const durationRes = verifyVideoTotalDuration(targetJsonString);
    if (durationRes.status === "error") {
      return durationRes;
    }
    if (param.refInfoPath === param.targetInfoPath) {
      return {
        status: "error",
        data: "参考草稿和目标草稿不能相同。参考草稿是不会被改变的草稿，目标草稿是借鉴参考草稿里的内容会添加相应片段的草稿。请理清关系后重新选择。",
      };
    }

    const { randomMode, isTooShortToAdd, thresholdSegLen } = param;
    const refJyConfig = JSONbig.parse(refJsonString);
    const targetJyConfig = JSONbig.parse(targetJsonString);
    const refTracks = refJyConfig.tracks.filter((track: any) => {
      return track.type === trackType && !isLocked(track);
    });
    if (refTracks.length === 0) {
      let typeWording = "";
      switch (trackType) {
        case "effect":
          typeWording = "你需要让参考草稿中有至少一个特效片段。";
        case "filter":
          typeWording = "你需要让参考草稿中有至少一个滤镜片段。";
        case "sticker":
          typeWording = "你需要让参考草稿中有至少一个贴纸片段。";
      }
      return {
        status: "error",
        data: `${typeWording}目前参考草稿没有任何该片段。`,
      };
    }
    const targetVideoTracks = targetJyConfig.tracks.filter(
      (track: any) => track.type === "video" && !isLocked(track)
    );
    if (targetVideoTracks.length === 0) {
      return {
        status: "error",
        data: `目标草稿没有视频轨道`,
      };
    }
    const targetVideoTrack = targetVideoTracks[0];
    if (targetVideoTrack.segments.length === 0) {
      return {
        status: "error",
        data: "目标草稿主轨道上没有视频或图片片段",
      };
    }
    const targetSegTimeranges = targetVideoTrack.segments
      .map((seg: any) => {
        if (
          isTooShortToAdd &&
          seg.target_timerange.duration < pureTransformDuration(thresholdSegLen)
        ) {
          return undefined;
        }
        return {
          duration: seg.target_timerange.duration,
          start: seg.target_timerange.start,
        };
      })
      .filter((item: any) => !!item);
    let addedCount = 0;
    for (let i = 0; i < refTracks.length; i++) {
      const refTrack = refTracks[i];
      let refIdx = 0;
      const targetTrack = cloneDeep(refTrack);
      targetTrack.segments = [];
      targetTrack.id = genAnimationRandomId(targetTrack.id);
      for (let j = 0; j < targetSegTimeranges.length; j++) {
        const refSegCount = refTrack.segments.length;
        if (refSegCount === 0) {
          break;
        }
        let refSeg = undefined;
        if (randomMode === RANDOM_MODE.ORDER) {
          refSeg = refTrack.segments[refIdx];
          refIdx = (refIdx + 1) % refSegCount;
        } else if (randomMode === RANDOM_MODE.PURE_RANDOM) {
          refIdx = voteRandomInt(refSegCount);
          refSeg = refTrack.segments[refIdx];
        } else {
          return {
            status: "error",
            data: "设置里的模式未选择",
          };
        }
        const targetSeg = cloneDeep(refSeg);
        targetSeg.target_timerange = targetSegTimeranges[j];
        targetSeg.id = genAnimationRandomId(targetSeg.id);
        targetSeg.material_id = genAnimationRandomId(targetSeg.material_id);
        targetTrack.segments.push(targetSeg);

        const refMaterial = getRefMaterial(
          refJyConfig,
          refTrack.type,
          refSeg.material_id
        );
        if (refMaterial === undefined) {
          return {
            status: "error",
            data: "找不到materials",
          };
        }
        const targetSubMaterials = getTargetSubMaterials(
          targetJyConfig,
          refTrack.type
        );
        // clone过的可以直接赋值和push
        refMaterial.id = targetSeg.material_id;
        targetSubMaterials.push(refMaterial);
        addedCount++;
      }
      targetJyConfig.tracks.push(targetTrack);
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    flushVideoTotalDuration(targetJyConfig);
    const resultStr = JSONbig.stringify(targetJyConfig);
    fs.writeFileSync(param.targetInfoPath, resultStr, "utf8");

    return {
      status: "success",
      data: {
        vSegCount: targetSegTimeranges.length,
        layerCount: refTracks.length,
        addedCount,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const getRefMaterial = (
  refJyConfig: any,
  trackType: string,
  materialId: string
) => {
  let subMaterials = [];
  switch (trackType) {
    case "effect":
      subMaterials = refJyConfig.materials.video_effects;
      break;
    case "filter":
      subMaterials = refJyConfig.materials.effects;
      break;
    case "sticker":
      subMaterials = refJyConfig.materials.stickers;
      break;
  }
  const refMaterial = subMaterials.find((item: any) => item.id === materialId);
  if (refMaterial === undefined) {
    return refMaterial;
  }
  return cloneDeep(refMaterial);
};

const getTargetSubMaterials = (targetJyConfig: any, trackType: string) => {
  switch (trackType) {
    case "effect":
      return targetJyConfig.materials.video_effects;
    case "filter":
      return targetJyConfig.materials.effects;
    case "sticker":
      return targetJyConfig.materials.stickers;
  }
};

const verifyVideoTotalDuration = (jsonString: string) => {
  const status = handleGetActivationStatus();
  if (status.status === "official") {
    return { status: "success" };
  }
  const jyConfigOriginal = JSONbig.parse(jsonString);
  if (jyConfigOriginal.duration === undefined) {
    return { status: "error", data: "草稿未知时长" };
  }
  const duration = jyConfigOriginal.duration / 1000000;
  if (duration <= 60) {
    return { status: "success" };
  }
  const mn = Math.floor(duration / 60);
  const sc = Math.round(duration % 60);
  let durationWord = "";
  if (mn === 0) {
    durationWord = `${sc}秒`;
  } else {
    durationWord = sc === 0 ? `${mn}分` : `${mn}分${sc}秒`;
  }
  return {
    status: "error",
    data: `您选择的草稿时长为${durationWord}，超过了1分钟的试用版限制。您可以新建小于1分钟的草稿体验软件功能。您也可以选择现在激活正式版，正式版没有时长上限。`,
  };
};

const genAnimationRandomId = (baseId: string) => {
  return `${baseId.substring(
    0,
    8
  )}-${genRandom4DigitHexStr()}-${genRandom4DigitHexStr()}-${genRandom4DigitHexStr()}-000000FFFCBA`;
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

const pureTransformDuration = (readableDuration: number) => {
  return Math.round(readableDuration * 1000000);
};

export const handleAddBasicsForReplacement = async (
  param: AddEffectsParamType,
  targetJyConfig: any,
  trackType: string,
) => {
  try {
    const { randomMode, isTooShortToAdd, thresholdSegLen } = param;
    const refJsonString = fs.readFileSync(param.refInfoPath, {
      encoding: "utf8",
    });
    const refJyConfig = JSONbig.parse(refJsonString);
    const refTracks = refJyConfig.tracks.filter((track: any) => {
      return track.type === trackType && !isLocked(track);
    });
    if (refTracks.length === 0) {
      return {
        status: "success",
      };
    }
    const targetVideoTracks = targetJyConfig.tracks.filter(
      (track: any) => track.type === "video" && !isLocked(track)
    );
    if (targetVideoTracks.length === 0) {
      return {
        status: "success",
      };
    }
    const targetVideoTrack = targetVideoTracks[0];
    if (targetVideoTrack.segments.length === 0) {
      return {
        status: "success",
      };
    }
    const targetSegTimeranges = targetVideoTrack.segments
      .map((seg: any) => {
        if (
          isTooShortToAdd &&
          seg.target_timerange.duration < pureTransformDuration(thresholdSegLen)
        ) {
          return undefined;
        }
        return {
          duration: seg.target_timerange.duration,
          start: seg.target_timerange.start,
        };
      })
      .filter((item: any) => !!item);
    let addedCount = 0;
    for (let i = 0; i < refTracks.length; i++) {
      const refTrack = refTracks[i];
      let refIdx = 0;
      const targetTrack = cloneDeep(refTrack);
      targetTrack.segments = [];
      targetTrack.id = genAnimationRandomId(targetTrack.id);
      for (let j = 0; j < targetSegTimeranges.length; j++) {
        const refSegCount = refTrack.segments.length;
        if (refSegCount === 0) {
          break;
        }
        let refSeg = undefined;
        if (randomMode === RANDOM_MODE.ORDER) {
          refSeg = refTrack.segments[refIdx];
          refIdx = (refIdx + 1) % refSegCount;
        } else if (randomMode === RANDOM_MODE.PURE_RANDOM) {
          refIdx = voteRandomInt(refSegCount);
          refSeg = refTrack.segments[refIdx];
        } else {
          return {
            status: "error",
            data: "设置里的模式未选择",
          };
        }
        const targetSeg = cloneDeep(refSeg);
        targetSeg.target_timerange = targetSegTimeranges[j];
        targetSeg.id = genAnimationRandomId(targetSeg.id);
        targetSeg.material_id = genAnimationRandomId(targetSeg.material_id);
        targetTrack.segments.push(targetSeg);

        const refMaterial = getRefMaterial(
          refJyConfig,
          refTrack.type,
          refSeg.material_id
        );
        if (refMaterial === undefined) {
          return {
            status: "error",
            data: "找不到materials",
          };
        }
        const targetSubMaterials = getTargetSubMaterials(
          targetJyConfig,
          refTrack.type
        );
        // clone过的可以直接赋值和push
        refMaterial.id = targetSeg.material_id;
        targetSubMaterials.push(refMaterial);
        addedCount++;
      }
      targetJyConfig.tracks.push(targetTrack);
    }
    return {
      status: "success",
    }
  } catch (e) {
    return { status: "error", data: "false" };
  }
};
