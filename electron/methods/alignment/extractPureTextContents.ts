import * as fs from "fs";
import { cloneDeep, filter } from "lodash";
import { extractTegPureContent } from "../../utils/textUtils";

const JSONbig = require("json-bigint");
import type { ExtractPureTextContentsParamType } from "../../utils/types";

export const handleExtractPureTextContents = async (
  _event: any,
  param: ExtractPureTextContentsParamType,
) => {
  try {
    const { infoPath } = param;
    const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
    const jyConfigOriginal = JSONbig.parse(jsonString);
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    if (param.isExtractAll) {
      const allPureContents: string[] = [];
      filter(tracks, {
        type: "text",
      }).forEach(tr => {
        tr.segments.forEach((teg: any) => {
          allPureContents.push(extractTegPureContent(teg, jyConfig));
        });
      });
      if (allPureContents.length === 0) {
        return { status: "error",  data: "没有任何非隐藏非锁定的文字" };
      }
      return { status: "success", data: allPureContents.filter(onlyUnique) };
    }
    const textTracks = filter(tracks, {
        type: "text",
        attribute: 0,
      });
    if (textTracks.length === 0) {
        return { status: "error", data: "没有任何非隐藏非锁定的文字轨道" };
    }
    if (textTracks.length > 1) {
        return { status: "error", data: `发现有${textTracks.length}条非隐藏非锁定的文字轨道，这是不对的。你应该只保留1条。对于不需要的文字轨道，你可以隐藏或锁定它们，对于隐藏或锁定的文字轨道，本软件会对其视而不见。` };
    }
    const textTrack = textTracks[0];
    if (textTrack.segments.length === 0) {
      return { status: "error", data: "字幕轨道上没有任何一段字幕" }
    }
    const pureContents = textTrack.segments.map((teg: any) => extractTegPureContent(teg, jyConfig));
    const emptyPureContents = pureContents.filter((item: any) => !item || item.match(/^\s*$/g) != null);
    if (emptyPureContents.length > 0) {
      return { status: "error", data: `有${emptyPureContents.length}段字幕内容为空，这是不被允许的。请检查你是否误删字幕内容，留下了空的字幕框。` }
    }
    return { status: "success", data: pureContents };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

function onlyUnique(value: string, index: number, array: string[]) {
  return array.indexOf(value) === index;
}