import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { cloneDeep, filter, remove } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { voteRandomInt } from "../../utils/randomUtils";
import {
  copySoundEffects,
  POSITION_ATTRIBUTE,
} from "../../utils/copySoundEffects";
import { isLocked } from "../../utils/replaceUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");

const RANDOM_MODE = {
  ORDER: "ORDER",
  FLATTEN_RANDOM: "FLATTEN_RANDOM",
  PURE_RANDOM: "PURE_RANDOM",
};

const SOUND_MODE = {
  NO_SOUND: "NO_SOUND",
  YES_SOUND: "YES_SOUND",
};

const EFFECT_TYPE_KEY = {
  IN: "in",
  OUT: "out",
  GROUP: "group",
};

import {AddInOutCombosParamType} from "../../utils/types";

export const handleAddInOutCombos = async (
  _event: any,
  param: AddInOutCombosParamType,
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
      effects,
      effectTypeKey,
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
    if (effects.length === 0) {
      return { status: "error", data: "至少需要设置一个动画效果。" };
    }
    if (randomMode === RANDOM_MODE.FLATTEN_RANDOM && effects.length < 2) {
      return {
        status: "error",
        data: `由于你设置了均匀随机模式，所以你必须至少添加2种动画效果，否则无法保证相邻不重复，而当前你只添加了${effects.length}种。`,
      };
    }
    const res = modifyTracks({
      jyConfig,
      readableDuration,
      effects,
      effectTypeKey,
      videoTracks,
      isCapCut,
      randomMode,
    });
    if (res.status === "error") {
      return res;
    }
    if (soundMode === SOUND_MODE.YES_SOUND) {
      const positionAttribute =
        effectTypeKey === EFFECT_TYPE_KEY.IN
          ? POSITION_ATTRIBUTE.START
          : effectTypeKey === EFFECT_TYPE_KEY.OUT
          ? POSITION_ATTRIBUTE.END
          : POSITION_ATTRIBUTE.MID;
      // @ts-ignore
      copySoundEffects(jyConfig, res.data.positions, positionAttribute);
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

type EffectType = {
  effect_id: string;
  file_url: {
    uri: string;
  };
  resource_id: string;
  name:string,
};


const modifyTracks = (param: {
  jyConfig: any;
  readableDuration: number;
  effects: EffectType[];
  effectTypeKey: string;
  videoTracks: any[];
  isCapCut: boolean;
  randomMode: string;
}) => {
  const {
    jyConfig,
    readableDuration,
    effects,
    effectTypeKey,
    videoTracks,
    isCapCut,
    randomMode,
  } = param;
  try {
    const inOutComboDuration = transformInOutComboDuration(readableDuration);
    if (!videoTracks.length) {
      return { status: "error", data: "出现错误，没有视频轨道" };
    }
    let crossTrackAddCount = 0; // 总共添加的动画数量
    let appliedTrackCount = 0; // 总共应用了添加动画的轨道数量
    const positions = []; // 添加的动画的位置
    for (let vNum = 0; vNum < videoTracks.length; vNum++) {
      const videoTrack = videoTracks[vNum];
      const effectTotalCount = effects.length;
      if (effectTotalCount === 0) {
        return { status: "error", data: "至少需要设置一个动画效果。" };
      }
      let addCount = 0;
      let lastTimeEffectIdx = undefined;
      for (let i = 0; i < videoTrack.segments.length; i++) {
        const curSegment = videoTrack.segments[i];
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
        const extraMaterialRefs = curSegment.extra_material_refs;
        const materialsAnimations = jyConfig.materials.material_animations;
        // @ts-ignore
        const myMaterialsId = extraMaterialRefs.find((id) => {
          const animation = materialsAnimations.find(
            (item: any) => item.id === id
          );
          return animation !== undefined;
        });
        let animationObj;
        if (myMaterialsId === undefined) {
          // id looks like "DA1B5A64-5D3C-4202-B28E-44FA703FBDD5"
          const idPrefix = curSegment.material_id.substring(0, 24);
          const animationId = `${idPrefix}${vNum % 10}${packNumToConstDigits(
            i,
            4
          )}0DDDCBA`;
          animationObj = {
            animations: [],
            id: animationId,
            type: "sticker_animation",
          };
          materialsAnimations.push(animationObj);
          extraMaterialRefs.push(animationId);
        } else {
          animationObj = materialsAnimations.find(
            (item: any) => item.id === myMaterialsId
          );
        }
        if (!Array.isArray(animationObj.animations)) {
          animationObj.animations = [];
        }
        const curEffect = effects[currentEffectIdx];
        remove(
          animationObj.animations,
          (element: any) => element.type === effectTypeKey
        );
        const segDuration = curSegment.target_timerange.duration;
        animationObj.animations.push(
          generateSpecificAnimation({
            effect: curEffect,
            effectTypeKey,
            inOutComboDuration,
            segDuration,
            animationObj,
            isCapCut,
          })
        );
        addCount = addCount + 1;
        crossTrackAddCount = crossTrackAddCount + 1;
        let curPosition = 0;
        switch (effectTypeKey) {
          case EFFECT_TYPE_KEY.IN:
            curPosition = curSegment.target_timerange.start;
            break;
          case EFFECT_TYPE_KEY.OUT:
            curPosition =
              curSegment.target_timerange.start +
              curSegment.target_timerange.duration;
            break;
          case EFFECT_TYPE_KEY.GROUP:
            curPosition =
              curSegment.target_timerange.start +
              0.5 * curSegment.target_timerange.duration;
        }
        positions.push(curPosition);
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


import {LoadInOutComboInfosType} from "../../utils/types";

export const handleLoadInOutComboInfos = (
  _event: any,
  param: LoadInOutComboInfosType
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
          "Movies/CapCut/User Data/Cache/effect/capcutpc_0_2.0.0_video"
        );
        infosPathSecondary = path.join(
          homedir,
          "Movies/CapCut/User Data/Cache/effect/capcutpc_beta_2.0.0_video"
        );
      } else if (process.platform === "win32") {
        infosPathPrimary = path.join(
          homedir,
          "AppData\\Local\\CapCut\\User Data\\Cache\\effect\\capcutpc_0_2.0.0_video"
        );
        infosPathSecondary = path.join(
          homedir,
          "AppData\\Local\\CapCut\\User Data\\Cache\\effect\\capcutpc_beta_2.0.0_video"
        );
      }
    } else {
      if (process.platform === "darwin") {
        infosPathPrimary = path.join(
          homedir,
          "Movies/JianyingPro/User Data/Cache/effect/jianyingpro_0_2.0.0_video"
        );
        infosPathSecondary = path.join(
          homedir,
          "Movies/JianyingPro/User Data/Cache/effect/jianyingpro_beta_2.0.0_video"
        );
      } else if (process.platform === "win32") {
        infosPathPrimary = path.join(
          homedir,
          "AppData\\Local\\JianyingPro\\User Data\\Cache\\effect\\jianyingpro_0_2.0.0_video"
        );
        infosPathSecondary = path.join(
          homedir,
          "AppData\\Local\\JianyingPro\\User Data\\Cache\\effect\\jianyingpro_beta_2.0.0_video"
        );
      }
    }
    if (fs.existsSync(infosPathPrimary)) {
      infosString = fs.readFileSync(infosPathPrimary, { encoding: "utf8" });
    } else if (fs.existsSync(infosPathSecondary)) {
      infosString = fs.readFileSync(infosPathSecondary, { encoding: "utf8" });
    } else {
      const infos = require(`../../../animation-master/${
        isCapCut
          ? "capcut/capcutpc_beta_2.0.0_video.json"
          : "jianying/jianyingpro_beta_2.0.0_video.json"
      }`);
      infosString = JSONbig.stringify(infos);
    }
  } catch (e) {
    return {
      status: "error",
      data: `无法加载出入场组合动画信息，请确保你已经安装了${
        param.isCapCut ? "CapCut" : "剪映"
      }。如果你已经安装而看到此错误信息，可能你的电脑比较特别，请试着把${
        param.isCapCut ? "CapCut" : "剪映"
      }装到C盘默认目录，或者在另一台电脑上安装本软件。`,
    };
  }
  if (infosString.length === 0) {
    return {
      status: "error",
      data: `无法加载出入场组合动画信息，请确保你已经安装了${
        param.isCapCut ? "CapCut" : "剪映"
      }。如果你已经安装而看到此错误信息，可能你的电脑比较特别，请试着把${
        param.isCapCut ? "CapCut" : "剪映"
      }装到C盘默认目录，或者在另一台电脑上安装本软件。`,
    };
  }
  return { status: "success", data: infosString };
};

const generateSpecificAnimation = (param: {
  effect: EffectType;
  effectTypeKey: string;
  inOutComboDuration: number;
  segDuration: number;
  animationObj: any;
  isCapCut: boolean;
}) => {
  const {
    effect,
    effectTypeKey,
    inOutComboDuration,
    segDuration,
    animationObj,
    isCapCut,
  } = param;
  let category_name;
  if (isCapCut) {
    category_name =
      effectTypeKey === EFFECT_TYPE_KEY.IN
        ? "In"
        : effectTypeKey === EFFECT_TYPE_KEY.OUT
        ? "Out"
        : "Combo";
  } else {
    category_name =
      effectTypeKey === EFFECT_TYPE_KEY.IN
        ? "入场"
        : effectTypeKey === EFFECT_TYPE_KEY.OUT
        ? "出场"
        : "组合";
  }
  let start = 0;
  if (effectTypeKey === EFFECT_TYPE_KEY.IN) {
    start = 0;
  } else if (effectTypeKey === EFFECT_TYPE_KEY.OUT) {
    start = segDuration - inOutComboDuration;
  }
  // group的情况的start值在下方求duration时求取，之所以group要求取duration是因为要防止与in和out的重叠。
  let duration = 0;
  if (effectTypeKey === EFFECT_TYPE_KEY.GROUP) {
    const inItem = animationObj.animations.find(
      (item: any) => item.type === "in"
    );
    const outItem = animationObj.animations.find(
      (item: any) => item.type === "out"
    );
    const groupStartPoint =
      inItem === undefined ? 0 : inItem.start + inItem.duration; // inItem.start应该是0，以防万一
    const groupEndPoint = outItem === undefined ? segDuration : outItem.start;
    start = Math.min(groupStartPoint, segDuration);
    duration = Math.max(groupEndPoint - groupStartPoint, 0); // 重要，因为出入场的添加可能是由本软件添加，所以不规范，导致duration为负，需要至少0
  } else {
    duration = Math.min(inOutComboDuration, segDuration);
  }

  const homedir = os.userInfo().homedir;
  let effectPath = "";
  if (process.platform === "darwin") {
    effectPath = path.join(
      homedir,
      `Movies/${isCapCut ? "CapCut" : "JianyingPro"}/User Data/Cache/effect/${
        effect.effect_id
      }/${effect.file_url.uri}`
    );
  } else if (process.platform === "win32") {
    let winEffectPath = path.join(
      homedir,
      `AppData\\Local\\${
        isCapCut ? "CapCut" : "JianyingPro"
      }\\User Data\\Cache\\effect\\${effect.effect_id}\\${effect.file_url.uri}`
    );
    effectPath = winEffectPath.split(path.sep).join(path.posix.sep);
  }
  return {
    anim_adjust_params: null,
    category_id: effectTypeKey,
    category_name,
    duration,
    id: effect.effect_id,
    material_type: "video",
    name: effect.name,
    path: effectPath,
    platform: "all",
    request_id: "",
    resource_id: effect.resource_id,
    start,
    type: effectTypeKey,
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

import {GetIsInOutComboExistType} from "../../utils/types";

export const handleGetIsInOutComboExist = (
  _event: any,
  param: GetIsInOutComboExistType
) => {
  try {
    const { isCapCut } = param;
    const homedir = os.userInfo().homedir;
    const effect_id = param.effect.effect_id;
    const effect_file_uri = param.effect.file_url.uri;
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

const transformInOutComboDuration = (readableDuration: number) => {
  return Math.round(readableDuration * 1000000);
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
