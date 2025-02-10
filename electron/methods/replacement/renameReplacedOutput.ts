import * as fs from "fs";
import * as path from "path";
import { handleGetActivationStatus } from "../activation";
import { handleLoadProjectInfos } from "../common";
import { STORE_KEY } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
import type { RenameReplacedOutputParamType } from "../../utils/types";

// 此函数该功能是重命名输出的文件，避免以日期命名
export const handleRenameReplacedOutput = async (
  _event: any,
  param: RenameReplacedOutputParamType,
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
    const childFiles = childs.filter((item) => item.isFile() && item.name !== '.DS_Store');
    const suffixes = childFiles.map(item => path.extname(item.name));
    const prefixes = childFiles.map(item => item.name.replace(/\.[^/.]+$/, ""));

    const projectInfos = await handleLoadProjectInfos();
    if (projectInfos.status === "error") {
        return { status: "error", data: `不太可能出现的，获取草稿信息产生错误`};
    }
    let pInfoArr: {draft_name: string, tm_draft_modified: number, draft_fold_path: string }[] = [];
    try {
        const storeInfos = JSON.parse(projectInfos.data);
        pInfoArr = storeInfos.all_draft_store;
        if (!Array.isArray(pInfoArr)) {
          return { status: "error", data: `不太可能出现的，您没安装剪映或CapCut，或您刚安装后还没来得及新建任何草稿，所以无法使用`};
        }
        pInfoArr.sort((a, b) => b.tm_draft_modified - a.tm_draft_modified);
    } catch (e) {
        return { status: "error", data: `不太可能出现的，您没安装剪映或CapCut，或您刚安装后还没来得及新建任何草稿，所以无法使用`};
    }
    let actuallyRenamedCount = 0;
    for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        const suffix = suffixes[i];
        const pInfo = pInfoArr.find(p => p.draft_name === prefix);
        if (pInfo === undefined) {
            continue;
        }
        const mrPath = path.join(pInfo.draft_fold_path, "materialResources");
        console.log(mrPath);
        if (!fs.existsSync(mrPath)) {
            continue;
        }
        const mrchilds = fs.readdirSync(mrPath, { withFileTypes: true });
        const mrchildFiles = mrchilds.filter((item) => item.isFile() && item.name !== '.DS_Store');
        const mrchildFileNames = mrchildFiles.map((item) => item.name);
        const mrchildDirectories = mrchilds.filter((item) => item.isDirectory());
        const mrchildDirectoryNames = mrchildDirectories.map((item) => item.name);
        if (mrchildDirectories.length === 1) {
            // 按组精确替换的情形
            const groupSubFolderName = mrchildDirectoryNames[0];
            const filenameOld = `${prefix}${suffix}`;
            const pathOld = path.join(param.folderDir, filenameOld);
            const filenameToSet = `${groupSubFolderName}${suffix}`;
            const pathToSet = path.join(param.folderDir, filenameToSet);
            fs.renameSync(pathOld, pathToSet);
            actuallyRenamedCount++;
        } else if (mrchildDirectories.length === 0) {
            // （不分区）混剪情况
            if (mrchildFileNames.length === 1) {
                const filenameOld = `${prefix}${suffix}`;
                const pathOld = path.join(param.folderDir, filenameOld);
                const filenameToSet = `${mrchildFileNames[0].replace(/\.[^/.]+$/, "")}${suffix}`;
                const pathToSet = path.join(param.folderDir, filenameToSet);
                fs.renameSync(pathOld, pathToSet);
                actuallyRenamedCount++;
            }
        } else {
            // 分区的情况
        }
    }
    if (actuallyRenamedCount > 0) {
      store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    }
    return {
      status: "success",
      data: {
        actuallyRenamedCount,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};