import * as trace_events from "node:trace_events";

export type PInfoType = {
    "draft_cloud_last_action_download":false,
    "draft_cloud_purchase_info":"",
    "draft_cloud_template_id":"",
    "draft_cloud_tutorial_info":"",
    "draft_cloud_videocut_purchase_info":"",
    "draft_cover":"",
    "draft_fold_path":"",
    "draft_id":"",
    "draft_is_ai_shorts":false,
    "draft_is_invisible":false,
    "draft_json_file":"",
    "draft_name":"",
    "draft_new_version":"",
    "draft_root_path":"",
    "draft_timeline_materials_size":0,
    "draft_type":"",
    "tm_draft_cloud_completed":"",
    "tm_draft_cloud_modified":0,
    "tm_draft_create":0,
    "tm_draft_modified":0,
    "tm_draft_removed":0,
    "tm_duration":0
};

type PropsType = {};

type StateType = {
    adsp: number;
    gapSetting: string;
    airChangeSetting: string;
    airChangeDuration: number;
    talkMuteFadeDuration: number;
    muteSetting: string;
    isResultModalOpen: boolean;
    resultModalText: string;
    showUndoBtn: boolean;
    isUndoConfirmModalOpen: boolean;
    isExplanationModalOpen: boolean;
    activationStatus: {
        status: string;
        gt: number; // unix timestamp (second)
        trialTimeLeft?: number;
    };
};

type SilenceInfoItemType = {
    stSec: number;
    stUS: number;
    endSec: number;
    endUS: number;
    duration: number;
    durationUS: number;
    midSec: number;
    midUS: number;
    noiseLevelNum: number;
};

type DetectSilenceResultType = {
    sourcePointsWithEdge: number[];
    sourcePointsWithoutEdge: number[];
    rangeAttributes: boolean[];
    loudyRangeCount: number;
    silenceRangeCount: number;
};

export type CutMsAudioParamType = {
    sildur:number,
    stripSilence:number,
    infoPath:string,
}

export  type MasterAlignMaterialParamType ={
    infoPath:string,
    isChangeSpeed: boolean,
    speedRatio:number,
    isChangeSpeedAuto:boolean,
    isChangeGap:boolean,
    gapTime:number,
    isOrderMode:boolean
}

export  type ProfessionalAlignMaterialParamType ={
    quantityRatio: string;
    alignTarget:string,
    customParagraphs: [],
    longVideoTreatment:string,
    infoPath:string,
}

export  type MasterProAlignMaterialParamType ={
    infoPath:string,
    adsp: number;
    gapSetting: string;
    muteSetting: string;
    talkMuteFadeDuration: number;
    airChangeSetting: string;
    airChangeDuration: number;
}

export  type ProfessionalCutAudioByBeatParamType ={
    infoPath:string,
}

export  type ProfessionalFillTextGapParamType ={
    infoPath:string,
    isStartFromZero: boolean;
    fillMethod: string; // midmerge, rightward

}
export  type ProfessionalMergeTextParamType ={
    infoPath:string,
    isStartFromZero: boolean;
    fillMethod: string; // midmerge, rightward

}

export  type SpiritAlignMaterialParamType ={
    infoPath:string,

    lowestSpeedChoice: string,
    lowestSpeedAllowed: number
    needMergeTracks: boolean;
}

export  type SpiritCalibrateMaterialParamType ={
    infoPath:string,
    isStartFromZero: boolean;
    fillMethod: string; // midmerge, rightward

}
export  type AddEffectsParamType ={
    refInfoPath:string,
    isTooShortToAdd: boolean;
    thresholdSegLen: number;
    targetInfoPath: string; // midmerge, rightward
    randomMode: string;
}

type EffectType = {
    effect_id: string;
    file_url: {
        uri: string;
    };
    resource_id: string;
};

export  type AddInOutCombosParamType ={
    infoPath:string,
    refInfoPath:string,
    readableDuration: number;
    isCapCut:boolean,
    effectTypeKey: string;
    randomMode:string,
    isMainTrackOnly: boolean;
    soundMode: string;
    effects: [],
}

export  type LoadInOutComboInfosType ={
    infoPath:string,
    isCapCut:boolean,
}


