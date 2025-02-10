import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { getIsCapCut } from "../utils/nationVal";
import { RANDOM_MODE } from "./animationUtils";

export const isWinEnv = () => {
  return process.platform === "win32";
};

// attribute是二进制数位表示，倒数第三位是是否锁的位，如果是0就是非锁的，如果是1就是锁的。
export const isLocked = (track: any) => {
  const a = track.attribute;
  const lockVal = ((a - (a % 4)) / 4) % 2;
  return lockVal === 1;
};

export const isKeyboardPR = () => {
  let keyboardFile = "";
  const homedir = os.userInfo().homedir;
  if (process.platform === "darwin") {
    keyboardFile = path.join(
      homedir,
      `Movies/${
        getIsCapCut() ? "CapCut" : "JianyingPro"
      }/User Data/Config/keymapSettings`
    );
  } else if (process.platform === "win32") {
    keyboardFile = path.join(
      homedir,
      `AppData\\Local\\${
        getIsCapCut() ? "CapCut" : "JianyingPro"
      }\\User Data\\Config\\keymapSettings`
    );
  }
  if (!fs.existsSync(keyboardFile)) {
    return false;
  }
  const content = fs.readFileSync(keyboardFile, { encoding: "utf8" });
  return content.includes(`[General]\nconfigVersion=0\ncurrentKeymapIndex=1`);
};

// replaceTypes可能为 ["photo", "video"] 或其中一元素的数组
export function isTargetedMaterial(material: any, replaceTypes: string[]) {
  if (!replaceTypes.includes(material.type)) {
    return false;
  }
  if (
    material.material_name.startsWith("_") ||
    material.material_name.startsWith("ignoreme") ||
    material.material_name.startsWith("复合片段") ||
    material.material_name.startsWith("Compound clip")
  ) {
    return false;
  }
  const nameFromPath = path.basename(material.path);
  if (
    material.material_name.length === 0 &&
    (nameFromPath.startsWith("_") ||
      nameFromPath.startsWith("ignoreme") ||
      nameFromPath.startsWith("复合片段") ||
      nameFromPath.startsWith("Compound clip"))
  ) {
    return false;
  }
  return true;
}

export const MODIFIER_SOLUTION = {
  AUDIO_LONGER: {
    CUT: "cut",
    SPEED: "speed",
  },
  AUDIO_SHORTER: {
    CUT_VIDEO: "cut_video",
    REMAIN: "remain",
    SPEED: "speed",
  },
  RANDOM_MODE: {
    ORDER: "order",
    PURE_RANDOM: "pure_random",
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

export const getMaxRenderIndex = (jyConfig: any) => {
  let maxRenderIndex = 0;
  jyConfig.tracks.forEach((track: any) => {
    const segs = track.segments;
    segs.forEach((seg: any) => {
      const segRenderIndex = seg.render_index;
      if (typeof segRenderIndex === "number" && segRenderIndex > maxRenderIndex) {
        maxRenderIndex = segRenderIndex;
      }
    });
  });
  return maxRenderIndex;
}