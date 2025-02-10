import * as fs from "fs";
import { cloneDeep, filter, remove, orderBy, findIndex } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { MasterAlignMaterialParamType } from "../../utils/types";

export const handleMasterAlignMaterial = async (
  _event: any,
  param: MasterAlignMaterialParamType,
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
    const { infoPath, isChangeSpeed, speedRatio, isChangeSpeedAuto, isChangeGap, gapTime, isOrderMode } = param;
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
      return { status: "error", data: "没有任何未消音未锁定的可用AI语音轨道" };
    }
    let combinedAudioSegs: any = [];
      audioTracks.forEach(track => {
          const segments = track.segments;
          if (!Array.isArray(segments)) {
              return {status: 'error', data: 'Segments does not exist'};
          }
          combinedAudioSegs = combinedAudioSegs.concat(segments);
      });
      const allAudioMaterials = jyConfig.materials.audios;
      if (!isOrderMode) {
        combinedAudioSegs = filter(combinedAudioSegs, seg => {
          const audioInMaterial = allAudioMaterials.find((item: any) => item.id === seg.material_id);
          return audioInMaterial.type === "text_to_audio";
        });
      }
      combinedAudioSegs = orderBy(combinedAudioSegs, seg => seg.target_timerange.start, ['asc']);
      if (combinedAudioSegs.length === 0) {
          return {status: 'error', data: '没有任何AI语音'};
      }
      if (handleGetActivationStatus().status === 'trial' && combinedAudioSegs.length > 30) {
        return {status: 'error', data: `您要对齐的草稿有${combinedAudioSegs.length}组语音字幕，超过了不大于30组的试用版限制，建议您使用更短的文本做体验~如果可以，请支持创作者的心血，购买正式版~谢谢您，我的衣食父母！`}
      }
      if (isChangeSpeed && !isChangeSpeedAuto) {
        speedingTrack(jyConfig, speedRatio);
      }
      if (isChangeSpeed && isChangeSpeedAuto) {
        const videoRightEnd = getVideoRightEnd(tracks);
        const autoRatio = getSpeedingTrackAutoRatio(combinedAudioSegs, videoRightEnd, isChangeGap, gapTime);
        speedingTrack(jyConfig, autoRatio);
      }
      combinedAudioSegs = cloneDeep(combinedAudioSegs);
      const gapTimeInUse = transformDuration(isChangeGap ? gapTime : 0);
      let curOffset = 0;
      for (let i = 0; i < combinedAudioSegs.length; i++) {
          combinedAudioSegs[i].target_timerange.start = curOffset;
          curOffset = combinedAudioSegs[i].target_timerange.start + combinedAudioSegs[i].target_timerange.duration + gapTimeInUse;
      }
      const firstAudioTrackId = audioTracks[0].id;
      remove(jyConfig.tracks, (track: any) => {
          return track.type === 'audio' && track.attribute === 0 && track.id !== firstAudioTrackId;
      });
      const finalAudioTrackIdx = findIndex(jyConfig.tracks, { 'id' : firstAudioTrackId});
      jyConfig.tracks[finalAudioTrackIdx].segments = combinedAudioSegs;
      const textToAudioIds = combinedAudioSegs.map((seg: any) => seg.id);
      const allTextMaterials = jyConfig.materials.texts;
      const materialIds = textToAudioIds.map((textToAudioId: string) => {
          const material = allTextMaterials.find((item: any) => {
              if (!Array.isArray(item.text_to_audio_ids) || item.text_to_audio_ids.length === 0) {
                  return false;
              }
              return item.text_to_audio_ids[0] === textToAudioId;
          });
          if (material === undefined) {
              return undefined;
          }
          return material.id;
      });
      const textTracks = filter(tracks, {
          type: 'text',
          attribute: 0,
      });
      if (textTracks.length === 0) {
        return {status: 'error', data: '没有任何非隐藏非锁定的可用字幕'};
      }
      let combinedTextSegsAll: any[] = [];
      textTracks.forEach(track => {
          const segments = track.segments;
          if (!Array.isArray(segments)) {
              return {status: 'error', data: 'Text Segments does not exist'};
          }
          combinedTextSegsAll = combinedTextSegsAll.concat(segments);
      });
      const textSegsReadOnly = materialIds.map((materialId: string) => {
          return combinedTextSegsAll.find(item => item.material_id === materialId);
      });
      let textSegs = cloneDeep(textSegsReadOnly);
      // 上述通过audio的material id匹配到的字幕是与语音对应的字幕，对于顺序模式来说，不要这样匹配。
      // 但因为有既有逻辑，我们还是算出了textSegs，接下来替换掉它。顺序模式下，textSegs就是text去按现有时间顺序排序。
      if (isOrderMode) {
        combinedTextSegsAll = orderBy(combinedTextSegsAll, seg => seg.target_timerange.start, ['asc']);
        textSegs = combinedTextSegsAll;
      }
      for (let i = 0; i < textSegs.length; i++) {
          if (combinedAudioSegs[i] === undefined) {
            continue;
          }
          const audioTimerange = combinedAudioSegs[i].target_timerange;
          if (textSegs[i] === undefined) {
            continue;
          }
          textSegs[i].target_timerange.duration = audioTimerange.duration;
          textSegs[i].target_timerange.start = audioTimerange.start;
      }
      textSegs = textSegs.filter((textSeg: any) => textSeg !== undefined);
      const firstTextTrackId = textTracks[0].id;
      remove(jyConfig.tracks, (track: any) => {
          return track.type === 'text' && track.attribute == 0 && track.id !== firstTextTrackId;
      });
      const finalTextTrackIdx = findIndex(jyConfig.tracks, { 'id' : firstTextTrackId});
      jyConfig.tracks[finalTextTrackIdx].segments = textSegs;

      flushVideoTotalDuration(jyConfig);
      const resultStr = JSONbig.stringify(jyConfig);
      fs.writeFileSync(infoPath, resultStr, 'utf8');
      store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
      return {status: 'success', data: `${textSegs.length}`};
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