export  type GetIsInOutComboExistType ={
    infoPath:string,
    isCapCut:boolean,
    effect:EffectType,
}
export  type AddKeyframesParamType ={
    infoPath:string,
    keyframes: string[];
    aspectRatio: string;
    isMainTrackOnly: boolean;
    isCapCut:boolean,
    randomMode:string,
}
export  type AddTransitionsParamType2 ={
    infoPath:string,
    keyframes: string[];
    readableDuration: number;
    effectIdWithFileUris: string[],
    isMainTrackOnly: boolean;
    isCapCut:boolean,
    randomMode:string,
    soundMode: string;

}

export  type AddTransitionsParamType ={
    infoPath:string,
    isCapCut:boolean,
    readableDuration:number,
    effectIdWithFileUris: string[],
    isMainTrackOnly:boolean,
    randomMode:string,
    soundMode:string,
}

export  type LoadTransitionInfosType ={
    infoPath:string;
    isCapCut:boolean;
    effect:EffectType;
}


export  type GetIsTransitionExistType ={
    infoPath:string,
    isCapCut:boolean,
    effect:EffectType,
    effectIU:string,
}




export  type ExportMainTrackAllClipsParamType ={
    infoPath:string,
    wholeOutputFilePath: string;
    folderDir: string,
    copyCodec: string;
    exportMode: string;

}


export  type ChangeFileLevelOne2TwoType ={
    infoPath:string,
    wholeOutputFilePath: string;
    folderDir: string,
}




export  type CheckMaterialToPartitionRefillParamType ={
    infoPath:string,
    parentFolderDir: string,
    basenameParts: [{prefix:string,suffix:string}],

}

export  type CheckMaterialToRefillParamType ={
    infoPath:string,
    parentFolderDir: string,
    sourceExtnames: { extname: string; count: number }[],

}




export  type CheckMaterialToReplaceParamType ={
    infoPath:string,
    parentFolderDir: string,
    sourceExtnames: { extname: string; count: number }[],

}

export  type CheckNewProjectParamType ={
    infoPath:string,
    requiredCount: number,
    sourceExtnames: { extname: string; count: number }[],
    referenceProject:{tm_draft_create:number},
    excepts:string[],// 有可能是此变量类型
}



export  type PartitionRefillMaterialParamType ={
    sourcePInfoPath:string,
    replaceTypesStr:string,
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    refillSelectModeSolution: string;
    newProjectCount: number;
    targetPInfos: PInfoType[];
    targetPInfoPaths: [];
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    modifier:ModifierType; // add

}


export  type AutoPartitionRefillMaterialParamType ={
    infoPath:string,
    sourcePInfoPath:string,
    replaceTypesStr:string,
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    refillSelectModeSolution: string;
    chosenLatencyFactor: number;
    newProjectCount: number;
    targetPInfos: PInfoType[];
    targetPInfoPaths: [];
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    deleteAfterComplete:boolean; //add
    modifier:ModifierType; //add
}




export  type RefillMaterialParamType ={
    infoPath:string,
    sourcePInfoPath:string,
    replaceTypesStr:string,
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    refillSelectModeSolution: string;
    chosenLatencyFactor: number;
    newProjectCount: number;
    resourceInfos: {
        extname: string;
        sourceCount: number;
        resourceCount: number;
        filenames: string[];
        parentFolderDir: string;
    }[],
    targetPInfoPaths: [];
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;

}


