import * as fs from "fs";
import * as path from "path";
import { handleGetActivationStatus } from "../activation";
import type { CheckMaterialToPartitionRefillParamType } from "../../utils/types";

// 此函数是在批量替换之前先检查预备的材料的充分性，仅需要单层结构
export const handleCheckMaterialToPartitionRefill = async (
  _event: any,
  param: CheckMaterialToPartitionRefillParamType
) => {
  try {
    const activationStatus = handleGetActivationStatus();
    const { parentFolderDir, basenameParts } = param;
    if (parentFolderDir.length === 0) {
      return {
        status: "error",
        data: `未选择文件夹。请你先点击"选择文件夹"按钮。`,
      };
    }
    const childs = fs.readdirSync(parentFolderDir, { withFileTypes: true });
    const childFolders = childs.filter((item) => item.isDirectory());
    if (activationStatus.status === "trial" && childFolders.length > 3) {
        return {
          status: "error",
          data: `试用版可指定的父文件夹里最多只能包含3个子文件夹，即一次只能分区分为3个至多。而你指定的父文件夹里有${
            childFolders.length
          }个子文件夹，请考虑移出${
            childFolders.length - 3
          }个子文件夹，然后点击 "重新检查新素材数量" 按钮进行试用。如果试用满意，你可以考虑点击左侧的"激活软件"页购买正式版，正式版指定的父文件夹里可包含无限多个子文件夹，即分区可以分为无限多区。`,
        };
    }
    const partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[] = [];
    const childFolderNames = childFolders.map(item => item.name);
    for (let i = 0; i < basenameParts.length; i++) {
        const prefix = basenameParts[i].prefix;
        const suffix = basenameParts[i].suffix;
        if (!childFolderNames.includes(prefix)) {
            return {
                status: "error",
                data: `根据你的参考草稿，你提供的目录 ${parentFolderDir} 中应该有名为 ${prefix} 的文件夹，但是没有找到。请你检查是否忘记提供素材。提醒：如果某些片段你想要直接搬运到新草稿而不替换，你可以将它命名为下划线开头，比如 _123.mp4，那么替换时就会忽略它。`
            }
        }
        const childDir = path.join(parentFolderDir, prefix);
        const grandchilds = fs.readdirSync(childDir);
        if (countExtname(suffix, grandchilds) === 0) {
            return {
                status: "error",
                data: `目录 ${childDir} 中没有任何 ${suffix} 文件。这样是无法做素材替换的。请你在该目录中放入至少一个 ${suffix} 文件。另外，需要提醒的是，请保持后缀的大小写一致。像 .MP4 和 .mp4 是不一样的，不能替换。但是你可以先用左侧的辅助功能批量转换文件后缀大小写。`
            }
        }
        const files = listFiles(suffix, grandchilds);
        partitionMaterialsInfos.push({
            prefix,
            suffix,
            resourceCount: files.length,
            resourceNames: files,
            parentFolderDir,
        });
    }
    return {
      status: "success",
      data: partitionMaterialsInfos,
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
