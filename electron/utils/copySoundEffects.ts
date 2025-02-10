import { filter, sum, minBy, cloneDeep } from "lodash";

export const POSITION_ATTRIBUTE = {
  MID: 'MID',
  START: 'START',
  END: 'END',
};

export const copySoundEffects = (jyConfig: any, positions: number[], positionAttribute: string) => {
  const tracks = jyConfig.tracks;
  const audioTracks = filter(tracks, {
    type: "audio",
    attribute: 0,
  });
  if (audioTracks.length === 0) {
    return;
  }
  const audioTrack = minBy(audioTracks, (tr) => {
    const segDurations = tr.segments.map(
      (seg: any) => seg.target_timerange.duration
    );
    return sum(segDurations);
  });
  let curOldSegIdx = 0;
  const oldSegCount = audioTrack.segments.length;
  const newSegs = [];
  for (let i = 0; i < positions.length; i++) {
    const curOldSeg = audioTrack.segments[curOldSegIdx];
    const oldSegId = curOldSeg.id;
    const curNewSeg = cloneDeep(curOldSeg);
    handleSingleMaterialCopy(jyConfig, "audio_fades", curOldSeg, oldSegId, i);
    handleSingleMaterialCopy(jyConfig, "audios", curOldSeg, oldSegId, i);
    handleSingleMaterialCopy(jyConfig, "beats", curOldSeg, oldSegId, i);
    handleSingleMaterialCopy(
      jyConfig,
      "sound_channel_mappings",
      curOldSeg,
      oldSegId,
      i
    );
    handleSingleMaterialCopy(jyConfig, "speeds", curOldSeg, oldSegId, i);
    handleSingleMaterialCopy(
      jyConfig,
      "vocal_separations",
      curOldSeg,
      oldSegId,
      i
    );
    curNewSeg.id = generateId("segments", i, oldSegId);
    curNewSeg.extra_material_refs = [
      generateId("materials.speeds", i, oldSegId),
      generateId("materials.audio_fades", i, oldSegId),
      generateId("materials.beats", i, oldSegId),
      generateId("materials.sound_channel_mappings", i, oldSegId),
      generateId("materials.vocal_separations", i, oldSegId),
    ];
    curNewSeg.material_id = generateId("materials.audios", i, oldSegId);
    let audioStart = positions[i];
    if (positionAttribute === POSITION_ATTRIBUTE.START) {
      audioStart = positions[i];
    } else if (positionAttribute === POSITION_ATTRIBUTE.MID) {
      audioStart = positions[i] - 0.5 * curNewSeg.target_timerange.duration;
    } else if (positionAttribute === POSITION_ATTRIBUTE.END) {
      audioStart = positions[i] - curNewSeg.target_timerange.duration;
    }
    curNewSeg.target_timerange.start = adjustDrafttime(
      audioStart,
      jyConfig.fps
    );
    newSegs.push(curNewSeg);
    curOldSegIdx = (curOldSegIdx + 1) % oldSegCount;
  }
  audioTrack.segments = newSegs;
};

const handleSingleMaterialCopy = (
  jyConfig: any,
  name: string,
  seg: any,
  oldSegId: string,
  i: number
) => {
  const ma = jyConfig.materials[name];
  if (!ma || !Array.isArray(ma)) {
    return;
  }
  let maIdx = -1;
  if (name === "audios") {
    maIdx = ma.findIndex((element: any) => seg.material_id === element.id);
  } else {
    maIdx = ma.findIndex((element: any) =>
      seg.extra_material_refs.includes(element.id)
    );
  }
  if (maIdx === -1) {
    return;
  }
  const clonedMa = cloneDeep(ma[maIdx]);
  clonedMa.id = generateId(`materials.${name}`, i, oldSegId);
  ma.push(clonedMa);
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
};
