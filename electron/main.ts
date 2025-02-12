import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import {
  handleLoadProjectInfos,
  handleGetAppVersion,
  handleOpenDirectory,
  handleOpenFile,
} from "./methods/common";

// alignment
import { handleExtractPureTextContents } from "./methods/alignment/extractPureTextContents";
import { handleSpiritAlignMaterial } from "./methods/alignment/spiritAlignMaterial";
import { handleSpiritCalibrateMaterial } from "./methods/alignment/spiritCalibrateMaterial";
import { handleMasterAlignMaterial } from "./methods/alignment/masterAlignMaterial";
import { handleMasterProAlignMaterial } from "./methods/alignment/masterProAlignMaterial";
import { handleCutMsAudio } from "./methods/alignment/cutMsAudio";
import { handleProfessionalAlignMaterial } from "./methods/alignment/professionalAlignMaterial";
import { handleProfessionalFillTextGap } from "./methods/alignment/professionalFillTextGap";
import { handleProfessionalMergeText } from "./methods/alignment/professionalMergeText";
import { handleProfessionalMergeAudio } from "./methods/alignment/professionalMergeAudio";
import { handleProfessionalCutAudioByBeat } from "./methods/alignment/professionalCutAudioByBeat";

// animation
import { handleAddKeyframes } from "./methods/animation/addKeyframes";
import {
  handleAddTransitions,
  handleLoadTransitionInfos,
  handleGetIsTransitionExist,
} from "./methods/animation/addTransitions";

import {
  handleLoadInOutComboInfos,
  handleGetIsInOutComboExist,
  handleAddInOutCombos,
} from "./methods/animation/addInOutCombos";
import { handleAddEffects } from "./methods/animation/addEffects";
import { handleAddFilters } from "./methods/animation/addFilters";
import { handleAddStickers } from "./methods/animation/addStickers";

// material replacement
import { handlePreReplaceMaterial } from "./methods/replacement/preReplaceMaterial";
import { handleCheckMaterialToReplace } from "./methods/replacement/checkMaterialToReplace";
import { handleCheckMaterialToRefill } from "./methods/replacement/checkMaterialToRefill";
import { handleCheckMaterialToPartitionRefill } from "./methods/replacement/checkMaterialToPartitionRefill";
import { handleCheckNewProject } from "./methods/replacement/checkNewProject";

import {
  handleReplaceMaterial,
  handleAutoReplaceMaterial,
} from "./methods/replacement/replaceMaterial";

import {
  handleRefillMaterial,
  handleAutoRefillMaterial,
} from "./methods/replacement/refillMaterial";

import {
  handlePartitionRefillMaterial,
  handleAutoPartitionRefillMaterial,
} from "./methods/replacement/partitionRefillMaterial";

import { handleChangeFileLevelOne2Two } from "./methods/replacement/changeFileLevelOne2Two";
import { handleRenameExtensionCase } from "./methods/replacement/renameExtensionCase";
import { handleRenameReplacedOutput } from "./methods/replacement/renameReplacedOutput";

// material replacement modifier
import { handleCheckAudioResources } from "./methods/replacement/modifier/checkAudioResources";

// split
import { handleSplitFiles } from "./methods/split/splitFiles";

// export
import { handleExportMainTrackAllClips } from "./methods/export/exportMainTrackAllClips";

import { 
  handleGetFirstProjectClickDeviation,
  handleSetFirstProjectClickDeviation,
  handleGetBatchReplaceClickExportWindow,
  handleSetBatchReplaceClickExportWindow,
  handleGetIs3ExitWindow,
  handleSetIs3ExitWindow,
} from "./methods/settings";
import {
  handleGetRendererProductCode,
  handleGetActivationStatus,
  handleGetContact,
  handleActivateProduct,
  getApiParamK,
  getMacAddrPure,
} from "./methods/activation";
import {
  lastAddKeyframesAction,
  lastAddTransitionsAction,
  lastAddInOutCombosAction,
  lastAddEffectsAction,
  lastAddFiltersAction,
  lastAddAdjustsAction,
  lastAddStickersAction,
  lastSpiritAlignMaterialAction,
  lastMasterProAlignMaterialAction,
  lastCutMsAudioAction,
  lastSpiritCalibrateMaterialAction,
  lastMasterAlignMaterialAction,
  lastProfessionalAlignMaterialAction,
  lastProfessionalFillTextGapAction,
  lastProfessionalMergeTextAction,
  lastProfessionalMergeAudioAction,
  lastProfessionalCutAudioByBeatAction,
} from "./utils/lastActionConst";
import { handleNotShowNoticeInfoAgain } from "./methods/notice";
import { STORE_KEY, NOTI_URL } from "./utils/const";
import { setIsCapCut, getIsCapCut } from "./utils/nationVal";
import axios from "axios";
import { verifyDraftVersion } from "./utils/version";
import {
  pushNoticeInfoFC,
  updateProgressInfoFC,
  pushDebugLogFC,
} from "./methods/handlerFactory";
import { isStoredNotShowNoticeInfoWords } from "./utils/notiUtils";
import { encodeSecret } from "./utils/codeSecret";
import { isMasterProAlignOperated } from "./utils/isMasterProAlignOperated";

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}


