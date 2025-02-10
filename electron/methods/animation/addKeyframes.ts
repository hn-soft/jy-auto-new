import * as fs from "fs";
import { cloneDeep, filter } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { voteRandomInt } from "../../utils/randomUtils";
import { genRandom4DigitHexStr } from "../../utils/animationUtils";
import { isLocked } from "../../utils/replaceUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");

const KEYFRAME_TYPES = {
  LEFT_TO_RIGHT: {
    key: "LEFT_TO_RIGHT",
    name: "从左向右",
  },
  RIGHT_TO_LEFT: {
    key: "RIGHT_TO_LEFT",
    name: "从右向左",
  },
  UPPER_TO_BOTTOM: {
    key: "UPPER_TO_BOTTOM",
    name: "从上向下",
  },
  BOTTOM_TO_UPPER: {
    key: "BOTTOM_TO_UPPER",
    name: "从下向上",
  },
  UPPER_LEFT_TO_BOTTOM_RIGHT: {
    key: "UPPER_LEFT_TO_BOTTOM_RIGHT",
    name: "从左上到右下",
  },
  BOTTOM_LEFT_TO_UPPER_RIGHT: {
    key: "BOTTOM_LEFT_TO_UPPER_RIGHT",
    name: "从左下到右上",
  },
  UPPER_RIGHT_TO_BOTTOM_LEFT: {
    key: "UPPER_RIGHT_TO_BOTTOM_LEFT",
    name: "从右上到左下",
  },
  BOTTOM_RIGHT_TO_UPPER_LEFT: {
    key: "BOTTOM_RIGHT_TO_UPPER_LEFT",
    name: "从右下向左上",
  },
  ZOOM_IN: {
    key: "ZOOM_IN",
    name: "放大",
  },
  ZOOM_OUT: {
    key: "ZOOM_OUT",
    name: "缩小"
  },
  ZOOM_IN_SLIGHT: {
    key: "ZOOM_IN_SLIGHT",
    name: "轻微放大",
  },
  ZOOM_OUT_SLIGHT: {
    key: "ZOOM_OUT_SLIGHT",
    name: "轻微缩小",
  },
  ZOOM_IN_SEVERE: {
    key: "ZOOM_IN_SEVERE",
    name: "剧烈放大",
  },
  ZOOM_OUT_SEVERE: {
    key: "ZOOM_OUT_SEVERE",
    name: "剧烈缩小",
  },
};

const ASPECT_RATIO = {
  LANDSCAPE: 'LANDSCAPE',
  PORTRAIT: 'PORTRAIT',
}

const RANDOM_MODE = {
  ORDER: "ORDER",
  FLATTEN_RANDOM: "FLATTEN_RANDOM",
  PURE_RANDOM: "PURE_RANDOM",
};
import type { AddKeyframesParamType } from "../../utils/types";

