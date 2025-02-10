import * as fs from "fs";
import { cloneDeep, filter, uniq } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { ProfessionalCutAudioByBeatParamType } from "../../utils/types";

export const handleProfessionalCutAudioByBeat = async (
  _event: any,
  param: ProfessionalCutAudioByBeatParamType,
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
      return { status: "error", data: "没有任何非隐藏非锁定的音频轨道" };
    }
    const fps = jyConfig.fps;
    let originalSegCount = 0;
    let resultSegCount = 0;
    for (let k = 0; k < audioTracks.length; k++) {
        const audioTrack = audioTracks[k];
        let toAddSegsCollection: any[] = [];
        for (let j = 0; j < audioTrack.segments.length; j++) {
            const seg = audioTrack.segments[j];
            const beat = findBeatMaterialOfSeg(seg, jyConfig);
            if (beat == undefined) {
                continue;
            }
            let sourceBeatPoints: number[] = [];
            if (hasAiBeats(beat)) {
                const aiBeatPoints = getAiBeatPoints(beat, fps);
                sourceBeatPoints.push(...aiBeatPoints);
            }
            if (hasUserBeats(beat)) {
                const userBeatPoints = getUserBeatPoints(beat);
                sourceBeatPoints.push(...userBeatPoints);
            }
            sourceBeatPoints = uniq(sourceBeatPoints);
            if (hasUserDeleteAiBeats(beat)) {
                const userDeleteAiBeats = getUserDeleteAiBeatPoints(beat);
                sourceBeatPoints = sourceBeatPoints.filter(item => !userDeleteAiBeats.includes(item));
            }
            // 1000是一个极小误差值，防止的是类似66666和66667的区别，也不允许踩点踩0位置
            sourceBeatPoints = sourceBeatPoints.filter(item => item > seg.source_timerange.start + 1000 && item < seg.source_timerange.start + seg.source_timerange.duration - 1000);
            sourceBeatPoints.sort((a, b) => a - b);
            const targetBeatPoints = mapBeatPointsFromSourceToTarget(sourceBeatPoints, seg, fps);
            const targetPoints = includeBothTargetEnds(targetBeatPoints, seg, fps);
            // 要从target map回去的原因是target可能因为加速导致点位2合1(uniq操作)，所以map回去可保证数组item数量相等。
            const sourcePoints = remapTargetPointsToSource(targetPoints, seg, fps);
            const splitCount = sourcePoints.length - 1;
            originalSegCount++;
            resultSegCount += splitCount;
            if (splitCount === 1) {
                continue;
            }
            // 以下进行音频切割
            const oldSegId = seg.id;
            const toAddSegs = [];
            for (let i = 1; i < splitCount; i++) {
                toAddSegs.push(cloneDeep(seg));
            }
            handleMaterialCopy(jyConfig, "audio_fades", seg, oldSegId, splitCount);
            handleMaterialCopy(jyConfig, "audios", seg, oldSegId, splitCount);
            handleMaterialCopy(jyConfig, "beats", seg, oldSegId, splitCount);
            handleMaterialCopy(jyConfig, "sound_channel_mappings", seg, oldSegId, splitCount);
            handleMaterialCopy(jyConfig, "speeds", seg, oldSegId, splitCount);
            handleMaterialCopy(jyConfig, "vocal_separations", seg, oldSegId, splitCount);
            for (let i = 0; i < splitCount; i++) {
                const curSeg = i === 0 ? seg : toAddSegs[i - 1];
                curSeg.id = generateId("segments", i, oldSegId);
                curSeg.extra_material_refs = [
                    generateId("materials.speeds", i, oldSegId),
                    generateId("materials.audio_fades", i, oldSegId),
                    generateId("materials.beats", i, oldSegId),
                    generateId("materials.sound_channel_mappings", i, oldSegId),
                    generateId("materials.vocal_separations", i, oldSegId),
                ];
                curSeg.material_id = generateId("materials.audios", i, oldSegId);
                const sourceLeft = sourcePoints[i];
                const sourceRight = sourcePoints[i + 1];
                const targetLeft = targetPoints[i];
                const targetRight = targetPoints[i + 1];
                curSeg.source_timerange.start = sourceLeft;
                curSeg.source_timerange.duration = sourceRight - sourceLeft;
                curSeg.target_timerange.start = targetLeft;
                curSeg.target_timerange.duration = targetRight - targetLeft;
            }
            // 不能直接加在当前segments后面，否则遍历时会引入新的刚加入的segs
            toAddSegsCollection = toAddSegsCollection.concat(toAddSegs);
        }
        audioTrack.segments = audioTrack.segments.concat(toAddSegsCollection);
        audioTrack.segments.sort((a: any, b: any) => a.target_timerange.start - b.target_timerange.start);
    }
    if (activationStatus.status === "trial" && originalSegCount > 1000) {
        return {
          status: "error",
          data: `有${originalSegCount}段音频，超过了试用版不大于1000段的限制（正式版无此上限限制）。请你删除部分音频片段，关闭剪映草稿后，再回本软件重试。试用满意的话，恳请您点击左侧的"激活软件"激活正式版~`,
        };
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    flushVideoTotalDuration(jyConfig);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(param.infoPath, resultStr, "utf8");
    return { 
        status: "success", data: {
        originalSegCount,
        resultSegCount,
    }};
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const findBeatMaterialOfSeg = (seg: any, jyConfig: any) => {
    const beats = jyConfig.materials.beats;
    if (!beats || beats.length === 0) {
        return undefined;
    }
    for (let i = 0; i < seg.extra_material_refs.length; i++) {
        const ref: string = seg.extra_material_refs[i];
        const target = beats.find((b: any) => b.id === ref);
        if (target) {
            return target;
        }
    }
    return undefined;
}

const transformBeatfiletime2Drafttime = (bt: number, fps: number) => { // fps 24, 25, 30, 50, 60
	const dtReal = bt * 1000;
	const dtSecond = Math.floor(dtReal / 1000000);
	const dtFraction = dtReal - dtSecond * 1000000;
	const minScale = 1000000 / fps; // minScale是最小刻度
	const scaleCount = Math.round(dtFraction / minScale);
	const dtFractionInScale = minScale * scaleCount;
	const dtFractionInScaleInt = Math.floor(dtFractionInScale + 0.00001);
	const dt = dtSecond * 1000000 + dtFractionInScaleInt;
	return dt;
}

// 校正到合法位置
const adjustDrafttime = (originalDt: number, fps: number) => {
	const dtSecond = Math.floor(originalDt / 1000000);
	const dtFraction = originalDt - dtSecond * 1000000;
	const minScale = 1000000 / fps; // minScale是最小刻度
	const scaleCount = Math.round(dtFraction / minScale);
	const dtFractionInScale = minScale * scaleCount;
	const dtFractionInScaleInt = Math.floor(dtFractionInScale + 0.00001);
	const dt = dtSecond * 1000000 + dtFractionInScaleInt;
	return dt;
}

const hasAiBeats = (beat: any) => {
    // 讲道理beat.enable_ai_beats就够了，404作为保险起见。
    const notHasAiBeats = !beat.enable_ai_beats || beat.gear === 404 || beat.ai_beats == null || beat.ai_beats.beats_path == null;
    return !notHasAiBeats;
}

const getAiBeatPoints = (beat: any, fps: number) => {
    if (beat.ai_beats == null || beat.ai_beats.beats_path == null) {
        return [];
    }
    try {
        const jsonString = fs.readFileSync(beat.ai_beats.beats_path, { encoding: "utf8" });
        const aiBeatsObj = JSONbig.parse(jsonString);
        if (aiBeatsObj.time == null || aiBeatsObj.time.length === 0) {
            return [];
        }
        if (aiBeatsObj.value == null || aiBeatsObj.value.length === 0) {
            return [];
        }
        if (aiBeatsObj.time.length !== aiBeatsObj.value.length) {
            return [];
        }
        const wantedTimes = [];
        for (let i = 0; i < aiBeatsObj.time.length; i++) {
            const val = aiBeatsObj.value[i];
            // 节拍1就只是包括value值为1点，节拍2就是包括所有value的
            if ((beat.gear === 0 && val === 1) || beat.gear !== 0) {
                wantedTimes.push(aiBeatsObj.time[i]);
            }
        }
        return wantedTimes.map(time => transformBeatfiletime2Drafttime(time, fps));
    } catch (e) {
        // @ts-ignore
        return [];
    }
}

const hasUserBeats = (beat: any) => {
    return beat.user_beats != null && beat.user_beats.length > 0;
}

const getUserBeatPoints = (beat: any) => {
    if (beat.user_beats == null || beat.user_beats.length === 0) {
        return [];
    }
    return beat.user_beats;
}

const hasUserDeleteAiBeats = (beat: any) => {
    if (beat.user_delete_ai_beats == null) {
        return false;
    }
    // 节拍1的删除节拍在beat_0，节拍2点删除节拍在beat_1，节拍1的gear值为0，节拍2的gear值为1.
    const beat_target_gear = beat.user_delete_ai_beats[`beat_${beat.gear}`];
    return beat_target_gear != null && beat_target_gear.length > 0;
}

const getUserDeleteAiBeatPoints = (beat: any) => {
    if (beat.user_delete_ai_beats == null) {
        return [];
    }
    // 节拍1的删除节拍在beat_0，节拍2点删除节拍在beat_1，节拍1的gear值为0，节拍2的gear值为1.
    const beat_target_gear = beat.user_delete_ai_beats[`beat_${beat.gear}`];
    return beat_target_gear;
}

const mapBeatPointsFromSourceToTarget = (sourceBeatPoints: number[], seg: any, fps: number) => {
    let targetBeatPoints = sourceBeatPoints.map(item => {
        const unadjusted = (item - seg.source_timerange.start) * seg.target_timerange.duration / seg.source_timerange.duration + seg.target_timerange.start;
        return adjustDrafttime(unadjusted, fps);
    });
    targetBeatPoints = uniq(targetBeatPoints);
    // 1000是一个极小误差值，防止的是类似66666和66667的区别，也不允许踩点踩0位置
    targetBeatPoints = targetBeatPoints.filter(item => item > seg.target_timerange.start + 1000 && item < seg.target_timerange.start + seg.target_timerange.duration - 1000);
    targetBeatPoints.sort((a, b) => a - b);
    return targetBeatPoints;
}

const remapTargetPointsToSource = (targetPoints: number[], seg: any, fps: number) => {
    const sourcePoints = targetPoints.map(item => {
        const unadjusted = (item - seg.target_timerange.start) * seg.source_timerange.duration / seg.target_timerange.duration + seg.source_timerange.start;
        return adjustDrafttime(unadjusted, fps);
    });
    return sourcePoints;
}

const includeBothTargetEnds = (targetBeatPoints: number[], seg: any, fps: number) => {
    // 起点和终点adjust看起来是不必要的，以防万一，比如以后此草稿可能是承接自另外的地方。
    const start = adjustDrafttime(seg.target_timerange.start, fps);
    const end = adjustDrafttime(seg.target_timerange.start + seg.target_timerange.duration, fps);
    const targetPoints = [
        start,
        ...targetBeatPoints,
        end,
    ]
    return targetPoints;
}

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

const generateId = (
    property: string,
    idx: number,
    oldSegId: string,
) => {
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
    }
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
}

const handleMaterialCopy = (jyConfig: any, name: string, seg: any, oldSegId: string, splitCount: number) => {
    const ma = jyConfig.materials[name];
    if (!ma || !Array.isArray(ma)) {
      return;
    }
    let maIdx = -1;
    if (name === "audios") {
        maIdx = ma.findIndex(
        (element: any) => seg.material_id === element.id
      );
    } else {
        maIdx = ma.findIndex((element: any) =>
        seg.extra_material_refs.includes(element.id)
      );
    }
    if (maIdx === -1) {
      return;
    }
    // 当前位置的删了浪费，索性作为位置0的新material，改其id即可。
    ma[maIdx].id = generateId(`materials.${name}`, 0, oldSegId);
    for (let i = 1; i < splitCount; i++) {
      const clonedMa = cloneDeep(ma[maIdx]);
      clonedMa.id = generateId(`materials.${name}`, i, oldSegId);
      ma.push(clonedMa);
    }
  };