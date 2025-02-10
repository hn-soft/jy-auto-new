import * as fs from "fs";
import * as path from "path";
import {CheckAudioResourcesParamType} from "../../../utils/types";

// 此函数是在批量替换之前先检查预备的材料的充分性，仅需要单层结构
export const handleCheckAudioResources = async (
  _event: any,
  param: CheckAudioResourcesParamType
) => {
  const supportedExts = [".mp3", ".MP3", ".wav", ".WAV"];
  try {
    const { parentFolderDir } = param;
    if (parentFolderDir.length === 0) {
      return {
        status: "error",
        data: `未选择文件夹。请你先点击"选择文件夹"按钮。`,
      };
    }

    const files = fs.readdirSync(parentFolderDir);
    const counts = supportedExts.map(ext => {
        const targetedFiles = listFiles(ext, files);
        return targetedFiles.length;
    });
    const count = counts.reduce((prev, cur) => prev + cur, 0);
    const namesList = supportedExts.map(ext => {
      return listFiles(ext, files);
    });
    const names: string[] = [];
    namesList.forEach(li => {
      li.forEach(item => {
        names.push(item);
      });
    });
    names.sort();
    return {
      status: "success",
      data: {
        count,
        names,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const listFiles = (extname: string, files: string[]) => {
  return files.filter((file) => path.extname(file) === extname && !file.startsWith('.'));
};