export  type AutoRefillMaterialParamType ={
    infoPath:string;
    sourcePInfoPath:string,
    replaceTypesStr:string,

    orderedFilenamesArr: string[][];
    orderedFilenames: string[];
    resourceInfos: {
        extname: string;
        sourceCount: number;
        resourceCount: number;
        filenames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    refillSelectModeSolution: string;
    chosenLatencyFactor: number;
    newProjectCount: number;
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    targetPInfoPaths:[],
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    reflectSelectModeSolution:string;
    deleteAfterComplete:boolean; // add
}
export  type RenameReplacedOutputParamType ={
    folderDir:string,
    replaceTypes: string[]

}


export  type ReplaceMaterialParamType2 ={
    folderDir:string,
    replaceTypes: string[]
    sourcePInfoPath:string,
    replaceTypesStr:string,
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    //refillSelectModeSolution: string;
    childFolders: string[];
    aspectRatioSolution: string;
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    sourceExtnameInfos:  {childFolder: string, sourceExtnamesForOneChild: {extname: string, count: number, grandchilds: string[]}[]}[];
    targetPInfoPaths:[],

}


export  type TimerangeType ={
    start:number,
    duration: number
}

export  type PreReplaceMaterialParamType ={
    start:number,
    duration: number,
    infoPath:string,
    replaceTypes: string[]

}
export  type AutoReplaceMaterialParamType ={
    modifier:ModifierType,
    deleteAfterComplete:boolean,
    start:number,
    duration: number
    replaceTypes: string[]
    sourcePInfoPath:string,
    parentFolderDir:string,
    childFolders: string[];
    replaceTypesStr:string,
    chosenLatencyFactor: number;
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    targetPInfoPaths:[],
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    folderDir:string,
    aspectRatioSolution: string;
    sourceExtnameInfos:  {childFolder: string, sourceExtnamesForOneChild: {extname: string, count: number, grandchilds: string[]}[]}[];
    reflectSelectModeSolution:string;
}

export  type SetFirstProjectClickDeviationParamType ={
    start:number,
    duration: number
}

export  type AddFiltersParamType ={
    start:number,
    duration: number,
    refInfoPath:string,
    targetInfoPath:string,
    isTooShortToAdd:boolean,
    thresholdSegLen: number;
    randomMode: string;

}
export  type ExtractPureTextContentsParamType ={
    start:number,
    duration: number,
    infoPath:string,
    isExtractAll:boolean,

}
export  type AddAdjustsParamType ={
    start:number,
    duration: number
}
export  type ProfessionalMergeAudioParamType ={
    start:number,
    duration: number,
    infoPath:string,
    isStartFromZero:boolean,
    fillMethod:string,
}
export  type AddStickersParamType ={
    start:number,
    duration: number
}




export  type RenameExtensionCaseParamType ={
    folderDir:string,
    isTargetCaseUpper: boolean,
}


export  type LastActionType ={
    infoPath:string,
    content: string,
}

export  type SplitFilesParamType ={
    inputFolderDir:string,

    outputFolderDir:string,
    duration:number,
    sceneThreshold:number,
    outputStoredTogether:boolean,
    obfuscator:{
        flip:{isNeed:boolean},
        edgeThrow:{isNeed:boolean},
        speeding:{isNeed:boolean},
        crop:{isNeed:boolean},
    },
    by: string,
}

export  type CheckAudioResourcesParamType ={
    parentFolderDir:string,

}

export  type  ModifierType= {
    audioConfig:{
        isNeed:boolean,
        count:number,
        configs:[{
            audioFolder: string;
            audioLonger: string;
            audioShorter: string;
            audioVolume: number;
            randomMode: string;
            needAttachSRT: boolean;
            configSRT: string;
        }],

    },
    textConfig:{
        isNeed:boolean,
        count:number,
        configs:[
            {
                oldContent: string,
                newContents:string[],
                randomMode:string,
            }
        ]
        ,
    },
    transitionConfig:{
        isNeed:boolean,
        isCapCut:boolean,
        effectIUs:string [],
        curDisplayCount:number,
        readableDuration:number,

    },
    layerConfig:{
        isNeed:boolean,
        refInfoPath:string,
        effectIUs:string[],
        draftName:string,

    },

}
export  type ReplaceMaterialParamType ={
    modifier:ModifierType,
    folderDir:string,
    replaceTypes: string[]
    sourcePInfoPath:string,
    replaceTypesStr:string,
    partitionMaterialsInfos: {
        prefix: string;
        suffix: string;
        resourceCount: number;
        resourceNames: string[];
        parentFolderDir: string;
    }[],
    parentFolderDir:string,
    //refillSelectModeSolution: string;
    childFolders: string[];
    aspectRatioSolution: string;
    videoDefaultSpeedSolution: string;
    videoLengthDifferenceSolution: string;
    videoDecorationSolution: string;
    sourceExtnameInfos:  {childFolder: string, sourceExtnamesForOneChild: {extname: string, count: number, grandchilds: string[]}[]}[];
    targetPInfoPaths:[],

}

export type ObfuscatorType = {
    crop: {
        isNeed: boolean,
    },
    speeding: {
        isNeed: boolean,
    },
    edgeThrow: {
        isNeed: boolean,
    },
    flip: {
        isNeed: boolean,
    }
}