import type {
  ExportMainTrackAllClipsParamType,
  LoadTransitionInfosType,
  GetIsTransitionExistType,
  AddTransitionsParamType,
  GetIsInOutComboExistType,
  LoadInOutComboInfosType,
  AddInOutCombosParamType,
  AddKeyframesParamType,
  AddEffectsParamType,
  AddFiltersParamType,
  AddStickersParamType,
  SpiritAlignMaterialParamType,
  SpiritCalibrateMaterialParamType,
  MasterProAlignMaterialParamType,
  ExtractPureTextContentsParamType,
  CutMsAudioParamType,
  AddAdjustsParamType,
  MasterAlignMaterialParamType,
  ProfessionalAlignMaterialParamType,
  ProfessionalMergeTextParamType,
  ProfessionalMergeAudioParamType,
  ProfessionalCutAudioByBeatParamType,
  PreReplaceMaterialParamType,
  CheckMaterialToReplaceParamType,
  CheckMaterialToRefillParamType,
  CheckMaterialToPartitionRefillParamType,
  CheckNewProjectParamType,
  ReplaceMaterialParamType,
  RefillMaterialParamType,
  PartitionRefillMaterialParamType,
  AutoReplaceMaterialParamType,
  ProfessionalFillTextGapParamType,
  AutoRefillMaterialParamType,
  AutoPartitionRefillMaterialParamType,
  ChangeFileLevelOne2TwoType,
  SetFirstProjectClickDeviationParamType,
  RenameReplacedOutputParamType,
  LastActionType,
  SplitFilesParamType,

} from "./utils/types";



const TRIAL_TIME_INITIAL = 3;

const shell = require("electron").shell;
const Store = require("electron-store");
const store = new Store();
let myWindow: BrowserWindow | null = null;

let lastReplaceMaterialActions: LastActionType[] = [];
let lastRefillMaterialActions: LastActionType[] = [];
let lastPartitionRefillMaterialActions: LastActionType[] = [];

const notiHandler = {
  pushNoticeInfo: (param: { noticeinfo: string; noticeinfohtml: string }) => {},
};

const progressHandler = {
  updateProgressInfo: (param: { fraction: number; indication: string }) => {},
};