const speedingTrack = (jyConfig: any, speedRatio: number) => {
    try {
      const tracks = jyConfig.tracks;
      if (!Array.isArray(tracks)) {
        return { status: "error", data: "Tracks is not an array." };
      }
      const audioTracks = filter(tracks, {
        type: "audio",
        attribute: 0,
      });
      if (!audioTracks.length) {
        return {
          status: "error",
          data: "没有任何符合条件（未消音且未锁定）的音频轨道，无法为您做音频变速操作。",
        };
      }
      const speedMap = new Map();
      // @ts-ignore
      jyConfig.materials.speeds.forEach((item) => {
        speedMap.set(item.id, item);
      });
      // @ts-ignore
      audioTracks.forEach((track) => {
        for (let i = 0; i < track.segments.length; i++) {
          const curSeg = track.segments[i];
          curSeg.target_timerange.duration = Math.round(
            curSeg.source_timerange.duration / speedRatio
          );
          curSeg.speed = speedRatio;
          // @ts-ignore
          curSeg.extra_material_refs.forEach((ref) => {
            if (speedMap.has(ref)) {
              speedMap.get(ref).speed = speedRatio;
            }
          });
          if (i + 1 < track.segments.length) {
            const nextSeg = track.segments[i + 1];
            if (
              curSeg.target_timerange.start + curSeg.target_timerange.duration >
              nextSeg.target_timerange.start
            ) {
              nextSeg.target_timerange.start =
                curSeg.target_timerange.start + curSeg.target_timerange.duration;
            }
          }
        }
      });
      audioTracks.forEach((track) => {
        for (let i = 0; i < track.segments.length; i++) {
          const curSeg = track.segments[i];
          if (i === 0) {
            curSeg.target_timerange.start = 0;
          } else {
            const prevSeg = track.segments[i - 1];
            curSeg.target_timerange.start =
              prevSeg.target_timerange.start +
              prevSeg.target_timerange.duration;
          }
        }
      });
      return {
        status: "success",
      };
    } catch (err) {
      // @ts-ignore
      return { status: "error", data: `${err?.message || err}` };
    }
  };

function transformDuration(readableDuration: number) {
    const tenTimes = Math.round(readableDuration * 10);
    const residual = tenTimes % 2;
    if (residual === 0) {
        return Math.round(readableDuration * 1000000);
    } else {
        return Math.round(readableDuration * 1000000 - 33334);
    }
}

function getVideoRightEnd(tracks: any) {
    let videoRightEnd = 0;
    const videoTracks = filter(tracks, {
        type: "video",
    });
    videoTracks.forEach((track) => {
        const segments = track.segments;
        const len = segments.length;
        if (len === 0) {
        return;
        }
        const lastSeg = segments[len - 1];
        const lastEnd =
        lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
        if (lastEnd > videoRightEnd) {
        videoRightEnd = lastEnd;
        }
    });
    return videoRightEnd;
}

function getSpeedingTrackAutoRatio(combinedAudioSegs: any, videoRightEnd: number, isChangeGap: boolean, gapTime: number) {
    if (combinedAudioSegs.length < 1) {
      return 1;
    }
    let totalAudioLength = 0;
    for (let i = 0; i < combinedAudioSegs.length; i++) {
      totalAudioLength = totalAudioLength + combinedAudioSegs[i].source_timerange.duration;
    }
    if (totalAudioLength === 0) {
      return 1;
    }
    const gapTimePer = isChangeGap ? gapTime : 0;
    const totalGapTime = transformDuration(gapTimePer * (combinedAudioSegs.length - 1));
    const audiosShouldOccupyTime = videoRightEnd - totalGapTime;
    if (audiosShouldOccupyTime <= 0) {
      return 1;
    }
    return totalAudioLength / audiosShouldOccupyTime;
  }