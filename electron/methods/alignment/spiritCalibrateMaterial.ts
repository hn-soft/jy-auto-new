import * as fs from "fs";
import { cloneDeep, filter, remove } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { SpiritCalibrateMaterialParamType } from "../../utils/types";

export const handleSpiritCalibrateMaterial = async (
  _event: any,
  param: SpiritCalibrateMaterialParamType,
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
    const audioTracks = filter(tracks, {
      type: "audio",
      attribute: 0,
    });
    if (audioTracks.length === 0) {
      return { status: "error", data: "没有任何非静音非锁定的音频轨道" };
    }
    let combinedAudioSegs: any = [];
    audioTracks.forEach((track) => {
      const segments = track.segments;
      if (!Array.isArray(segments)) {
        return { status: "error", data: "Segments does not exist" };
      }
      combinedAudioSegs = combinedAudioSegs.concat(segments);
    });
    if (combinedAudioSegs.length === 0) {
      return { status: "error", data: "没有任何音频片段" };
    }
    if (activationStatus.status === "trial" && combinedAudioSegs.length > 30) {
      return {
        status: "error",
        data: `发现草稿里共有${combinedAudioSegs.length}段音频需要对齐，超过了试用版不大于30段的限制（正式版无此上限限制）。请你留下不超过30组需要对齐的语音和字幕，将超出数量的删除，关闭剪映草稿后，再回本软件重试。请注意删除后留下的字幕和音频数应该相同，不要一不小心误删到数量不匹配。如果您试用满意的话，恳请点击左侧的"激活软件"激活正式版~正式版可以匹配无限多段。`,
      };
    }
    const textTracks = filter(tracks, {
      type: "text",
      attribute: 0,
    });
    if (textTracks.length === 0) {
      return { status: "error", data: "没有任何非隐藏非锁定的文字轨道" };
    }
    textTracks.sort((a, b) => b.segments.length - a.segments.length);
    const textTrack = textTracks[0];
    if (textTrack.segments.length === 0) {
      return { status: "error", data: "没有任何字幕片段" };
    }
    if (activationStatus.status === "trial" && textTrack.segments.length > 30) {
      return {
        status: "error",
        data: `发现草稿里共有${combinedAudioSegs.length}段字幕需要对齐，超过了试用版不大于30段的限制（正式版无此上限限制）。请你留下不超过30组需要对齐的语音和字幕，将超出数量的删除，关闭剪映草稿后，再回本软件重试。请注意删除后留下的字幕和音频数应该相同，不要一不小心误删到数量不匹配。如果您试用满意的话，恳请点击左侧的"激活软件"激活正式版~正式版可以匹配无限多段。`,
      };
    }
    const changedTexts: string[] = [];
    const overlappedTexts: string[] = [];
    for (let i = 0; i < textTrack.segments.length; i++) {
      const textSeg = textTrack.segments[i];
      const matchAIAudioRes = matchAIAudio(
        textSeg,
        combinedAudioSegs,
        jyConfig,
        changedTexts
      );
      if (matchAIAudioRes.status === "success") {
        continue;
      }
      const matchLeftAlignedAudioRes = matchLeftAlignedAudio(
        textSeg,
        combinedAudioSegs,
        jyConfig,
        changedTexts
      );
      if (matchLeftAlignedAudioRes.status === "success") {
        continue;
      }
      const matchNearAudioRes = matchNearAudio(
        textSeg,
        combinedAudioSegs,
        jyConfig,
        changedTexts
      );
      if (matchNearAudioRes.status === "success") {
        continue;
      }
      const matchSameIndexAudioRes = matchSameIndexAudio(
        textSeg,
        combinedAudioSegs,
        jyConfig,
        textTrack.segments.length,
        i,
        changedTexts
      );
      if (matchSameIndexAudioRes.status === "success") {
        continue;
      }
    }
    for (let i = 0; i < textTrack.segments.length; i++) {
      const textSeg = textTrack.segments[i];
      if (doesSegOverlapAnyInTrack(textSeg, textTrack)) {
        overlappedTexts.push(extractSegPureContent(textSeg, jyConfig));
      }
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    flushVideoTotalDuration(jyConfig);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(param.infoPath, resultStr, "utf8");
    return {
      status: "success",
      data: JSON.stringify({
        changedTexts: changedTexts,
        overlappedTexts: overlappedTexts,
      }),
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const matchAIAudio = (
  textSeg: any,
  audioSegs: any,
  jyConfig: any,
  changedTexts: string[]
) => {
  const allTextMaterials = jyConfig.materials.texts;
  const textMaterial = allTextMaterials.find(
    (item: any) => item.id === textSeg.material_id
  );
  if (textMaterial === undefined) {
    return { status: "error" };
  }
  if (
    !Array.isArray(textMaterial.text_to_audio_ids) ||
    textMaterial.text_to_audio_ids.length === 0
  ) {
    return { status: "error" };
  }
  const audioId = textMaterial.text_to_audio_ids[0];
  const audioSeg = audioSegs.find((item: any) => {
    return item.id === audioId;
  });
  if (audioSeg === undefined) {
    return { status: "error" };
  }
  calibrateSingle(textSeg, audioSeg, jyConfig, changedTexts);
  return { status: "success" };
};

const matchLeftAlignedAudio = (
  textSeg: any,
  audioSegs: any,
  jyConfig: any,
  changedTexts: string[],
) => {
  const textStart = textSeg.target_timerange.start;
  const audioSeg = audioSegs.find((item: any) => {
    const audioStart = item.target_timerange.start;
    return Math.abs(textStart - audioStart) < 10;
  });
  if (audioSeg === undefined) {
    return { status: "error" };
  }
  calibrateSingle(textSeg, audioSeg, jyConfig, changedTexts);
  return { status: "success" };
};

const matchNearAudio = (
  textSeg: any,
  audioSegs: any,
  jyConfig: any,
  changedTexts: string[],
) => {
  const textStart = textSeg.target_timerange.start;
  const textEnd =
    textSeg.target_timerange.start + textSeg.target_timerange.duration;
  const textMid = (textStart + textEnd) / 2;
  const audioSeg = audioSegs.find((item: any) => {
    const audioStart = item.target_timerange.start;
    const audioEnd =
      item.target_timerange.start + item.target_timerange.duration;
    const audioMid = (audioStart + audioEnd) / 2;
    return (
      audioStart < textMid &&
      textMid < audioEnd &&
      textStart < audioMid &&
      audioMid < textEnd
    );
  });
  if (audioSeg === undefined) {
    return { status: "error" };
  }
  calibrateSingle(textSeg, audioSeg, jyConfig, changedTexts);
  return { status: "success" };
};

const matchSameIndexAudio = (
  textSeg: any,
  audioSegs: any,
  jyConfig: any,
  textSegsLength: number,
  textSegIndex: number,
  changedTexts: string[]
) => {
  if (audioSegs.length !== textSegsLength) {
    return { status: "error" };
  }
  audioSegs.sort(
    (a: any, b: any) => a.target_timerange.start - b.target_timerange.start
  );
  const audioSeg = audioSegs[textSegIndex];
  audioSeg.target_timerange.start = textSeg.target_timerange.start;
  audioSeg.target_timerange.duration = textSeg.target_timerange.duration;
  calibrateSingle(textSeg, audioSeg, jyConfig, changedTexts);
  return { status: "success" };
};

const calibrateSingle = (
  textSeg: any,
  audioSeg: any,
  jyConfig: any,
  changedTexts: string[],
) => {
  if (
    Math.abs(textSeg.target_timerange.start - audioSeg.target_timerange.start) <
      10 &&
    Math.abs(
      textSeg.target_timerange.duration - audioSeg.target_timerange.duration
    ) < 10
  ) {
    return;
  }
  textSeg.target_timerange.start = audioSeg.target_timerange.start;
  textSeg.target_timerange.duration = audioSeg.target_timerange.duration;
  changedTexts.push(extractSegPureContent(textSeg, jyConfig));
  return;
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

const extractSegPureContent = (seg: any, jyConfig: any) => {
  const extractPureTextContent = (content: string) => {
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
  const materialTexts = jyConfig.materials.texts;
  const materialText = materialTexts.find(
    (item: any) => item.id === seg.material_id
  );
  if (materialText === undefined) {
    return "-";
  }
  return extractPureTextContent(materialText.content);
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

const doesSegOverlapAnyInTrack = (seg: any, track: any) => {
  const segments = track.segments;
  for (let i = 0; i < segments.length; i++) {
    const targetSeg = segments[i];
    if (seg.id !== targetSeg.id && doesSegsOverlap(seg, targetSeg)) {
      return true;
    }
  }
  return false;
};