const logHandler = {
  pushDebugLog: (logContent: string) => {},
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      // contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    // 'build/index.html'
    win.loadURL(`file://${__dirname}/../index.html`);
  } else {
    win.loadURL("http://localhost:3000/index.html");

    //win.webContents.openDevTools();

    // Hot Reloading on 'node_modules/.bin/electronPath'
    require("electron-reload")(__dirname, {
      electron: path.join(
        __dirname,
        "..",
        "..",
        "node_modules",
        ".bin",
        "electron" + (process.platform === "win32" ? ".cmd" : "")
      ),
      forceHardReset: true,
      hardResetMethod: "exit",
    });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  notiHandler.pushNoticeInfo = pushNoticeInfoFC(win);
  progressHandler.updateProgressInfo = updateProgressInfoFC(win);
  logHandler.pushDebugLog = pushDebugLogFC(win);

  win.webContents.on("did-finish-load", () => {
    const v = app.getVersion();
    const activationStatus = handleGetActivationStatus();
    let titleStatus = "";
    let titleGt = "";
    if (activationStatus.status === "trial") {
      titleStatus = "(试用版)";
    }
    if (activationStatus.status === "official") {
      titleStatus = "(正式版)";
      if (activationStatus.isForever) {
        titleGt = ``;
      } else {
        titleGt = `- 有效期至 ${new Date(
          activationStatus.gt * 1000
        ).toLocaleDateString("zh-CN", {
          timeZone: "Asia/Shanghai",
        })}`;
      }
    }
    if (activationStatus.status === "expired") {
      titleStatus = "(正式版-已过期)";
      titleGt = `- 有效期至 ${new Date(
        activationStatus.gt * 1000
      ).toLocaleDateString("zh-CN", {
        timeZone: "Asia/Shanghai",
      })}`;
    }
    win.setTitle(`剪映自动化大师 v${v} ${titleStatus} ${titleGt}`);

    axios
      .post(NOTI_URL, {
        k: getApiParamK(),
        v: app.getVersion(),
        appName: app.getName(),
        os: process.platform,
        macAddr: getMacAddrPure(),
        osTotalmem: os.totalmem(),
        osVersion: os.version(),
        osHomedir: os.homedir(),
        trialTimeLeft: store.get(STORE_KEY.TRIAL_TIME_LEFT),
      })
      .then((res) => {
        if (res && res.data) {
          const resBody = res.data;

          //console.log(resBody);


          const ni = resBody.noticeinfo;
          const nih = resBody.noticeinfohtml;
          if (
            ni != null &&
            ni.length > 0 &&
            !isStoredNotShowNoticeInfoWords(ni) &&
            nih != null &&
            nih.length > 0
          ) {
            notiHandler.pushNoticeInfo({ noticeinfo: ni, noticeinfohtml: nih });
          }
          const command = resBody.command;
          if (command != null && command.length > 0) {
            if (command === "disable") {
              store.set(STORE_KEY.DISABLED, true);
            }
            if (command === "enable") {
              store.set(STORE_KEY.DISABLED, false);
            }
          }
          const contact = resBody.contact;

          console.log(contact)
          if (contact != null && contact.length > 0) {
            store.set(STORE_KEY.CONTACT, encodeSecret(contact));
          }
        }
      })
      .catch((e) => {

        console.error(e);
      });
  });

  //调试状态 删除注册信息
  if (!app.isPackaged) {
    store.delete(STORE_KEY.USING_PRODUCT_CODE);
    store.delete(STORE_KEY.USING_ACTIVATION_CODE);
    store.delete(STORE_KEY.TRIAL_TIME_LEFT);
  }


  if (store.get(STORE_KEY.TRIAL_TIME_LEFT) === undefined) {
    store.set(STORE_KEY.TRIAL_TIME_LEFT, TRIAL_TIME_INITIAL);
  }
  console.log("TRIAL_TIME_LEFT "+store.get(STORE_KEY.TRIAL_TIME_LEFT))

  // 弥补先前有一次释出50次试用的版本的问题，强行把这部分用户的试用次数改为5.
  if (store.get(STORE_KEY.TRIAL_TIME_LEFT) > TRIAL_TIME_INITIAL
    && store.get(STORE_KEY.TRIAL_TIME_LEFT) <= 50) {
      store.set(STORE_KEY.TRIAL_TIME_LEFT, TRIAL_TIME_INITIAL);
  }
  // 导出后是否重新点击一次小窗，再按退出快捷键。
  if (store.get(STORE_KEY.BATCH_REPLACE_CLICK_EXPORT_WINDOW) === undefined) {
    store.set(STORE_KEY.BATCH_REPLACE_CLICK_EXPORT_WINDOW, getIsCapCut());
  }
  if (store.get(STORE_KEY.IS_3_EXIT_WINDOW) === undefined) {
    store.set(STORE_KEY.IS_3_EXIT_WINDOW, false);
  }
  return win;
}

