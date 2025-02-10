import * as fs from "fs";
import * as path from "path";
import { handleGetActivationStatus } from "../activation";
import { cloneDeep } from "lodash";
import type { CheckMaterialToReplaceParamType } from "../../utils/types";

// 此函数是在批量替换之前先检查预备的材料的充分性，需要双层结构
export const handleCheckMaterialToReplace = async (
  _event: any,
  param: CheckMaterialToReplaceParamType
) => {
  try {
    const activationStatus = handleGetActivationStatus();
    const { parentFolderDir, sourceExtnames } = param;
    if (parentFolderDir.length === 0) {
      return {
        status: "error",
        data: `未选择父文件夹。请你先点击"选择父文件夹"按钮。`,
      };
    }
    const childs = fs.readdirSync(parentFolderDir, { withFileTypes: true });
    const childFolders = childs.filter((item) => item.isDirectory());
    childFolders.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
    if (childFolders.length === 0) {
      return {
        status: "error",
        data: `父文件夹选择错误。${parentFolderDir} 里不存在任何子文件夹。请注意：你需要先把要替换的图片视频新素材放在一个文件夹里，再放在另一个文件夹里，形成两级文件夹结构，然后选择外层文件夹（如果你要新生成两个草稿，则该外层文件夹会包含两个子文件夹）。`,
      };
    }
    if (activationStatus.status === "trial" && childFolders.length > 5) {
      return {
        status: "error",
        data: `试用版可指定的父文件夹里最多只能包含5个子文件夹，即一次只能批量替换生成10份新草稿。而你指定的父文件夹里有${
          childFolders.length
        }个子文件夹，请考虑移出${
          childFolders.length - 5
        }个子文件夹，然后点击 "重新检查新素材数量" 按钮进行试用。如果试用满意，你可以考虑点击左侧的"激活软件"页购买正式版，正式版指定的父文件夹里可包含至多1000个子文件夹。`,
      };
    }
    if (childFolders.length > 1000) {
      return {
        status: "error",
        data: `父文件夹里最多只能包含1000个子文件夹，即一次只能批量替换生成1000份新草稿。而你指定的父文件夹里有${
          childFolders.length
        }个子文件夹，请考虑移出${
          childFolders.length - 1000
        }个子文件夹，然后点击 "重新检查新素材数量" 按钮。`,
      };
    }
    const sourceExtnameInfos: {childFolder: string, sourceExtnamesForOneChild: {extname: string, count: number, grandchilds: string[]}[]}[] = [];
    for (let i = 0; i < childFolders.length; i++) {
      const childFolder = childFolders[i];
      const childDir = path.join(parentFolderDir, childFolder.name);
      const grandchilds = fs.readdirSync(childDir);
      for (let j = 0; j < sourceExtnames.length; j++) {
        const sourceExtname = sourceExtnames[j];
        const materialCount = countExtname(sourceExtname.extname, grandchilds);
        if (materialCount !== sourceExtname.count) {
          const actWord = materialCount < sourceExtname.count ? "增加" : "删除";
          return {
            status: "error",
            data: `子文件夹 ${childFolder.name} 里有${materialCount}个${sourceExtname.extname}文件，但你刚才所选作参考依据的草稿里有${sourceExtname.count}个${sourceExtname.extname}文件。请考虑${actWord}子文件夹中的${sourceExtname.extname}文件使得数量相等，然后点击 "重新检查新素材数量" 按钮。请注意：替换素材时文件格式必须一致，比如你不可以将.mp4文件替换为.mov文件；如果遇到有多个相同后缀的文件，则按照字母顺序替换同轨道从左到右的素材。比如a.png在最左边, b.png在中间， c.png在右边。`,
          };
        }
        // @ts-ignore
        sourceExtname.grandchilds = listFiles(sourceExtname.extname, grandchilds);
      }
      const sourceExtnamesForOneChild = cloneDeep(sourceExtnames);
      sourceExtnameInfos.push({
        childFolder: childFolder.name,
        // @ts-ignore
        sourceExtnamesForOneChild,
      });
    }

    return {
      status: "success",
      data: { childFolders: childFolders.map(item => item.name), sourceExtnameInfos },
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