import { getIsCapCut } from "./nationVal";
const JSONbig = require("json-bigint");
const semver = require("semver");
const Store = require("electron-store");
const fs = require("fs");
const path = require("path");

let cache = {};

export const isJsonFormatText = (appVer: string) => {
  if (getIsCapCut()) {
    return semver.gte(appVer, "2.9.8");
  } else {
    return semver.gte(appVer, "4.9.8");
  }
};

export const packNumToConstDigits = (i: number, length: number) => {
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

// 返回数组中重复最多次的元素
export const arrMode = (arr: string[]) => {
  return arr
    .sort(
      (a, b) =>
        arr.filter((v) => v === a).length - arr.filter((v) => v === b).length
    )
    .pop();
};

export const getNearestID = (id: string, targetLang: string) => {
  const LEFT_LIST = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
  ];
  const RIGHT_LIST = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "0",
  ];
  const LANG_SELECT_SUPPORTED = [
    { value: "zh-CN", label: "简体中文" },
    { value: "zh-TW", label: "繁体中文" },
    { value: "en", label: "英语" },
    { value: "fr", label: "法语" },
    { value: "de", label: "德语" },
    { value: "it", label: "意大利语" },
    { value: "ja", label: "日语" },
    { value: "es", label: "西班牙语" },
    { value: "pt", label: "葡语" },
    { value: "th", label: "泰语" },
    { value: "vi", label: "越南语" },
    { value: "id", label: "印尼语" },
    { value: "ms", label: "马来语" },
    { value: "ko", label: "韩语" },
    { value: "ru", label: "俄语" },
    { value: "tr", label: "土耳其语" },
  ];
  const lastChar = id.substring(id.length - 1, id.length);
  const lastCharLeftIdx = LEFT_LIST.findIndex((item) => item === lastChar);
  if (lastCharLeftIdx === -1) {
    throw new Error(`irregular id: ${id}`);
  }
  const lastCharReplacement = RIGHT_LIST[lastCharLeftIdx];
  const langNum = LANG_SELECT_SUPPORTED.findIndex(
    (item) => item.value === targetLang
  );
  if (langNum === -1) {
    throw new Error(`irregular target lang: ${targetLang}`);
  }
  return `${packNumToConstDigits(langNum, 8)}${id.substring(
    8,
    id.length - 1
  )}${lastCharReplacement}`;
};

export const getHighestRenderIdx = (tracks: any) => {
  let highestVal = 0;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const segments = track.segments;
    for (let j = 0; j < segments.length; j++) {
      const renderIndex = segments[j].render_index;
      if (typeof renderIndex === "number") {
        if (renderIndex > highestVal) {
          highestVal = renderIndex;
        }
      }
    }
  }
  return highestVal;
};

export function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export const loadCache = (param: { infoPath: string }) => {
  const { infoPath } = param;
  const cacheFolder = path.resolve(infoPath, "..", "transcache");
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder);
  }
  const cacheFile = path.resolve(cacheFolder, "subtitle_cache.json");
  if (fs.existsSync(cacheFile)) {
    const cacheStr = fs.readFileSync(cacheFile, { encoding: "utf8" });
    // format is like { content: {sourceLang, targetLang, q, result}[] }
    const cacheObjFromFile = JSONbig.parse(cacheStr);
    // @ts-ignore
    cache[infoPath] = cacheObjFromFile;
  } else {
    // @ts-ignore
    cache[infoPath] = { content: [] };
  }
};

export const addCache = (param: {
  sourceLang: string;
  targetLang: string;
  qs: string[];
  results: string[];
  infoPath: string;
}) => {
  const { sourceLang, targetLang, qs, results, infoPath } = param;
  if (qs.length !== results.length) {
    return;
  }
  if (qs.length === 0 || results.length === 0) {
    return;
  }
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    // 很重要，与此同时translated[i]可能有值，但不应该加入，因为那是cached的结果，不需要重复加（已经避免了此问题但依然重要）
    if (q.length === 0) {
      continue;
    }
    const result = results[i];
    // @ts-ignore
    cache[infoPath].content.push({ sourceLang, targetLang, q, result });
  }
  const cacheFolder = path.resolve(infoPath, "..", "transcache");
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder);
  }
  const cacheFile = path.resolve(cacheFolder, "subtitle_cache.json");
  // @ts-ignore
  fs.writeFileSync(cacheFile, JSONbig.stringify(cache[infoPath]), "utf8");
};

export const tryHitCache = (param: {
  sourceLang: string;
  targetLang: string;
  qs: string[];
  infoPath: string;
}) => {
  const cacheResults = new Array(param.qs.length).fill(null);
  // @ts-ignore
  const cacheContent = cache[param.infoPath].content;
  for (let i = 0; i < param.qs.length; i++) {
    const q = param.qs[i];
    for (let j = 0; j < cacheContent.length; j++) {
      const cacheItem = cacheContent[j];
      if (
        cacheItem.sourceLang === param.sourceLang &&
        cacheItem.targetLang === param.targetLang &&
        cacheItem.q === q
      ) {
        cacheResults[i] = cacheItem.result;
        break;
      }
    }
  }
  return cacheResults;
};

export const isAllEmptyStrings = (arr: string[]) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].length !== 0) {
      return false;
    }
  }
  return true;
};
