import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { getIsCapCut } from "../utils/nationVal";
import { app, BrowserWindow, dialog } from "electron";

export const handleLoadProjectInfos = () => {
  let jsonString;
  try {
    let infosPath = "";
    const homedir = os.userInfo().homedir;
    if (process.platform === "darwin") {
      infosPath = path.join(
        homedir,
        `Movies/${
          getIsCapCut() ? "CapCut" : "JianyingPro"
        }/User Data/Projects/com.lveditor.draft/root_meta_info.json`
      );
    } else if (process.platform === "win32") {
      infosPath = path.join(
        homedir,
        `AppData\\Local\\${
          getIsCapCut() ? "CapCut" : "JianyingPro"
        }\\User Data\\Projects\\com.lveditor.draft\\root_meta_info.json`
      );
    }
    if (infosPath === undefined) {
      return { status: "error", data: "Not supported OS" };
    }
    jsonString = fs.readFileSync(infosPath, { encoding: "utf8" });
  } catch (e) {
    return { status: "error", data: "你没安装剪映(或CapCut)" };
  }
  return { status: "success", data: jsonString };
};

export const handleGetAppVersion = async () => {
  return app.getVersion();
};

export const handleOpenDirectory = async (myWindow: BrowserWindow | null) => {
  if (myWindow === null) {
    return { status: "success", data: "" };
  }
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(myWindow, { properties: ['openDirectory']});
    if (canceled) {
      return { status: "success", data: "" };
    } else {
      const selectedDir = filePaths[0];
      return { status: "success", data: selectedDir };
    }
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}`};
  }
}

export const handleOpenFile = async (myWindow: BrowserWindow | null) => {
  if (myWindow === null) {
    return { status: "success", data: "" };
  }
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(myWindow, { properties: ['openFile']});
    if (canceled) {
      return { status: "success", data: "" };
    } else {
      const selectedFile = filePaths[0];
      return { status: "success", data: selectedFile };
    }
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}`};
  }
}