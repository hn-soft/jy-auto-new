const { contextBridge, ipcRenderer } = require("electron");


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
  SplitFilesParamType,
  CheckAudioResourcesParamType,
  RenameExtensionCaseParamType

} from "./utils/types";


window.addEventListener("DOMContentLoaded", () => {
  contextBridge.exposeInMainWorld("electronAPI", {
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),
    getRendererProductCode: () =>
      ipcRenderer.invoke("get-renderer-product-code"),
    getActivationStatus: () => ipcRenderer.invoke("get-activation-status"),
    getContact: () => ipcRenderer.invoke("get-contact"),
    activateProduct: (activationCodeInput: string) =>
      ipcRenderer.invoke("activate-product", activationCodeInput),
    loadProjectInfos: () => ipcRenderer.invoke("load-project-infos"),
    switchNation: (isCapCut: boolean) =>
      ipcRenderer.invoke("switch-nation", isCapCut),
    getIsCapCut: () => ipcRenderer.invoke("get-is-capcut"),
    // animation
    loadTransitionInfos: (param: LoadTransitionInfosType) =>
      ipcRenderer.invoke("load-transition-infos", param),
    getIsTransitionExist: (param: GetIsTransitionExistType) =>
      ipcRenderer.invoke("get-is-transition-exist", param),
    addTransitions: (param: AddTransitionsParamType) =>
      ipcRenderer.invoke("add-transitions", param),
    undoAddTransitions: () => ipcRenderer.invoke("undo-add-transitions"),
    getIsInOutComboExist: (param: GetIsInOutComboExistType) =>
      ipcRenderer.invoke("get-is-in-out-combo-exist", param),
    loadInOutComboInfos: (param: LoadInOutComboInfosType) =>
      ipcRenderer.invoke("load-in-out-combo-infos", param),
    addInOutCombos: (param: AddInOutCombosParamType) =>
      ipcRenderer.invoke("add-in-out-combos", param),
    undoAddInOutCombos: () => ipcRenderer.invoke("undo-add-in-out-combos"),
    addKeyframes: (param: AddKeyframesParamType) =>
      ipcRenderer.invoke("add-keyframes", param),
    undoAddKeyframes: () => ipcRenderer.invoke("undo-add-keyframes"),
    addEffects: (param: AddEffectsParamType) => 
      ipcRenderer.invoke("add-effects", param),
    undoAddEffects: () => 
      ipcRenderer.invoke("undo-add-effects"),
    addFilters: (param: AddFiltersParamType) =>
      ipcRenderer.invoke("add-filters", param),
    undoAddFilters: () =>
      ipcRenderer.invoke("undo-add-filters"),
    addAdjusts: (param: AddAdjustsParamType) =>
      ipcRenderer.invoke("add-adjusts", param),
    undoAddAdjusts: () =>
      ipcRenderer.invoke("undo-add-adjusts"),
    addStickers: (param: AddStickersParamType) =>
      ipcRenderer.invoke("add-stickers", param),
    undoAddStickers: () =>
      ipcRenderer.invoke("undo-add-stickers"),

    // alignment
    spiritAlignMaterial: (param: SpiritAlignMaterialParamType) =>
      ipcRenderer.invoke("spirit-align-material", param),
    undoSpiritAlignMaterial: () =>
      ipcRenderer.invoke("undo-spirit-align-material"),
    spiritCalibrateMaterial: (param: SpiritCalibrateMaterialParamType) =>
      ipcRenderer.invoke("spirit-calibrate-material", param),
    undoSpiritCalibrateMaterial: () =>
      ipcRenderer.invoke("undo-spirit-calibrate-material"),
    masterProAlignMaterial: (param: MasterProAlignMaterialParamType) =>
      ipcRenderer.invoke("master-pro-align-material", param),
    undoMasterProAlignMaterial: () =>
      ipcRenderer.invoke("undo-master-pro-align-material"),
    extractPureTextContents: (param: ExtractPureTextContentsParamType) =>
      ipcRenderer.invoke("extract-pure-text-contents", param),
    cutMsAudio: (param: CutMsAudioParamType) =>
      ipcRenderer.invoke("cut-ms-audio", param),
    undoCutMsAudio: () => ipcRenderer.invoke("undo-cut-ms-audio"),
    masterAlignMaterial: (param: MasterAlignMaterialParamType) =>
      ipcRenderer.invoke("master-align-material", param),
    undoMasterAlignMaterial: () =>
      ipcRenderer.invoke("undo-master-align-material"),
    professionalAlignMaterial: (param: ProfessionalAlignMaterialParamType) =>
      ipcRenderer.invoke("professional-align-material", param),
    undoProfessionalAlignMaterial: () =>
      ipcRenderer.invoke("undo-professional-align-material"),
    professionalFillTextGap: (param: ProfessionalFillTextGapParamType) =>
      ipcRenderer.invoke("professional-fill-text-gap", param),
    undoProfessionalFillTextGap: () =>
      ipcRenderer.invoke("undo-professional-fill-text-gap"),
    professionalMergeText: (param: ProfessionalMergeTextParamType) =>
      ipcRenderer.invoke("professional-merge-text", param),
    undoProfessionalMergeText: () =>
      ipcRenderer.invoke("undo-professional-merge-text"),
    professionalMergeAudio: (param: ProfessionalMergeAudioParamType) =>
      ipcRenderer.invoke("professional-merge-audio", param),
    undoProfessionalMergeAudio: () =>
      ipcRenderer.invoke("undo-professional-merge-audio"),
    professionalCutAudioByBeat: (param: ProfessionalCutAudioByBeatParamType) =>
      ipcRenderer.invoke("professional-cut-audio-by-beat", param),
    undoProfessionalCutAudioByBeat: () =>
      ipcRenderer.invoke("undo-professional-cut-audio-by-beat"),
    // material replacement
    openDirectory: () => ipcRenderer.invoke("open-directory"),
    preReplaceMaterial: (param: PreReplaceMaterialParamType) =>
      ipcRenderer.invoke("pre-replace-material", param),
    checkMaterialToReplace: (param: CheckMaterialToReplaceParamType) =>
      ipcRenderer.invoke("check-material-to-replace", param),
    checkMaterialToRefill: (param: CheckMaterialToRefillParamType) =>
      ipcRenderer.invoke("check-material-to-refill", param),
    checkMaterialToPartitionRefill: (param: CheckMaterialToPartitionRefillParamType) =>
      ipcRenderer.invoke("check-material-to-partition-refill", param),
    checkNewProject: (param: CheckNewProjectParamType) =>
      ipcRenderer.invoke("check-new-project", param),
    replaceMaterial: (param: ReplaceMaterialParamType) =>
      ipcRenderer.invoke("replace-material", param),
    refillMaterial: (param: RefillMaterialParamType) =>
      ipcRenderer.invoke("refill-material", param),
    partitionRefillMaterial: (param: PartitionRefillMaterialParamType) =>
      ipcRenderer.invoke("partition-refill-material", param),
    undoReplaceMaterial: () => ipcRenderer.invoke("undo-replace-material"),
    undoRefillMaterial: () => ipcRenderer.invoke("undo-refill-material"),
    undoPartitionRefillMaterial: () => ipcRenderer.invoke("undo-partition-refill-material"),
    autoReplaceMaterial: (param: AutoReplaceMaterialParamType) =>
      ipcRenderer.invoke("auto-replace-material", param),
    autoRefillMaterial: (param: AutoRefillMaterialParamType) =>
      ipcRenderer.invoke("auto-refill-material", param),
    autoPartitionRefillMaterial: (param: AutoPartitionRefillMaterialParamType) =>
      ipcRenderer.invoke("auto-partition-refill-material", param),
    changeFileLevelOne2Two: (param: ChangeFileLevelOne2TwoType) =>
      ipcRenderer.invoke("change-file-level-one-2-two", param),
    getFirstProjectClickDeviation: () =>
      ipcRenderer.invoke("get-first-project-click-deviation"),
    setFirstProjectClickDeviation: (param: SetFirstProjectClickDeviationParamType) =>
      ipcRenderer.invoke("set-first-project-click-deviation", param),
    getBatchReplaceClickExportWindow: () =>
      ipcRenderer.invoke("get-batch-replace-click-export-window"),
    setBatchReplaceClickExportWindow: (param: boolean) =>
      ipcRenderer.invoke("set-batch-replace-click-export-window", param),
    getIs3ExitWindow: () => 
      ipcRenderer.invoke("get-is-3-exit-window"),
    setIs3ExitWindow: (param: boolean) =>
      ipcRenderer.invoke("set-is-3-exit-window", param),
    renameExtensionCase: (param: RenameExtensionCaseParamType) => 
      ipcRenderer.invoke("rename-extension-case", param),
    renameReplacedOutput: (param: RenameReplacedOutputParamType) => 
      ipcRenderer.invoke("rename-replaced-output", param),
    // material replacement modifier
    checkAudioResources: (param: CheckAudioResourcesParamType) =>
      ipcRenderer.invoke("check-audio-resources", param),

    // split
    splitFiles: (param: SplitFilesParamType) =>
      ipcRenderer.invoke("split-files", param),

    // Export
    exportMainTrackAllClips: (param: ExportMainTrackAllClipsParamType) =>
      ipcRenderer.invoke("export-main-track-all-clips", param),
    openFile: () => ipcRenderer.invoke("open-file"),

    onPushNoticeInfo: (callback: (param: any) => {}) =>
      ipcRenderer.on("push-notice-info", callback),
    offPushNoticeInfo: (callback: (param: any) => {}) =>
      ipcRenderer.removeListener("push-notice-info", callback),
    notShowNoticeInfoAgain: (words: string) =>
      ipcRenderer.invoke("not-show-notice-info-again", words),
    onUpdateProgressInfo: (callback: (param: any) => {}) =>
      ipcRenderer.on("update-progress-info", callback),
    offUpdateProgressInfo: (callback: (param: any) => {}) =>
      ipcRenderer.removeListener("update-progress-info", callback),
    onPushDebugLog: (callback: (param: any) => {}) =>
      ipcRenderer.on("push-debug-log", callback),
    offPushDebugLog: (callback: (param: any) => {}) =>
      ipcRenderer.removeListener("push-debug-log", callback),
  });
});
