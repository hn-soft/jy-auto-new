export const STORE_KEY = {
  USING_PRODUCT_CODE: "using_product_code",
  USING_ACTIVATION_CODE: "using_activation_code",
  NEXT_PRODUCT_CODE: "next_product_code",
  TRIAL_TIME_LEFT: "trial_time_left",
  ENV_INTERNET: "env_internet",
};

export const VPN_REF_LINK = "https://cp.cloudnx.cc/aff.php?aff=41060";

export const RANDOM_MODE = {
  ORDER: "ORDER",
  FLATTEN_RANDOM: "FLATTEN_RANDOM",
  PURE_RANDOM: "PURE_RANDOM",
};

export const PROJECT_NATION = {
  JIANYING: "jianying",
  CAPCUT: "capcut",
};

export const SOUND_MODE = {
  NO_SOUND: "NO_SOUND",
  YES_SOUND: "YES_SOUND",
};

export const IS_EN = false;

export const ATTACH_AUDIO_COUNT_LIMIT = 2;
export const CHANGE_TEXT_COUNT_LIMIT = 2;
export const ATTACH_TRANSITION_COUNT_LIMIT = 5;
import {ObfuscatorType} from "../../electron/utils/types";
import {ModifierType} from "../../electron/utils/types";

export const MODIFIER_SOLUTION = {
  AUDIO_LONGER: {
    CUT: "cut",
    SPEED: "speed",
  },
  AUDIO_SHORTER: {
    CUT_VIDEO: "cut_video",
    REMAIN: "remain",
    SPEED: "speed",
  },
  RANDOM_MODE: {
    ORDER: "order",
    PURE_RANDOM: "pure_random",
  },
};

export const INIT_MODIFIER: ModifierType = {
  audioConfig: {
    isNeed: false,
    count: 0,
    configs: [{
      audioFolder: "",
      audioLonger: "",
      audioShorter: "",
      audioVolume: 0,
      randomMode: "",
      needAttachSRT: false,
      configSRT:"" }]
  },
  textConfig: {
    isNeed: false,
    count: 0,
    configs: [
      {
        oldContent:"",
        newContents:[],
        randomMode:"",
      }

    ],
  },
  transitionConfig: {
    isNeed: false,
    isCapCut: IS_EN,
    curDisplayCount: 1,
    readableDuration: 0.5,
    effectIUs: Array(ATTACH_TRANSITION_COUNT_LIMIT).fill(""),
  },
  layerConfig: {
    isNeed: false,
    refInfoPath: "",
    effectIUs:[],
    draftName: "",
  },
};

export const INIT_OBFUSCATOR: ObfuscatorType = {
  crop: {
    isNeed: false,
  },
  speeding: {
    isNeed: false,
  },
  edgeThrow: {
    isNeed: false,
  },
  flip: {
    isNeed: false,
  }
}

export const ATTACH_CAPTION_FONT_PRESETS = [
  {
    value: "Preset Large White Landscape",
    label : {
      EN: "Preset Large White Landscape",
      CN: "预设大白横屏",
    },
  },
  {
    value: "Preset Large White Portrait",
    label : {
      EN: "Preset Large White Portrait",
      CN: "预设大白竖屏",
    },
  },
  {
    value: "Preset Pink Back Landscape",
    label : {
      EN: "Preset Pink Back Landscape",
      CN: "预设粉底横屏",
    },
  },
  {
    value: "Preset Pink Back Portrait",
    label : {
      EN: "Preset Pink Back Portrait",
      CN: "预设粉底竖屏",
    },
  },
  {
    value: "Preset Small Yellow Landscape",
    label : {
      EN: "Preset Small Yellow Landscape",
      CN: "预设小黄横屏",
    },
  },
  {
    value: "Preset Small Yellow Portrait",
    label : {
      EN: "Preset Small Yellow Portrait",
      CN: "预设小黄竖屏",
    },
  },
]