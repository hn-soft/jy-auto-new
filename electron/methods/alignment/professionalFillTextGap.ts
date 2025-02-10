import * as fs from "fs";
import { cloneDeep, filter } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { ProfessionalFillTextGapParamType } from "../../utils/types";

export const handleProfessionalFillTextGap = async (
  _event: any,
  param: ProfessionalFillTextGapParamType,
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
    const textTracks = filter(tracks, {
      type: "text",
      attribute: 0,
    });
    if (textTracks.length === 0) {
      return { status: "error", data: "没有任何非隐藏非锁定的文字轨道" };
    }
    textTracks.sort((a, b) => b.segments.length - a.segments.length);
    const textTrack = textTracks[0];
    const tgs = textTrack.segments;
    if (tgs.length === 0) {
      return { status: "error", data: "weird, 文字轨道上没有任何文字片段" };
    }
    if (activationStatus.status === "trial" && tgs.length > 10) {
      return {
        status: "error",
        data: `有${tgs.length}段字幕，超过了试用版不大于10段的限制（正式版无此上限限制）。请你删除部分字幕片段，关闭剪映草稿后，再回本软件重试。试用满意的话，恳请您点击左侧的"激活软件"激活正式版~`,
      };
    }
    if (param.isStartFromZero) {
      tgs[0].target_timerange.duration =
        tgs[0].target_timerange.start + tgs[0].target_timerange.duration;
      tgs[0].target_timerange.start = 0;
    }
    if (param.fillMethod === "midmerge") {
      for (let i = 1; i < tgs.length; i++) {
        const seg1 = tgs[i - 1];
        const seg2 = tgs[i];
        const seg1End =
          seg1.target_timerange.start + seg1.target_timerange.duration;
        const seg2Start = seg2.target_timerange.start;
        const seg2FixedEnd =
          seg2.target_timerange.start + seg2.target_timerange.duration;
        const segGapMid = Math.floor((seg1End + seg2Start) / 2);
        seg1.target_timerange.duration =
          segGapMid - seg1.target_timerange.start;
        seg2.target_timerange.start = segGapMid;
        seg2.target_timerange.duration = seg2FixedEnd - segGapMid;
      }
    } else if (param.fillMethod === "rightward") {
      for (let i = 1; i < tgs.length; i++) {
        const seg1 = tgs[i - 1];
        const seg2 = tgs[i];
        seg1.target_timerange.duration =
          seg2.target_timerange.start - seg1.target_timerange.start;
      }
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    flushVideoTotalDuration(jyConfig);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(param.infoPath, resultStr, "utf8");
    return { status: "success", data: `${tgs.length}` };
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
