import * as path from "path";
import type { SplitFilesParamType } from "../utils/types";

export const isVideoFileToSplit = (name: string) => {
  return (
    (name.toLowerCase().endsWith(".mp4") ||
      name.toLowerCase().endsWith(".mov")) &&
    !name.startsWith(".")
  );
};

export const getDurationRanges = (
  totalDuration: number,
  splitDuration: number
) => {
  const ranges: { start: number; end: number }[] = [];
  if (totalDuration <= 0 || splitDuration <= 0) {
    // will not happen
    return ranges;
  }
  let p1 = 0;
  let p2 = splitDuration;
  while (p2 < totalDuration) {
    ranges.push({ start: p1, end: p2 });
    p1 += splitDuration;
    p2 += splitDuration;
  }
  ranges.push({ start: p1, end: totalDuration });
  return ranges;
};

export const canCodecCopy = (param: SplitFilesParamType) => {
  const { obfuscator, by } = param;
  if (by === "scene") {
    return false;
  }
  for (const property in obfuscator) {
    if (property === "edgeThrow") {
      continue;
    }
    // @ts-ignore
    if (obfuscator[property].isNeed) {
      return false;
    }
  }
  return true;
};

export const edgeThrowRanges = (
  ranges: { start: number; end: number }[],
  EDGE_THROW_SPAN: {front: {lower: number, higher:number}, back: {lower: number, higher: number}}
) => {
  return ranges.map((range) => {
    const start = range.start;
    const end = range.end;
    if (end - start < 0.2 + 0.1) {
      return range;
    }
    const diffFront = EDGE_THROW_SPAN.front.lower + Math.random() * (EDGE_THROW_SPAN.front.higher - EDGE_THROW_SPAN.front.lower);
    const diffBack = EDGE_THROW_SPAN.back.lower + Math.random() * (EDGE_THROW_SPAN.back.higher - EDGE_THROW_SPAN.back.lower);
    const newStart = start + diffFront;
    const newEnd = end - diffBack;
    return { start: newStart, end: newEnd };
  });
};

export const getOutputFilePath = (
  inputFilename: string,
  partIndex: number,
  outputFolderDir: string,
  outputStoredTogether: boolean
) => {
  const suffix = path.extname(inputFilename);
  const prefix = inputFilename.replace(/\.[^/.]+$/, "");
  const outputFilename = `${prefix}-p${partIndex + 1}${suffix}`;
  if (outputStoredTogether) {
    return path.join(outputFolderDir, outputFilename);
  } else {
    return path.join(outputFolderDir, prefix, outputFilename);
  }
};

export const getCropOptionsObj = (
  videoDim: { width: number; height: number },
  CROP_RATIO_SPAN: number[]
) => {
  const cropRatio =
    CROP_RATIO_SPAN[0] +
    Math.random() * (CROP_RATIO_SPAN[1] - CROP_RATIO_SPAN[0]);
  const startXRangeRight = Math.floor(videoDim.width * cropRatio);
  const startYRangeRight = Math.floor(videoDim.height * cropRatio);
  return {
    w: `${(1 - cropRatio).toFixed(2)}*iw`,
    h: `${(1 - cropRatio).toFixed(2)}*ih`,
    x: Math.random() * startXRangeRight,
    y: Math.random() * startYRangeRight,
  };
};

export const getRandomVideoSpeed = (SPEEDING_RATIO_SPAN: number[]) => {
  return (
    SPEEDING_RATIO_SPAN[0] +
    Math.random() * (SPEEDING_RATIO_SPAN[1] - SPEEDING_RATIO_SPAN[0])
  );
};