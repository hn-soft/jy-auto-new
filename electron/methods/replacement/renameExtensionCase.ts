import * as fs from "fs";
import * as path from "path";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import type { RenameExtensionCaseParamType,PInfoType } from "../../utils/types";

const Store = require("electron-store");
const store = new Store();

// 此函数该功能是重命名输出的文件，避免以日期命名
export const handleRenameExtensionCase = async (
  _event: any,
  param: RenameExtensionCaseParamType,
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
    const trialTimeLeft = store.get(STORE_KEY.TRIAL_TIME_LEFT);
    if (activationStatus.status === "trial" && trialTimeLeft === 0) {
      return {
        status: "error",
        data: `您的剩余试用次数为0。诚挚恳请您购买正式版，请跳转到"激活软件"页面获取产品信息码和联系方式。`,
      };
    }
    // 之所以 oftl 要用小于等于，是为了防止漏网之鱼让它掉到0以下。
    if (
      activationStatus.status === "official" &&
      activationStatus.tier === "basic" &&
      activationStatus.oftl <= 0
    ) {
      return {
        status: "error",
        data: `您在有效期内剩余可用次数为0。无法为您执行本操作。建议您考虑续费不限次数的正式版。`,
      };
    }
    const childs = fs.readdirSync(param.folderDir, { withFileTypes: true });
    const childFiles = childs.filter((item) => item.isFile() && !item.name.startsWith('.') && !item.name.startsWith('_'));
    const childFolders = childs.filter((item) => item.isDirectory() && !item.name.startsWith('.') && !item.name.startsWith('_'));
    const childFolderNames = childFolders.map(item => item.name);
    const renameActions = [];
    for (let i = 0; i < childFiles.length; i++) {
        const childFileName = childFiles[i].name;
        const pathOld = path.join(param.folderDir, childFileName);
        const suffix = path.extname(childFileName);
        const suffixToSet = param.isTargetCaseUpper ? suffix.toUpperCase() : suffix.toLowerCase();
        const prefix = childFileName.replace(/\.[^/.]+$/, "");
        const newFileName = `${prefix}${suffixToSet}`;
        const pathToSet = path.join(param.folderDir, newFileName);
        fs.renameSync(pathOld, pathToSet);
        renameActions.push({
            before: childFileName,
            after: newFileName,
        });
    }
    for (let i = 0; i < childFolderNames.length; i++) {
        const childFolderPath = path.join(param.folderDir, childFolderNames[i]);
        const grandchilds = fs.readdirSync(childFolderPath, { withFileTypes: true });
        const grandchildFiles = grandchilds.filter((item) => item.isFile() && !item.name.startsWith('.') && !item.name.startsWith('_'));
        const grandchildFileNames = grandchildFiles.map(item => item.name);
        for (let j = 0; j < grandchildFileNames.length; j++) {
            const grandchildFileName = grandchildFileNames[j];
            const pathOld = path.join(childFolderPath, grandchildFileName);
            const suffix = path.extname(grandchildFileName);
            const suffixToSet = param.isTargetCaseUpper ? suffix.toUpperCase() : suffix.toLowerCase();
            const prefix = grandchildFileName.replace(/\.[^/.]+$/, "");
            const newFileName = `${prefix}${suffixToSet}`;
            const pathToSet = path.join(childFolderPath, newFileName);
            fs.renameSync(pathOld, pathToSet);
            renameActions.push({
                before: `${childFolderNames[i]}/${grandchildFileName}`,
                after: newFileName,
            });
        }
    }

    return {
      status: "success",
      data: {
        actuallyRenamedCount: renameActions.length,
        renameActions,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};