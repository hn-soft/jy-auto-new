import { cloneDeep, uniq } from "lodash";

// rangeAttributes对应的数量比sourcePointsWithoutEdge多1，rangeAttribute的真假性，就是该range是否要存留的标记。
export const cutAudioBySourcePoints = (jyConfig: any, audioTrack: any, sourcePointsWithoutEdgeList: number[][], rangeAttributesList: boolean[][]) => {
  const fps = jyConfig.fps;
  let toAddSegsCollection: any[] = [];
  for (let j = 0; j < audioTrack.segments.length; j++) {
    const seg = audioTrack.segments[j];
    const sourcePointsWithoutEdge = sourcePointsWithoutEdgeList[j];
    const rangeAttributes = rangeAttributesList[j];
    // 要从target map回去的原因是target可能因为加速导致点位2合1(uniq操作)，所以map回去可保证数组item数量相等。
    // 但是针对于对齐的这个概念，如果map回去导致source和target差异过大是不被允许的，应该报错（与对齐能手鼓点的宽容性不同），或者调用此方法前就确保其没有加速。
    // 这里的remap方法是借鉴对齐能手，这里也就这样写算了，实际上remap也不会有，不应该有纠正点数总数量作用。
    const targetBeatPoints = mapBeatPointsFromSourceToTarget(sourcePointsWithoutEdge, seg, fps);
    if (targetBeatPoints.length !== sourcePointsWithoutEdge.length) {
      throw new Error("导入的长音频不应该先有剧烈变速（建议完全不变速），要变速请在后续设置选项中调整即可");
    }
    const targetPoints = includeBothTargetEnds(targetBeatPoints, seg, fps);
    const sourcePoints = remapTargetPointsToSource(targetPoints, seg, fps);
    const splitCount = sourcePoints.length - 1;
    if (splitCount !== rangeAttributes.length) {
      throw new Error("提供的rangeAttributes的长度和splitCount不一致");
    }
    const oldSegId = seg.id;
    const toOperateSegs = [];
    let originalSegNotUsedYet = true;
    for (let i = 0; i < splitCount; i++) {
      if (!rangeAttributes[i]) {
        toOperateSegs.push(null);
        continue;
      }
      if (originalSegNotUsedYet) {
        toOperateSegs.push(seg);
        originalSegNotUsedYet = false;
        continue;
      }
      toOperateSegs.push(cloneDeep(seg));
    }
    handleMaterialCopy(jyConfig, "audio_fades", seg, oldSegId, splitCount, rangeAttributes);
    handleMaterialCopy(jyConfig, "audios", seg, oldSegId, splitCount, rangeAttributes);
    handleMaterialCopy(jyConfig, "beats", seg, oldSegId, splitCount, rangeAttributes);
    handleMaterialCopy(jyConfig, "sound_channel_mappings", seg, oldSegId, splitCount, rangeAttributes);
    handleMaterialCopy(jyConfig, "speeds", seg, oldSegId, splitCount, rangeAttributes);
    handleMaterialCopy(jyConfig, "vocal_separations", seg, oldSegId, splitCount, rangeAttributes);
    for (let i = 0; i < splitCount; i++) {
      if (!rangeAttributes[i]) {
        continue;
      }
      const curSeg = toOperateSegs[i];
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
    // 第一个元素已经在audioTrack里了，不需要重复添加。
    const filteredOperatedSegs = toOperateSegs.filter(item => !!item);
    filteredOperatedSegs.shift();
    toAddSegsCollection = toAddSegsCollection.concat(filteredOperatedSegs);
  }
  audioTrack.segments = audioTrack.segments.concat(toAddSegsCollection);
  audioTrack.segments.sort((a: any, b: any) => a.target_timerange.start - b.target_timerange.start);
}

const handleMaterialCopy = (jyConfig: any, name: string, seg: any, oldSegId: string, splitCount: number, rangeAttributes: boolean[]) => {
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
    let originalMaterialNotUsedYet = true;
    for (let i = 0; i < splitCount; i++) {
      if (!rangeAttributes[i]) {
        continue;
      }
      if (originalMaterialNotUsedYet) {
        // 当前位置的删了浪费，索性作为位置0的新material，改其id即可。
        ma[maIdx].id = generateId(`materials.${name}`, i, oldSegId);
        originalMaterialNotUsedYet = false;
        continue;
      }
      const clonedMa = cloneDeep(ma[maIdx]);
      clonedMa.id = generateId(`materials.${name}`, i, oldSegId);
      ma.push(clonedMa);
    }
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

// 这里不是Beat，但是依然有效，借用Beat的方法
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


// 校正到合法位置
export const adjustDrafttime = (originalDt: number, fps: number) => {
	const dtSecond = Math.floor(originalDt / 1000000);
	const dtFraction = originalDt - dtSecond * 1000000;
	const minScale = 1000000 / fps; // minScale是最小刻度
	const scaleCount = Math.round(dtFraction / minScale);
	const dtFractionInScale = minScale * scaleCount;
	const dtFractionInScaleInt = Math.floor(dtFractionInScale + 0.00001);
	const dt = dtSecond * 1000000 + dtFractionInScaleInt;
	return dt;
}