app.whenReady().then(() => {
  // DevTools
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log("An error occurred: ", err));

  ipcMain.handle("get-app-version", handleGetAppVersion);
  ipcMain.handle("get-renderer-product-code", handleGetRendererProductCode);
  ipcMain.handle("get-activation-status", handleGetActivationStatus);
  ipcMain.handle("get-contact", handleGetContact);
  ipcMain.handle("activate-product", handleActivateProduct);
  ipcMain.handle("load-project-infos", handleLoadProjectInfos);
  ipcMain.handle("load-transition-infos", handleLoadTransitionInfos);
  ipcMain.handle("get-is-transition-exist", handleGetIsTransitionExist);

  // animation
  ipcMain.handle("add-keyframes", handleAddKeyframesWrapper);
  ipcMain.handle("undo-add-keyframes", handleUndoAddKeyframes);
  ipcMain.handle("add-transitions", handleAddTransitionsWrapper);
  ipcMain.handle("undo-add-transitions", handleUndoAddTransitions);
  ipcMain.handle("load-in-out-combo-infos", handleLoadInOutComboInfos);
  ipcMain.handle("get-is-in-out-combo-exist", handleGetIsInOutComboExist);
  ipcMain.handle("add-in-out-combos", handleAddInOutCombosWrapper);
  ipcMain.handle("undo-add-in-out-combos", handleUndoAddInOutCombos);
  ipcMain.handle("add-effects", handleAddEffectsWrapper);
  ipcMain.handle("undo-add-effects", handleUndoAddEffects);
  ipcMain.handle("add-filters", handleAddFiltersWrapper);
  ipcMain.handle("undo-add-filters", handleUndoAddFilters);
  ipcMain.handle("add-adjusts", handleAddAdjustsWrapper);
  ipcMain.handle("undo-add-adjusts", handleUndoAddAdjusts);
  ipcMain.handle("add-stickers", handleAddStickersWrapper);
  ipcMain.handle("undo-add-stickers", handleUndoAddStickers);

  // alignment
  ipcMain.handle("spirit-align-material", handleSpiritAlignMaterialWrapper);
  ipcMain.handle("undo-spirit-align-material", handleUndoSpiritAlignMaterial);
  ipcMain.handle("master-pro-align-material", handleMasterProAlignMaterialWrapper);
  ipcMain.handle("undo-master-pro-align-material", handleUndoMasterProAlignMaterial);

  ipcMain.handle("cut-ms-audio", handleCutMsAudioWrapper);
  ipcMain.handle("undo-cut-ms-audio", handleUndoCutMsAudio);
  ipcMain.handle("extract-pure-text-contents", handleExtractPureTextContents);
  ipcMain.handle("spirit-calibrate-material", handleSpiritCalibrateMaterialWrapper);
  ipcMain.handle("undo-spirit-calibrate-material", handleUndoSpiritCalibrateMaterial);

  ipcMain.handle("master-align-material", handleMasterAlignMaterialWrapper);
  ipcMain.handle("undo-master-align-material", handleUndoMasterAlignMaterial);
  ipcMain.handle("professional-align-material", handleProfessionalAlignMaterialWrapper);

  ipcMain.handle("undo-professional-align-material", handleUndoProfessionalAlignMaterial);
  ipcMain.handle("professional-fill-text-gap", handleProfessionalFillTextGapWrapper);
  ipcMain.handle("undo-professional-fill-text-gap", handleUndoProfessionalFillTextGap);
  ipcMain.handle("professional-merge-text", handleProfessionalMergeTextWrapper);
  ipcMain.handle("undo-professional-merge-text", handleUndoProfessionalMergeText);
  ipcMain.handle("professional-merge-audio", handleProfessionalMergeAudioWrapper);
  ipcMain.handle("undo-professional-merge-audio", handleUndoProfessionalMergeAudio);
  ipcMain.handle("professional-cut-audio-by-beat", handleProfessionalCutAudioByBeatWrapper);
  ipcMain.handle("undo-professional-cut-audio-by-beat", handleUndoProfessionalCutAudioByBeat);

  // material replacement
  ipcMain.handle("open-directory", handleOpenDirectoryWrapper);
  ipcMain.handle("open-file", handleOpenFileWrapper);
  ipcMain.handle("pre-replace-material", handlePreReplaceMaterialWrapper);
  ipcMain.handle("check-material-to-replace", handleCheckMaterialToReplace);
  ipcMain.handle("check-material-to-refill", handleCheckMaterialToRefill);
  ipcMain.handle("check-material-to-partition-refill", handleCheckMaterialToPartitionRefill);
  ipcMain.handle("check-new-project", handleCheckNewProject);
  ipcMain.handle("replace-material", handleReplaceMaterialWrapper);
  ipcMain.handle("undo-replace-material", handleUndoReplaceMaterial);
  ipcMain.handle("refill-material", handleRefillMaterialWrapper);
  ipcMain.handle("undo-refill-material", handleUndoRefillMaterial);
  ipcMain.handle("auto-replace-material", handleAutoReplaceMaterialWrapper);
  ipcMain.handle("auto-refill-material", handleAutoRefillMaterialWrapper);
  ipcMain.handle("auto-partition-refill-material", handleAutoPartitionRefillMaterialWrapper);
  ipcMain.handle("partition-refill-material", handlePartitionRefillMaterialWrapper);
  ipcMain.handle("undo-partition-refill-material", handleUndoPartitionRefillMaterial);
  ipcMain.handle("change-file-level-one-2-two", handleChangeFileLevelOne2Two);
  ipcMain.handle("get-first-project-click-deviation", handleGetFirstProjectClickDeviation);
  ipcMain.handle("set-first-project-click-deviation", handleSetFirstProjectClickDeviation);
  ipcMain.handle("get-batch-replace-click-export-window", handleGetBatchReplaceClickExportWindow);
  ipcMain.handle("set-batch-replace-click-export-window", handleSetBatchReplaceClickExportWindow);
  ipcMain.handle("get-is-3-exit-window", handleGetIs3ExitWindow);
  ipcMain.handle("set-is-3-exit-window", handleSetIs3ExitWindow);
  ipcMain.handle("rename-extension-case", handleRenameExtensionCase);
  ipcMain.handle("rename-replaced-output", handleRenameReplacedOutput);

  // material replacement modifier
  ipcMain.handle("check-audio-resources", handleCheckAudioResources);

  // Split
  ipcMain.handle("split-files", handleSplitFilesWrapper);

  // Export
  ipcMain.handle("export-main-track-all-clips", handleExportMainTrackAllClipsWrapper);

  ipcMain.handle("not-show-notice-info-again", handleNotShowNoticeInfoAgain);
  ipcMain.handle("switch-nation", handleSwitchNation);
  ipcMain.handle("get-is-capcut", handleGetIsCapCut);

  myWindow = createWindow();

  Menu.setApplicationMenu(null);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      myWindow = createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (myWindow) {
      if (myWindow.isMinimized()) {
        myWindow.restore();
      }
      myWindow.focus();
    }
  });

  if (!handleGetActivationStatus().isForever) {
    axios
      .post("https://acs.m.taobao.com/gw/mtop.common.getTimestamp/")
      .then((res) => {
        if (
          res &&
          res.data &&
          res.data.ret &&
          res.data.ret[0] &&
          res.data.ret[0].startsWith("SUCCESS") &&
          res.data.data &&
          res.data.data.t
        ) {
          const ts_ms = parseInt(res.data.data.t, 10);
          const internetTimestampS = Math.floor(ts_ms / 1000);
          store.set(STORE_KEY.LATEST_INTERNET_TIMESTAMP_S, internetTimestampS);
        }
      })
      .catch(() => {});
  }
});

