import { getIsCapCut } from "./nationVal";
const JSONbig = require("json-bigint");
const semver = require("semver");

export const verifyDraftVersion = (jsonString: string) => {
  try {
    const jyConfigOriginal = JSONbig.parse(jsonString);
    const appVer = jyConfigOriginal.last_modified_platform.app_version;
    const isGoodVersion = () => {
      return getIsCapCut()
        ? semver.gte(appVer, "2.4.0")
        : semver.gte(appVer, "4.2.0");
    };
    if (isGoodVersion()) {
      return { status: "success" };
    } else {
      return {
        status: "error",
        data: getIsCapCut()
          ? `该草稿是由 CapCut ${appVer} 版本创建，太过于老旧。请下载最新版剪映软件后新建草稿。请注意：如果你在下载新版本后没有再次编辑本草稿，本草稿依然是属于旧版本草稿。`
          : `该草稿是由剪映${appVer}版本创建，太过于老旧。请下载最新版剪映软件后新建草稿。请注意：如果你在下载新版本后没有再次编辑本草稿，本草稿依然是属于旧版本草稿。`,
      };
    }
  } catch {
    return {
      status: "error",
      data: `检查草稿版本时出错，请确保你的草稿没有添加过带版权的模板（如果添加了需要新建一个草稿，仅删除模板无效）`,
    };
  }
};
