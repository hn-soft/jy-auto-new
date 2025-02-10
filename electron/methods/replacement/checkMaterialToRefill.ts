import * as fs from "fs";
import * as path from "path";
import type { CheckMaterialToRefillParamType } from "../../utils/types";

// 此函数是在批量替换之前先检查预备的材料的充分性，仅需要单层结构
export const handleCheckMaterialToRefill = async (
  _event: any,
  param: CheckMaterialToRefillParamType
) => {
  try {
    const { parentFolderDir, sourceExtnames } = param;
    if (parentFolderDir.length === 0) {
      return {
        status: "error",
        data: `未选择文件夹。请你先点击"选择文件夹"按钮。`,
      };
    }

    const resourceInfos: {
      extname: string;
      sourceCount: number;
      resourceCount: number;
      filenames: string[];
      parentFolderDir: string;
    }[] = [];
    const files = fs.readdirSync(parentFolderDir);
    for (let j = 0; j < sourceExtnames.length; j++) {
      const sourceExtname = sourceExtnames[j];
      const materialCount = countExtname(sourceExtname.extname, files);
      if (materialCount < sourceExtname.count) {
        const actWord = "增加";
        return {
          status: "error",
          data: `文件夹里有${materialCount}个${sourceExtname.extname}文件，但你刚才所选作参考依据的草稿里有${sourceExtname.count}个${sourceExtname.extname}文件。请考虑${actWord} "${parentFolderDir}" 中的${sourceExtname.extname}文件数量，使其大于或等于${sourceExtname.count}个，然后点击 "重新检查新素材数量" 按钮。请注意：替换素材时文件格式必须一致，比如你不可以将.mp4文件替换为.mov文件，另外，大小写不一致的情况也不能替换，比如.MP4和.mp4是不一样的，左侧的辅助功能可以为你批量转换大小写；如果遇到有多个相同后缀的文件，则按照字母顺序替换同轨道从左到右的素材。比如a.png在最左边, b.png在中间， c.png在右边。`,
        };
      }
      const filenames = listFiles(sourceExtname.extname, files);
      filenames.sort();
      resourceInfos.push({
        extname: sourceExtname.extname,
        sourceCount: sourceExtname.count,
        resourceCount: materialCount,
        filenames,
        parentFolderDir,
      });
    }
    return {
      status: "success",
      data: resourceInfos,
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const countExtname = (extname: string, files: string[]) => {
  let count = 0;
  files.forEach((file) => {
    if (path.extname(file) === extname) {
      count++;
    }
  });
  return count;
};

const listFiles = (extname: string, files: string[]) => {
  return files.filter((file) => path.extname(file) === extname && !file.startsWith('.'));
};