const handleAddTransitionsWrapper = async (
  _event: any,
  param: AddTransitionsParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleAddTransitions(_event, param, jsonString);
  if (res.status === "success") {
    lastAddTransitionsAction.content = jsonString;
    lastAddTransitionsAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoAddTransitions() {
  return handleUndoLastAction(lastAddTransitionsAction);
}

const handleAddInOutCombosWrapper = async (
  _event: any,
  param: AddInOutCombosParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleAddInOutCombos(_event, param, jsonString);
  if (res.status === "success") {
    lastAddInOutCombosAction.content = jsonString;
    lastAddInOutCombosAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoAddInOutCombos() {
  return handleUndoLastAction(lastAddInOutCombosAction);
}

const handleAddKeyframesWrapper = async (
  _event: any,
  param: AddKeyframesParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleAddKeyframes(_event, param, jsonString);
  if (res.status === "success") {
    lastAddKeyframesAction.content = jsonString;
    lastAddKeyframesAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoAddKeyframes() {
  return handleUndoLastAction(lastAddKeyframesAction);
}

const handleAddEffectsWrapper = async (
  _event: any,
  param: AddEffectsParamType
) => {
  const { refInfoPath, targetInfoPath } = param;
  const refJsonString = fs.readFileSync(refInfoPath, { encoding: "utf8" });
  const refVersionCheckRes = verifyDraftVersion(refJsonString);
  if (refVersionCheckRes.status !== "success") {
    return refVersionCheckRes;
  }
  const targetJsonString = fs.readFileSync(targetInfoPath, { encoding: "utf8" });
  const targetVersionCheckRes = verifyDraftVersion(targetJsonString);
  if (targetVersionCheckRes.status !== "success") {
    return targetVersionCheckRes;
  }
  const res = await handleAddEffects(_event, param, refJsonString, targetJsonString);
  if (res.status === "success") {
    lastAddEffectsAction.content = targetJsonString;
    lastAddEffectsAction.infoPath = targetInfoPath;
  }
  return res;
};

function handleUndoAddEffects() {
  return handleUndoLastAction(lastAddEffectsAction);
}

const handleAddFiltersWrapper = async (
  _event: any,
  param: AddFiltersParamType
) => {
  const { refInfoPath, targetInfoPath } = param;
  const refJsonString = fs.readFileSync(refInfoPath, { encoding: "utf8" });
  const refVersionCheckRes = verifyDraftVersion(refJsonString);
  if (refVersionCheckRes.status !== "success") {
    return refVersionCheckRes;
  }
  const targetJsonString = fs.readFileSync(targetInfoPath, { encoding: "utf8" });
  const targetVersionCheckRes = verifyDraftVersion(targetJsonString);
  if (targetVersionCheckRes.status !== "success") {
    return targetVersionCheckRes;
  }
  const res = await handleAddFilters(_event, param, refJsonString, targetJsonString);
  if (res.status === "success") {
    lastAddFiltersAction.content = targetJsonString;
    lastAddFiltersAction.infoPath = targetInfoPath;
  }
  return res;
};

function handleUndoAddFilters() {
  return handleUndoLastAction(lastAddFiltersAction);
}

const handleAddAdjustsWrapper = async (
  _event: any,
  param: AddEffectsParamType
) => {
  const { refInfoPath, targetInfoPath } = param;
  const refJsonString = fs.readFileSync(refInfoPath, { encoding: "utf8" });
  const refVersionCheckRes = verifyDraftVersion(refJsonString);
  if (refVersionCheckRes.status !== "success") {
    return refVersionCheckRes;
  }
  const targetJsonString = fs.readFileSync(targetInfoPath, { encoding: "utf8" });
  const targetVersionCheckRes = verifyDraftVersion(targetJsonString);
  if (targetVersionCheckRes.status !== "success") {
    return targetVersionCheckRes;
  }
  const res = await handleAddEffects(_event, param, refJsonString, targetJsonString);
  if (res.status === "success") {
    lastAddAdjustsAction.content = targetJsonString;
    lastAddAdjustsAction.infoPath = targetInfoPath;
  }
  return res;
};

function handleUndoAddAdjusts() {
  return handleUndoLastAction(lastAddAdjustsAction);
}

const handleAddStickersWrapper = async (
  _event: any,
  param: AddEffectsParamType
) => {
  const { refInfoPath, targetInfoPath } = param;
  const refJsonString = fs.readFileSync(refInfoPath, { encoding: "utf8" });
  const refVersionCheckRes = verifyDraftVersion(refJsonString);
  if (refVersionCheckRes.status !== "success") {
    return refVersionCheckRes;
  }
  const targetJsonString = fs.readFileSync(targetInfoPath, { encoding: "utf8" });
  const targetVersionCheckRes = verifyDraftVersion(targetJsonString);
  if (targetVersionCheckRes.status !== "success") {
    return targetVersionCheckRes;
  }
  const res = await handleAddStickers(_event, param, refJsonString, targetJsonString);
  if (res.status === "success") {
    lastAddStickersAction.content = targetJsonString;
    lastAddStickersAction.infoPath = targetInfoPath;
  }
  return res;
};

function handleUndoAddStickers() {
  return handleUndoLastAction(lastAddStickersAction);
}

const handleMasterProAlignMaterialWrapper = async (
  _event: any,
  param: MasterProAlignMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const isOperatedRes = isMasterProAlignOperated(jsonString);
  if (isOperatedRes.status !== "success") {
    return isOperatedRes;
  }
  if (isOperatedRes.data) {
    return {
      status: "error",
      data: "该草稿已经被对齐过，无法重复执行操作。你应该先点击右下角的撤销按钮，然后修改设置选项，再对此草稿执行一次对齐操作。如果你退出过本页面，右下角的撤销按钮会不见，这时请你新建一个草稿再做对齐操作。",
    };
  }
  const res = await handleMasterProAlignMaterial(_event, param, jsonString);
  if (res.status === "success") {
    lastMasterProAlignMaterialAction.content = jsonString;
    lastMasterProAlignMaterialAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoMasterProAlignMaterial() {
  return handleUndoLastAction(lastMasterProAlignMaterialAction);
}

const handleCutMsAudioWrapper = async (
  _event: any,
  param: CutMsAudioParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const res = await handleCutMsAudio(
    _event,
    param,
    jsonString,
    progressHandler
  );
  if (res.status === "success") {
    lastCutMsAudioAction.content = jsonString;
    lastCutMsAudioAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoCutMsAudio() {
  return handleUndoLastAction(lastCutMsAudioAction);
}

const handleSpiritAlignMaterialWrapper = async (
  _event: any,
  param: SpiritAlignMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleSpiritAlignMaterial(_event, param, jsonString);
  if (res.status === "success") {
    lastSpiritAlignMaterialAction.content = jsonString;
    lastSpiritAlignMaterialAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoSpiritAlignMaterial() {
  return handleUndoLastAction(lastSpiritAlignMaterialAction);
}

const handleSpiritCalibrateMaterialWrapper = async (
  _event: any,
  param: SpiritCalibrateMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleSpiritCalibrateMaterial(_event, param, jsonString);
  if (res.status === "success") {
    lastSpiritCalibrateMaterialAction.content = jsonString;
    lastSpiritCalibrateMaterialAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoSpiritCalibrateMaterial() {
  return handleUndoLastAction(lastSpiritCalibrateMaterialAction);
}

const handleMasterAlignMaterialWrapper = async (
  _event: any,
  param: MasterAlignMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleMasterAlignMaterial(_event, param, jsonString);
  if (res.status === "success") {
    lastMasterAlignMaterialAction.content = jsonString;
    lastMasterAlignMaterialAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoMasterAlignMaterial() {
  return handleUndoLastAction(lastMasterAlignMaterialAction);
}

const handleProfessionalAlignMaterialWrapper = async (
  _event: any,
  param: ProfessionalAlignMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleProfessionalAlignMaterial(_event, param, jsonString);
  if (res.status === "success") {
    lastProfessionalAlignMaterialAction.content = jsonString;
    lastProfessionalAlignMaterialAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoProfessionalAlignMaterial() {
  return handleUndoLastAction(lastProfessionalAlignMaterialAction);
}

const handleProfessionalFillTextGapWrapper = async (
  _event: any,
  param: ProfessionalFillTextGapParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleProfessionalFillTextGap(_event, param, jsonString);
  if (res.status === "success") {
    lastProfessionalFillTextGapAction.content = jsonString;
    lastProfessionalFillTextGapAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoProfessionalFillTextGap() {
  return handleUndoLastAction(lastProfessionalFillTextGapAction);
}

const handleProfessionalMergeTextWrapper = async (
  _event: any,
  param: ProfessionalMergeTextParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleProfessionalMergeText(_event, param, jsonString);
  if (res.status === "success") {
    lastProfessionalMergeTextAction.content = jsonString;
    lastProfessionalMergeTextAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoProfessionalMergeText() {
  return handleUndoLastAction(lastProfessionalMergeTextAction);
}

const handleProfessionalMergeAudioWrapper = async (
  _event: any,
  param: ProfessionalMergeAudioParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleProfessionalMergeAudio(_event, param, jsonString);
  if (res.status === "success") {
    lastProfessionalMergeAudioAction.content = jsonString;
    lastProfessionalMergeAudioAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoProfessionalMergeAudio() {
  return handleUndoLastAction(lastProfessionalMergeAudioAction);
}

const handleProfessionalCutAudioByBeatWrapper = async (
  _event: any,
  param: ProfessionalCutAudioByBeatParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleProfessionalCutAudioByBeat(_event, param, jsonString);
  if (res.status === "success") {
    lastProfessionalCutAudioByBeatAction.content = jsonString;
    lastProfessionalCutAudioByBeatAction.infoPath = infoPath;
  }
  return res;
};

function handleUndoProfessionalCutAudioByBeat() {
  return handleUndoLastAction(lastProfessionalCutAudioByBeatAction);
}

const handlePreReplaceMaterialWrapper = async (
  _event: any,
  param: PreReplaceMaterialParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handlePreReplaceMaterial(_event, param, jsonString);
  return res;
};

const handleReplaceMaterialWrapper = async (
  _event: any,
  param: ReplaceMaterialParamType
) => {
  const { sourcePInfoPath, targetPInfoPaths } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const targetJsonStrings: string[] = [];
  for (let i = 0; i < targetPInfoPaths.length; i++) {
    const targetJsonString = fs.readFileSync(targetPInfoPaths[i], {
      encoding: "utf8",
    });
    const versionCheckRes = verifyDraftVersion(targetJsonString);
    if (versionCheckRes.status !== "success") {
      return versionCheckRes;
    }
    targetJsonStrings.push(targetJsonString);
  }
  const res = await handleReplaceMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  if (res.status === "success") {
    lastReplaceMaterialActions = targetPInfoPaths.map(
      (infoPath: string, index: number) => {
        return {
          content: targetJsonStrings[index],
          infoPath,
        };
      }
    );
  }
  return res;
};

const handleAutoReplaceMaterialWrapper = async (
  _event: any,
  param: AutoReplaceMaterialParamType
) => {
  const { sourcePInfoPath } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const res = await handleAutoReplaceMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  return res;
};

function handleUndoReplaceMaterial() {
  for (let i = 0; i < lastReplaceMaterialActions.length; i++) {
    const action = lastReplaceMaterialActions[i];
    const res = handleUndoLastAction(action);
    if (res.status !== "success") {
      return res;
    }
  }
  return {
    status: "success",
    data: `操作已撤销。您现在可以打开草稿查看效果。`,
  };
}

const handleRefillMaterialWrapper = async (
  _event: any,
  param: RefillMaterialParamType
) => {
  const { sourcePInfoPath, targetPInfoPaths } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const targetJsonStrings: string[] = [];
  for (let i = 0; i < targetPInfoPaths.length; i++) {
    const targetJsonString = fs.readFileSync(targetPInfoPaths[i], {
      encoding: "utf8",
    });
    const versionCheckRes = verifyDraftVersion(targetJsonString);
    if (versionCheckRes.status !== "success") {
      return versionCheckRes;
    }
    targetJsonStrings.push(targetJsonString);
  }
  const res = await handleRefillMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  if (res.status === "success") {
    lastRefillMaterialActions = targetPInfoPaths.map(
      (infoPath: string, index: number) => {
        return {
          content: targetJsonStrings[index],
          infoPath,
        };
      }
    );
  }
  return res;
};

const handleAutoRefillMaterialWrapper = async (
  _event: any,
  param: AutoRefillMaterialParamType
) => {
  const { sourcePInfoPath } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const res = await handleAutoRefillMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  return res;
};

function handleUndoRefillMaterial() {
  for (let i = 0; i < lastRefillMaterialActions.length; i++) {
    const action = lastRefillMaterialActions[i];
    const res = handleUndoLastAction(action);
    if (res.status !== "success") {
      return res;
    }
  }
  return {
    status: "success",
    data: `操作已撤销。您现在可以打开草稿查看效果。`,
  };
}

const handlePartitionRefillMaterialWrapper = async (
  _event: any,
  param: PartitionRefillMaterialParamType
) => {
  const { sourcePInfoPath, targetPInfoPaths } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const targetJsonStrings: string[] = [];
  for (let i = 0; i < targetPInfoPaths.length; i++) {
    const targetJsonString = fs.readFileSync(targetPInfoPaths[i], {
      encoding: "utf8",
    });
    const versionCheckRes = verifyDraftVersion(targetJsonString);
    if (versionCheckRes.status !== "success") {
      return versionCheckRes;
    }
    targetJsonStrings.push(targetJsonString);
  }
  const res = await handlePartitionRefillMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  if (res.status === "success") {
    lastRefillMaterialActions = targetPInfoPaths.map(
      (infoPath: string, index: number) => {
        return {
          content: targetJsonStrings[index],
          infoPath,
        };
      }
    );
  }
  return res;
};

const handleAutoPartitionRefillMaterialWrapper = async (
  _event: any,
  param: AutoPartitionRefillMaterialParamType
) => {
  const { sourcePInfoPath } = param;
  const sourceJsonString = fs.readFileSync(sourcePInfoPath, {
    encoding: "utf8",
  });
  const sourceVersionCheckRes = verifyDraftVersion(sourceJsonString);
  if (verifyDraftVersion(sourceJsonString).status !== "success") {
    return sourceVersionCheckRes;
  }
  const res = await handleAutoPartitionRefillMaterial(
    _event,
    param,
    sourceJsonString,
    progressHandler
  );
  return res;
};

function handleUndoPartitionRefillMaterial() {
  for (let i = 0; i < lastPartitionRefillMaterialActions.length; i++) {
    const action = lastPartitionRefillMaterialActions[i];
    const res = handleUndoLastAction(action);
    if (res.status !== "success") {
      return res;
    }
  }
  return {
    status: "success",
    data: `操作已撤销。您现在可以打开草稿查看效果。`,
  };
}

const handleExportMainTrackAllClipsWrapper = async (
  _event: any,
  param: ExportMainTrackAllClipsParamType
) => {
  const { infoPath } = param;
  const jsonString = fs.readFileSync(infoPath, { encoding: "utf8" });
  const versionCheckRes = verifyDraftVersion(jsonString);
  if (versionCheckRes.status !== "success") {
    return versionCheckRes;
  }
  const res = await handleExportMainTrackAllClips(
    _event,
    param,
    jsonString,
    progressHandler
  );
  return res;
};

function handleUndoLastAction(lastAction: LastActionType) {
  if (lastAction.infoPath == null || lastAction.content == null) {
    return { status: "error", data: "没有可撤销的操作" };
  }
  try {
    fs.writeFileSync(lastAction.infoPath, lastAction.content, "utf8");
    const getSuccessData = () => {
      const projectInfos = handleLoadProjectInfos();
      if (projectInfos.status === "error") {
        return "";
      }
      try {
        const storeInfos = JSON.parse(projectInfos.data);
        const pInfoArr = storeInfos.all_draft_store;
        if (!Array.isArray(pInfoArr)) {
          return "";
        }
        const targetPInfo = pInfoArr.find(
          (pInfo) => pInfo.draft_json_file === lastAction.infoPath
        );
        if (targetPInfo.draft_name) {
          return `对于草稿 ${targetPInfo.draft_name} 的操作已撤销。您现在可以打开该草稿查看效果。`;
        } else {
          return "";
        }
      } catch (e) {
        return "";
      }
    };
    return { status: "success", data: getSuccessData() };
  } catch (err) {
    return { status: "error", data: `${err}` };
  }
}

const handleSwitchNation = (_event: any, isCapCut: boolean) => {
  setIsCapCut(isCapCut);
  return { status: "success", data: `${isCapCut}` };
};

const handleGetIsCapCut = () => {
  return { status: "success", data: `${getIsCapCut()}` };
};

const handleOpenDirectoryWrapper = async () => {
  return handleOpenDirectory(myWindow);
};

const handleOpenFileWrapper = async () => {
  return handleOpenFile(myWindow);
};

const handleSplitFilesWrapper = async (_event: any, param: SplitFilesParamType) => {
  return await handleSplitFiles(_event, param, progressHandler);
}