export const handleAddKeyframes = async (
  _event: any,
  param: AddKeyframesParamType,
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
      keyframes,
      aspectRatio,
      isMainTrackOnly,
      randomMode,
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
    if (keyframes.length === 0) {
      return { status: "error", data: "至少需要设置一个动画效果。" };
    }
    if (randomMode === RANDOM_MODE.FLATTEN_RANDOM && keyframes.length < 2) {
      return {
        status: "error",
        data: `由于你设置了均匀随机模式，所以你必须至少添加2种动画效果，否则无法保证相邻不重复，而当前你只添加了${keyframes.length}种。`,
      };
    }
    const res = modifyTracks({
      jyConfig,
      keyframes,
      aspectRatio,
      videoTracks,
      isCapCut,
      randomMode,
    });
    if (res.status === "error") {
      return res;
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

const modifyTracks = (param: {
  jyConfig: any;
  keyframes: string[];
  aspectRatio: string;
  videoTracks: any[];
  isCapCut: boolean;
  randomMode: string;
}) => {
  const {
    jyConfig,
    keyframes,
    aspectRatio,
    videoTracks,
    isCapCut,
    randomMode,
  } = param;
  try {
    if (!videoTracks.length) {
      return { status: "error", data: "出现错误，没有视频轨道" };
    }
    let crossTrackAddCount = 0; // 总共添加的动画数量
    let appliedTrackCount = 0; // 总共应用了添加动画的轨道数量
    for (let vNum = 0; vNum < videoTracks.length; vNum++) {
      const videoTrack = videoTracks[vNum];
      const effectTotalCount = keyframes.length;
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
          )}0EEECBA`;
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
        const curEffect = keyframes[currentEffectIdx];
        generateSpecificKeyframe({
          effect: curEffect,
          seg: curSegment,
          aspectRatio,
        });
          //todo: actually add keyframes here
        addCount = addCount + 1;
        crossTrackAddCount = crossTrackAddCount + 1;
      }
      appliedTrackCount = appliedTrackCount + 1;
    }
    return {
      status: "success",
      data: {
        appliedTrackCount,
        crossTrackAddCount,
      },
    };
  } catch (err) {
    return { status: "error", data: `${err}` };
  }
};

const generateSpecificKeyframe = (param: {
  effect: string,
  aspectRatio: string;
  seg: any,
}) => {
  const { effect, aspectRatio, seg } = param;
  if (aspectRatio === ASPECT_RATIO.LANDSCAPE) {
    switch (effect) {
      case KEYFRAME_TYPES.LEFT_TO_RIGHT.key:
        seg.clip.scale = { x: 1.1, y: 1.1 };
        seg.clip.transform = { x: -0.1, y: 0 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.1, xEnd: -0.1, yStart: 0, yEnd: 0 });
        break;
      case KEYFRAME_TYPES.RIGHT_TO_LEFT.key:
        seg.clip.scale = { x: 1.1, y: 1.1 };
        seg.clip.transform = { x: 0.1, y: 0 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.1, xEnd: 0.1, yStart: 0, yEnd: 0 });
        break;
      case KEYFRAME_TYPES.UPPER_TO_BOTTOM.key:
        seg.clip.scale = { x: 1.3, y: 1.3 };
        seg.clip.transform = { x: 0, y: 0.3 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0, xEnd: 0, yStart: -0.3, yEnd: 0.3 });
        break;
      case KEYFRAME_TYPES.BOTTOM_TO_UPPER.key:
        seg.clip.scale = { x: 1.3, y: 1.3 };
        seg.clip.transform = { x: 0, y: -0.3 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0, xEnd: 0, yStart: 0.3, yEnd: -0.3 });
        break;
      case KEYFRAME_TYPES.UPPER_LEFT_TO_BOTTOM_RIGHT.key:
        seg.clip.scale = { x: -1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: 0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.2, xEnd: -0.2, yStart: -0.2, yEnd: 0.2 });
        break;
      case KEYFRAME_TYPES.BOTTOM_LEFT_TO_UPPER_RIGHT.key:
        seg.clip.scale = { x: -1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: -0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.2, xEnd: -0.2, yStart: 0.2, yEnd: -0.2 });
        break;
      case KEYFRAME_TYPES.UPPER_RIGHT_TO_BOTTOM_LEFT.key:
        seg.clip.scale = { x: 1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: 0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.2, xEnd: 0.2, yStart: -0.2, yEnd: 0.2 });
        break;
      case KEYFRAME_TYPES.BOTTOM_RIGHT_TO_UPPER_LEFT.key:
        seg.clip.scale = { x: 1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: -0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.2, xEnd: 0.2, yStart: 0.2, yEnd: -0.2 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN.key:
        seg.clip.scale = { x: 1.3, y: 1.3 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.3 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.3, scaleEnd: 1 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN_SLIGHT.key:
        seg.clip.scale = { x: 1.1, y: 1.1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.1 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT_SLIGHT.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.1, scaleEnd: 1 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN_SEVERE.key:
        seg.clip.scale = { x: 1.6, y: 1.6 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.6 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT_SEVERE.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.6, scaleEnd: 1 });
        break;
    }
  } else if (aspectRatio === ASPECT_RATIO.PORTRAIT) {
    switch (effect) {
      case KEYFRAME_TYPES.LEFT_TO_RIGHT.key:
        seg.clip.scale = { x: 1.3, y: 1.3 };
        seg.clip.transform = { x: -0.3, y: 0 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.3, xEnd: -0.3, yStart: 0, yEnd: 0 });
        break;
      case KEYFRAME_TYPES.RIGHT_TO_LEFT.key:
        seg.clip.scale = { x: 1.3, y: 1.3 };
        seg.clip.transform = { x: 0.3, y: 0 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.3, xEnd: 0.3, yStart: 0, yEnd: 0 });
        break;
      case KEYFRAME_TYPES.UPPER_TO_BOTTOM.key:
        seg.clip.scale = { x: 1.1, y: 1.1 };
        seg.clip.transform = { x: 0, y: 0.1 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0, xEnd: 0, yStart: -0.1, yEnd: 0.1 });
        break;
      case KEYFRAME_TYPES.BOTTOM_TO_UPPER.key:
        seg.clip.scale = { x: 1.1, y: 1.1 };
        seg.clip.transform = { x: 0, y: -0.1 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0, xEnd: 0, yStart: 0.1, yEnd: -0.1 });
        break;
      case KEYFRAME_TYPES.UPPER_LEFT_TO_BOTTOM_RIGHT.key:
        seg.clip.scale = { x: -1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: 0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.2, xEnd: -0.2, yStart: -0.2, yEnd: 0.2 });
        break;
      case KEYFRAME_TYPES.BOTTOM_LEFT_TO_UPPER_RIGHT.key:
        seg.clip.scale = { x: -1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: -0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: 0.2, xEnd: -0.2, yStart: 0.2, yEnd: -0.2 });
        break;
      case KEYFRAME_TYPES.UPPER_RIGHT_TO_BOTTOM_LEFT.key:
        seg.clip.scale = { x: 1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: 0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.2, xEnd: 0.2, yStart: -0.2, yEnd: 0.2 });
        break;
      case KEYFRAME_TYPES.BOTTOM_RIGHT_TO_UPPER_LEFT.key:
        seg.clip.scale = { x: 1.2, y: 1.2 };
        seg.clip.transform = { x: 0.2, y: -0.2 };
        seg.common_keyframes = genPositionKeyFrames(seg, { xStart: -0.2, xEnd: 0.2, yStart: 0.2, yEnd: -0.2 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN.key:
        seg.clip.scale = { x: 1.3, y: 1.3 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.3 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.3, scaleEnd: 1 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN_SLIGHT.key:
        seg.clip.scale = { x: 1.1, y: 1.1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.1 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT_SLIGHT.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.1, scaleEnd: 1 });
        break;
      case KEYFRAME_TYPES.ZOOM_IN_SEVERE.key:
        seg.clip.scale = { x: 1.6, y: 1.6 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1, scaleEnd: 1.6 });
        break;
      case KEYFRAME_TYPES.ZOOM_OUT_SEVERE.key:
        seg.clip.scale = { x: 1, y: 1 }
        seg.clip.transform = { x: 0, y: 0 }
        seg.common_keyframes = genScaleKeyFrames(seg, { scaleStart: 1.6, scaleEnd: 1 });
        break;
    }    
  }
}

const genKeyframeRandomId = (baseId: string) => {
  return `${baseId.substring(0, 8)}-${genRandom4DigitHexStr()}-${genRandom4DigitHexStr()}-${genRandom4DigitHexStr()}-000000EEECBA`;
}

const genPositionKeyFrames = (seg: any, param: { xStart: number, xEnd: number, yStart: number, yEnd: number }) => {
  const { xStart, xEnd, yStart, yEnd } = param;
  const sourceStart = seg.source_timerange.start;
  const sourceDuration = seg.source_timerange.duration;
  return [
    {
      "id": genKeyframeRandomId(seg.id),
      "keyframe_list": [
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart,
          "values": [xStart]
        },
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart + sourceDuration,
          "values": [xEnd]
        }
      ],
      "material_id": "",
      "property_type": "KFTypePositionX"
    },
    {
      "id": genKeyframeRandomId(seg.id),
      "keyframe_list": [
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart,
          "values": [yStart]
        },
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart + sourceDuration,
          "values": [yEnd]
        }
      ],
      "material_id": "",
      "property_type": "KFTypePositionY"
    }
  ];
}

const genScaleKeyFrames = (seg: any, param: { scaleStart: number, scaleEnd: number }) => {
  const { scaleStart, scaleEnd } = param;
  const sourceStart = seg.source_timerange.start;
  const sourceDuration = seg.source_timerange.duration;
  return [
    {
      "id": genKeyframeRandomId(seg.id),
      "keyframe_list": [
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart,
          "values": [scaleStart]
        },
        {
          "curveType": "Line",
          "graphID": "",
          "id": genKeyframeRandomId(seg.id),
          "left_control": { "x": 0.0, "y": 0.0 },
          "right_control": { "x": 0.0, "y": 0.0 },
          "time_offset": sourceStart + sourceDuration,
          "values": [scaleEnd]
        }
      ],
      "material_id": "",
      "property_type": "KFTypeScaleX"
    }
  ];
}

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
