import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { cloneDeep, filter, remove } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { voteRandomInt } from "../../utils/randomUtils";
import type { AddTransitionsParamType } from "../../utils/types";
import type { LoadTransitionInfosType } from "../../utils/types";
import type { GetIsTransitionExistType } from "../../utils/types";

import {
  copySoundEffects,
  POSITION_ATTRIBUTE,
} from "../../utils/copySoundEffects";
import { isLocked } from "../../utils/replaceUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");

export const RANDOM_MODE = {
  ORDER: "ORDER",
  FLATTEN_RANDOM: "FLATTEN_RANDOM",
  PURE_RANDOM: "PURE_RANDOM",
};

export const SOUND_MODE = {
  NO_SOUND: "NO_SOUND",
  YES_SOUND: "YES_SOUND",
};

export const handleAddTransitions = async (
  _event: any,
  param: AddTransitionsParamType,
  jsonString: string
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
    const durationRes = verifyVideoTotalDuration(jsonString);
    if (durationRes.status === "error") {
      return durationRes;
    }
    const {
      infoPath,
      isCapCut,
      readableDuration,
      effectIdWithFileUris,
      isMainTrackOnly,
      randomMode,
      soundMode,
    } = param;
    const jyConfigOriginal = JSONbig.parse(jsonString);
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    let videoTracks = [];
    if (isMainTrackOnly) {
      videoTracks = filter(tracks, {
        type: "video",
      });
      if (videoTracks.length === 0) {
        return { status: "error", data: "没有视频主轨道" };
      }
      videoTracks = [videoTracks[0]];
    } else {
      videoTracks = tracks.filter(
        (track: any) => track.type === "video" && !isLocked(track)
      );
      if (videoTracks.length === 0) {
        return {
          status: "error",
          data: "没有任何非锁定的视频轨道",
        };
      }
    }
    if (effectIdWithFileUris.length === 0) {
      return { status: "error", data: "至少需要设置一个转场效果。" };
    }
    if (
      randomMode === RANDOM_MODE.FLATTEN_RANDOM &&
      effectIdWithFileUris.length < 2
    ) {
      return {
        status: "error",
        data: `由于你设置了均匀随机模式，所以你必须至少添加2种转场效果，否则无法保证相邻不重复，而当前你只添加了${effectIdWithFileUris.length}种。`,
      };
    }
    const infoRes = getIsOverlapsOfEffectIds(effectIdWithFileUris, isCapCut);
    if (infoRes.status === "error") {
      return infoRes;
    }
    const { isOverlaps, effect_ids } = infoRes.data as {
      isOverlaps: boolean[];
      effect_ids: string[];
    };
    const recoverRes = recoverTrack({ jyConfig, videoTracks });
    if (recoverRes.status === "error") {
      return recoverRes;
    }
    const res = modifyTracks({
      jyConfig,
      readableDuration,
      isOverlaps,
      effect_ids,
      videoTracks,
      isCapCut,
      randomMode,
    });
    if (res.status === "error") {
      return res;
    }
    if (soundMode === SOUND_MODE.YES_SOUND) {
      // @ts-ignore
      copySoundEffects(jyConfig, res.data.positions, POSITION_ATTRIBUTE.MID);
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(infoPath, resultStr, "utf8");
    return {
      status: "success",
      data: res.data,
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const getIsOverlapsOfEffectIds = (
  effectIdWithFileUris: string[],
  isCapCut: boolean
) => {
  const homedir = os.userInfo().homedir;
  const effect_ids: string[] = [];
  const isOverlaps: boolean[] = [];
  for (let i = 0; i < effectIdWithFileUris.length; i++) {
    const effectIdWithFileUri = effectIdWithFileUris[i];
    const parts = effectIdWithFileUri.split("#");
    const effect_id = parts[0];
    effect_ids.push(effect_id);
    const effect_file_uri = parts[1];
    let overlapInfoPath = "";
    if (process.platform === "darwin") {
      overlapInfoPath = path.join(
        homedir,
        `Movies/${
          isCapCut ? "CapCut" : "JianyingPro"
        }/User Data/Cache/effect/${effect_id}/${effect_file_uri}/extra.json`
      );
      if (!fs.existsSync(overlapInfoPath)) {
        return {
          status: "error",
          data: `找不到 ${effect_id}/${effect_file_uri} 的必要信息，请试着更新剪映或CapCut到最新版。`,
        };
      }
    } else if (process.platform === "win32") {
      overlapInfoPath = path.join(
        homedir,
        `AppData\\Local\\${
          isCapCut ? "CapCut" : "JianyingPro"
        }\\User Data\\Cache\\effect\\${effect_id}\\${effect_file_uri}\\extra.json`
      );
      if (!fs.existsSync(overlapInfoPath)) {
        return {
          status: "error",
          data: `找不到 ${effect_id}/${effect_file_uri} 的必要信息，请试着更新剪映或CapCut到最新版。`,
        };
      }
    }
    const overlapInfoJsonStr = fs.readFileSync(overlapInfoPath, {
      encoding: "utf8",
    });
    const overlapInfoJson = JSONbig.parse(overlapInfoJsonStr);
    const isOverlap = overlapInfoJson.transition.isOverlap;
    isOverlaps.push(isOverlap);
  }
  return {
    status: "success",
    data: {
      effect_ids,
      isOverlaps,
    },
  };
};

const modifyTracks = (param: {
  jyConfig: any;
  readableDuration: number;
  isOverlaps: boolean[];
  effect_ids: string[];
  videoTracks: any[];
  isCapCut: boolean;
  randomMode: string;
}) => {
  const {
    jyConfig,
    readableDuration,
    isOverlaps,
    effect_ids,
    videoTracks,
    isCapCut,
    randomMode,
  } = param;
  try {
    const transitionInfosRes = handleLoadTransitionInfos(null, { isCapCut });
    if (transitionInfosRes.status === "error") {
      return transitionInfosRes;
    }
    const transitionInfos = JSONbig.parse(transitionInfosRes.data);
    const transitionDuration = transformTransitionDuration(readableDuration);
    if (!videoTracks.length) {
      return { status: "error", data: "出现错误，没有视频轨道" };
    }
    const materialsVideos = jyConfig.materials.videos;
    const materialsTransitions = jyConfig.materials.transitions;
    const preExistTransitionIdSet = new Set();
    // @ts-ignore
    materialsTransitions.forEach((materialsTransition) => {
      if (!transitionCreatedByMe(materialsTransition.id)) {
        preExistTransitionIdSet.add(materialsTransition.id);
      }
    });
    let crossTrackAddCount = 0; // 总共添加的转场数量
    let appliedTrackCount = 0; // 总共应用了添加转场的轨道数量
    const positions = []; // 添加的转场的位置
    for (let vNum = 0; vNum < videoTracks.length; vNum++) {
      const videoTrack = videoTracks[vNum];
      // this should not happen
      if (isOverlaps.length !== effect_ids.length) {
        return { status: "error", data: "Strange! Overlap info lacks." };
      }
      const effectTotalCount = effect_ids.length;
      if (effectTotalCount === 0) {
        return { status: "error", data: "至少需要设置一个转场效果。" };
      }
      let addCount = 0;
      let lastTimeEffectIdx = undefined;
      for (let i = 0; i < videoTrack.segments.length - 1; i++) {
        let currentEffectIdx = 0;
        switch (randomMode) {
          case RANDOM_MODE.ORDER:
            // if there are three transition effects A B C, it looks like A B C A B C...
            // currentEffectIdx will be 0, 1, 2, 0, 1, 2...
            currentEffectIdx = addCount % effectTotalCount;
            break;
          case RANDOM_MODE.FLATTEN_RANDOM:
            currentEffectIdx = voteRandomInt(
              effectTotalCount,
              lastTimeEffectIdx
            );
            lastTimeEffectIdx = currentEffectIdx;
            break;
          case RANDOM_MODE.PURE_RANDOM:
            currentEffectIdx = voteRandomInt(effectTotalCount);
            break;
        }
        const curSegment = videoTrack.segments[i];
        const nextSegment = videoTrack.segments[i + 1];
        const extraMaterialRefs = curSegment.extra_material_refs;
        let hasPreExistTransition = false;
        for (let j = 0; j < extraMaterialRefs.length; j++) {
          if (preExistTransitionIdSet.has(extraMaterialRefs[j])) {
            hasPreExistTransition = true;
            break;
          }
        }
        if (hasPreExistTransition) {
          continue;
        }
        if (
          curSegment.target_timerange.duration < transitionDuration * 2 ||
          nextSegment.target_timerange.duration < transitionDuration * 2
        ) {
          continue;
        }
        if (
          nextSegment.target_timerange.start -
            (curSegment.target_timerange.start +
              curSegment.target_timerange.duration) >
          100
        ) {
          continue;
        }
        // extending current materials
        const materialsVideo = materialsVideos.find(
          (video: any) => video.id === curSegment.material_id
        );
        if (!materialsVideo) {
          return {
            status: "error",
            data: "Track exists video but materials does not. Strange.",
          };
        }
        // @ts-ignore
        const nextMaterialsVideo = materialsVideos.find(
          (video: any) => video.id === nextSegment.material_id
        );
        if (!nextMaterialsVideo) {
          return {
            status: "error",
            data: "Track exists video but materials does not. Strange.",
          };
        }
        const addedTransition = generateTransition({
          videoMaterialId: curSegment.material_id,
          transitionDuration,
          videoTrackPosition: vNum,
          segmentPosition: i,
          isOverlap: isOverlaps[currentEffectIdx],
          effect_id: effect_ids[currentEffectIdx],
          transitionInfos,
          isCapCut,
        });
        // materials add transition into transitions array
        materialsTransitions.push(addedTransition);
        // segments add transition id into extra_material_refs array
        curSegment.extra_material_refs.push(addedTransition.id);
        addCount = addCount + 1;
        crossTrackAddCount = crossTrackAddCount + 1;
        positions.push(nextSegment.target_timerange.start);
      }
      appliedTrackCount = appliedTrackCount + 1;
    }
    return {
      status: "success",
      data: {
        appliedTrackCount,
        crossTrackAddCount,
        positions,
      },
    };
  } catch (err) {
    return { status: "error", data: `${err}` };
  }
};

export const handleLoadTransitionInfos = (
  _event: any,
  param: { isCapCut: boolean } // 修改之前 LoadTransitionInfosType
) => {
  const { isCapCut } = param;
  let infosString = "";
  try {
    let infosPathPrimary = "";
    let infosPathSecondary = "";
    const homedir = os.userInfo().homedir;
    if (isCapCut) {
      if (process.platform === "darwin") {
        infosPathPrimary = path.join(
          homedir,
          "Movies/CapCut/User Data/Cache/effect/capcutpc_0_2.0.0_transitions"
        );
        infosPathSecondary = path.join(
          homedir,
          "Movies/CapCut/User Data/Cache/effect/capcutpc_beta_2.0.0_transitions"
        );
      } else if (process.platform === "win32") {
        infosPathPrimary = path.join(
          homedir,
          "AppData\\Local\\CapCut\\User Data\\Cache\\effect\\capcutpc_0_2.0.0_transitions"
        );
        infosPathSecondary = path.join(
          homedir,
          "AppData\\Local\\CapCut\\User Data\\Cache\\effect\\capcutpc_beta_2.0.0_transitions"
        );
      }
    } else {
      if (process.platform === "darwin") {
        infosPathPrimary = path.join(
          homedir,
          "Movies/JianyingPro/User Data/Cache/effect/jianyingpro_0_2.0.0_transitions"
        );
        infosPathSecondary = path.join(
          homedir,
          "Movies/JianyingPro/User Data/Cache/effect/jianyingpro_beta_2.0.0_transitions"
        );
      } else if (process.platform === "win32") {
        infosPathPrimary = path.join(
          homedir,
          "AppData\\Local\\JianyingPro\\User Data\\Cache\\effect\\jianyingpro_0_2.0.0_transitions"
        );
        infosPathSecondary = path.join(
          homedir,
          "AppData\\Local\\JianyingPro\\User Data\\Cache\\effect\\jianyingpro_beta_2.0.0_transitions"
        );
      }
    }
    if (fs.existsSync(infosPathPrimary)) {
      infosString = fs.readFileSync(infosPathPrimary, { encoding: "utf8" });
    } else if (fs.existsSync(infosPathSecondary)) {
      infosString = fs.readFileSync(infosPathSecondary, { encoding: "utf8" });
    } else {
      const transFb = require(`../../../animation-master/${
        isCapCut
          ? "capcut/capcutpc_beta_2.0.0_transitions.json"
          : "jianying/jianyingpro_beta_2.0.0_transitions.json"
      }`);
      infosString = JSONbig.stringify(transFb);
    }
  } catch (e) {
    return {
      status: "error",
      data: `无法加载转场信息，请确保你已经安装了${
        param.isCapCut ? "CapCut" : "剪映"
      }。如果你已经安装而看到此错误信息，可能你的电脑比较特别，请试着把${
        param.isCapCut ? "CapCut" : "剪映"
      }装到C盘默认目录，或者在另一台电脑上安装本软件。`,
    };
  }
  if (infosString.length === 0) {
    return {
      status: "error",
      data: `无法加载转场信息，请确保你已经安装了${
        param.isCapCut ? "CapCut" : "剪映"
      }。如果你已经安装而看到此错误信息，可能你的电脑比较特别，请试着把${
        param.isCapCut ? "CapCut" : "剪映"
      }装到C盘默认目录，或者在另一台电脑上安装本软件。`,
    };
  }
  return { status: "success", data: infosString };
};

const transitionCreatedByMe = (materialTransitionId: string) => {
  return materialTransitionId.endsWith("ABCCBA");
};

const generateTransition = (param: {
  videoMaterialId: string;
  transitionDuration: number;
  videoTrackPosition: number;
  segmentPosition: number;
  isOverlap: boolean;
  effect_id: string;
  transitionInfos: any;
  isCapCut: boolean;
}) => {
  const {
    videoMaterialId,
    transitionDuration,
    videoTrackPosition,
    segmentPosition,
    isOverlap,
    effect_id,
    transitionInfos,
    isCapCut,
  } = param;
  // videoMaterialId looks like "DA1B5A64-5D3C-4202-B28E-44FA703FBDD5"
  const idPrefix = videoMaterialId.substring(0, 24);
  const transitionId = `${idPrefix}${
    videoTrackPosition % 10
  }${packNumToConstDigits(segmentPosition, 4)}0ABCCBA`;
  const effect = transitionInfos.data.effects.find(
    (item: any) => item.effect_id === effect_id
  );
  const category = transitionInfos.data.category.find((item: any) =>
    item.effects.includes(effect_id)
  );
  const homedir = os.userInfo().homedir;
  let transitionPath = "";
  if (process.platform === "darwin") {
    transitionPath = path.join(
      homedir,
      `Movies/${
        isCapCut ? "CapCut" : "JianyingPro"
      }/User Data/Cache/effect/${effect_id}/${effect.file_url.uri}`
    );
  } else if (process.platform === "win32") {
    let winTransitionPath = path.join(
      homedir,
      `AppData\\Local\\${
        isCapCut ? "CapCut" : "JianyingPro"
      }\\User Data\\Cache\\effect\\${effect_id}\\${effect.file_url.uri}`
    );
    transitionPath = winTransitionPath.split(path.sep).join(path.posix.sep);
  }
  return {
    category_id: category.id,
    category_name: category.name,
    duration: transitionDuration,
    effect_id: effect_id,
    id: transitionId,
    is_overlap: isOverlap,
    name: effect.name,
    path: transitionPath,
    platform: "all",
    resource_id: effect.resource_id,
    type: "transition",
  };
};

const packNumToConstDigits = (i: number, length: number) => {
  const iStr = i.toString();
  const iStrLength = iStr.length;
  const moreNeededLength = length - iStrLength;
  let result = "";
  for (let j = 0; j < moreNeededLength; j++) {
    result = result + "0";
  }
  result = result + iStr;
  return result;
};

// 在modify之前先recover，把本软件添加的转场给移除掉，这样用户可以反复试验随机模式
const recoverTrack = (param: { jyConfig: any; videoTracks: any[] }) => {
  try {
    const { jyConfig, videoTracks } = param;
    for (let vNum = 0; vNum < videoTracks.length; vNum++) {
      const videoTrack = videoTracks[vNum];
      const materialsTransitions = jyConfig.materials.transitions;
      for (let i = 0; i < videoTrack.segments.length - 1; i++) {
        const curSegment = videoTrack.segments[i];
        // const nextSegment = videoTrack.segments[i + 1];
        const extraMaterialRefs = curSegment.extra_material_refs;
        // @ts-ignore
        const myMaterialsTransitionId = extraMaterialRefs.find((id) =>
          transitionCreatedByMe(id)
        );
        if (myMaterialsTransitionId === undefined) {
          // means that there is no transition by me at the end of this segment. continue for next round.
          continue;
        }
        // @ts-ignore
        const myMaterialTransition = materialsTransitions.find(
          (transition: any) => transition.id === myMaterialsTransitionId
        );
        if (myMaterialTransition === undefined) {
          return {
            status: "error",
            data: `Recover: This should not happen, containing extraMaterialRef but no material transition, id:${myMaterialsTransitionId}`,
          };
        }
        remove(
          curSegment.extra_material_refs,
          (id: any) => id === myMaterialsTransitionId
        );
        remove(
          jyConfig.materials.transitions,
          (element: any) => element.id === myMaterialsTransitionId
        );
      }
    }
    return {
      status: "success",
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `Recover: ${e?.message || e}` };
  }
};

export const handleGetIsTransitionExist = (
  _event: any,
  param: GetIsTransitionExistType
) => {
  try {
    const { isCapCut } = param;
    const homedir = os.userInfo().homedir;
    const parts = param.effectIU.split("#");
    const effect_id = parts[0];
    const effect_file_uri = parts[1];
    if (process.platform === "darwin") {
      if (
        fs.existsSync(
          path.join(
            homedir,
            `Movies/${
              isCapCut ? "CapCut" : "JianyingPro"
            }/User Data/Cache/effect/${effect_id}/${effect_file_uri}`
          )
        )
      ) {
        return {
          status: "success",
          data: "true",
        };
      } else {
        return {
          status: "success",
          data: "false",
        };
      }
    } else if (process.platform === "win32") {
      if (
        fs.existsSync(
          path.join(
            homedir,
            `AppData\\Local\\${
              isCapCut ? "CapCut" : "JianyingPro"
            }\\User Data\\Cache\\effect\\${effect_id}\\${effect_file_uri}`
          )
        )
      ) {
        return {
          status: "success",
          data: "true",
        };
      } else {
        return {
          status: "success",
          data: "false",
        };
      }
    }
  } catch (e) {
    return { status: "error", data: "false" };
  }
};

const transformTransitionDuration = (readableDuration: number) => {
  const tenTimes = Math.round(readableDuration * 10);
  const residual = tenTimes % 2;
  if (residual === 0) {
    return Math.round(readableDuration * 1000000);
  } else {
    return Math.round(readableDuration * 1000000 - 33334);
  }
};

const generateId = (property: string, idx: number, oldSegId: string) => {
  const rotateChar = (a: string) => {
    switch (a) {
      case "0":
        return "1";
      case "1":
        return "2";
      case "2":
        return "3";
      case "3":
        return "4";
      case "4":
        return "5";
      case "5":
        return "6";
      case "6":
        return "7";
      case "7":
        return "8";
      case "8":
        return "9";
      case "9":
        return "A";
      case "A":
        return "B";
      case "B":
        return "C";
      case "C":
        return "D";
      case "D":
        return "E";
      case "E":
        return "F";
      case "F":
        return "0";
    }
  };
  const COMMON_PREFIX = oldSegId.substring(0, 17);
  const BEFORE_ROTATE_CHAR = oldSegId.substring(17, 18);
  const ROTATED_CHAR = rotateChar(BEFORE_ROTATE_CHAR);
  const ALL_PROPERTY_PREFIX = `${COMMON_PREFIX}${ROTATED_CHAR}-`;
  let mid = "";
  if (property === "materials.audio_fades") {
    mid = `0A01-`;
  }
  if (property === "materials.audios") {
    mid = `0A02-`;
  }
  if (property === "materials.beats") {
    mid = `0A03-`;
  }
  if (property === "materials.sound_channel_mappings") {
    mid = `0A04-`;
  }
  if (property === "materials.speeds") {
    mid = `0A05-`;
  }
  if (property === "materials.vocal_separations") {
    mid = "0A06-";
  }
  if (property === "segments") {
    mid = `00B0-`;
  }
  const suffix = packNumToConstDigits(idx, 12);
  return `${ALL_PROPERTY_PREFIX}${mid}${suffix}`;
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

export const handleAddTransitionsForReplacement = async (
  param: AddTransitionsParamType,
  jyConfig: any
) => {
  try {
    const {
      isCapCut,
      readableDuration,
      effectIdWithFileUris,
      isMainTrackOnly,
      randomMode,
      soundMode,
    } = param;
    if (effectIdWithFileUris.length === 0) {
      return {
        status: "success",
      };
    }
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    let videoTracks = [];
    if (isMainTrackOnly) {
      videoTracks = filter(tracks, {
        type: "video",
      });
      if (videoTracks.length === 0) {
        return { status: "error", data: "没有视频主轨道" };
      }
      videoTracks = [videoTracks[0]];
    } else {
      videoTracks = tracks.filter(
        (track: any) => track.type === "video" && !isLocked(track)
      );
      if (videoTracks.length === 0) {
        return {
          status: "error",
          data: "没有任何非锁定的视频轨道",
        };
      }
    }
    if (effectIdWithFileUris.length === 0) {
      return { status: "error", data: "至少需要设置一个转场效果。" };
    }
    if (
      randomMode === RANDOM_MODE.FLATTEN_RANDOM &&
      effectIdWithFileUris.length < 2
    ) {
      return {
        status: "error",
        data: `由于你设置了均匀随机模式，所以你必须至少添加2种转场效果，否则无法保证相邻不重复，而当前你只添加了${effectIdWithFileUris.length}种。`,
      };
    }
    const infoRes = getIsOverlapsOfEffectIds(effectIdWithFileUris, isCapCut);
    if (infoRes.status === "error") {
      return infoRes;
    }
    const { isOverlaps, effect_ids } = infoRes.data as {
      isOverlaps: boolean[];
      effect_ids: string[];
    };
    const recoverRes = recoverTrack({ jyConfig, videoTracks });
    if (recoverRes.status === "error") {
      return recoverRes;
    }
    const res = modifyTracks({
      jyConfig,
      readableDuration,
      isOverlaps,
      effect_ids,
      videoTracks,
      isCapCut,
      randomMode,
    });
    if (res.status === "error") {
      return res;
    }
    if (soundMode === SOUND_MODE.YES_SOUND) {
      // @ts-ignore
      copySoundEffects(jyConfig, res.data.positions, POSITION_ATTRIBUTE.MID);
    }
    return {
      status: "success",
    };
  } catch (e) {
    return { status: "error", data: "false" };
  }
};
