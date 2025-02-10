import * as fs from "fs";
import * as path from "path";
import { handleGetActivationStatus } from "../activation";
import type { ChangeFileLevelOne2TwoType } from "../../utils/types";

// 此函数是在批量替换之前先分析参考草稿的内容，得出需要替换什么样的文件格式，有多少个
export const handleChangeFileLevelOne2Two = async (
  _event: any,
  param: ChangeFileLevelOne2TwoType,
) => {
  const activationStatus = handleGetActivationStatus();
  if (activationStatus.status === "expired") {
    const expiredDate = new Date(activationStatus.gt * 1000).toLocaleDateString(
      "zh-CN",
      { timeZone: "Asia/Shanghai" }
    );
    return {
      status: "error",
      data: `该软件已经到期，无法执行此操作，过期日期是 ${expiredDate}。诚挚恳请您续费，请跳转到"激活软件"页面获取新的产品信息码和联系方式。`,
    };
  }
  try {
    const childs = fs.readdirSync(param.folderDir, { withFileTypes: true });
    const childFiles = childs.filter((item) => item.isFile() && item.name !== '.DS_Store');
    const childFileNames = childFiles.map(item => item.name);
    const childFileExtnames = childFileNames.map(item => path.extname(item));
    const extnameMap = new Map<string, number>();
    let mostCountExt = "";
    let mostCount = 0;
    childFileExtnames.forEach(ext => {
        if (ext.length === 0) {
            return;
        }
        const val = extnameMap.get(ext);
        const toSetVal = val === undefined ? 1 : val + 1;
        extnameMap.set(ext, toSetVal);
        if (toSetVal > mostCount) {
            mostCount = toSetVal;
            mostCountExt = ext;
        }
    });
    if (mostCount === 0) {
        return {
            status: "error",
            data: `该文件夹内没有任何文件。请注意：你需要把素材文件直接放入你选择的文件夹中。`,
        }
    }
    if (mostCount === 1) {
        return {
            status: "error",
            data: `该文件夹中，${mostCountExt}文件只有1个，不可以操作，需要至少2个。请你自行操作。如有疑问请点击 功能解释 按钮。`,
        }
    }
    if (mostCount > 100) {
        return {
            status: "error",
            data: `该文件夹中，${mostCountExt}文件有${mostCount}个，不可以操作，规则是最多100个。如有疑问请点击 功能解释 按钮。`,
        }
    }
    const filteredChildFileNames = childFileNames.filter(item => path.extname(item) === mostCountExt);
    if (filteredChildFileNames.length !== mostCount) {
        return {
            status: "error",
            data: `this should not happen`,
        }
    }
    filteredChildFileNames.forEach(filename => {
      const extOfFile = path.extname(filename);
      const prefixOfFile = filename.substring(0, filename.length - extOfFile.length);
      // if condition will not happen, just in case
      const subfoldername = prefixOfFile.length === 0 ? `${+new Date()}` : prefixOfFile;
      const subfolderpath = path.join(param.folderDir, subfoldername);
      if (fs.existsSync(subfolderpath)) {
        fs.rmSync(subfolderpath);
      }
      fs.mkdirSync(subfolderpath);
      fs.renameSync(path.join(param.folderDir, filename), path.join(subfolderpath, filename));
    });
    return {
      status: "success",
      data: {
        movedFileCount: mostCount,
        movedFileExt: mostCountExt,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};