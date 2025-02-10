import { handleAttachAudios } from "./handleAttachAudios";
import { handleChangeTexts } from "./handleChangeTexts";
import { handleAddAllBasics, RANDOM_MODE as BASICS_RANDOM_MODE } from "./handleAddAllBasics";
import {
  handleAddTransitionsForReplacement,
  RANDOM_MODE as TRANS_RANDOM_MODE,
  SOUND_MODE as TRANS_SOUND_MODE,
} from "../../animation/addTransitions";
import {ModifierType} from "../../../utils/types";

export const handleModifierChange = async (
  projI: number,
  modifier: ModifierType,
  targetJyConfig: any,
  targetPInfoPath: string
) => {
  const { audioConfig, textConfig, transitionConfig, layerConfig } = modifier;
  if (audioConfig.isNeed) {
    const audioRes = await handleAttachAudios(
      projI,
      targetJyConfig,
      targetPInfoPath,
      modifier
    );
    if (audioRes.status === "error") {
      return audioRes;
    }
  }
  if (textConfig.isNeed) {
    const textRes = await handleChangeTexts(
      projI,
      targetJyConfig,
      modifier,
    );
    if (textRes.status === "error") {
      return textRes;
    }
  }
  if (transitionConfig.isNeed) {
    const transRes = await handleAddTransitionsForReplacement(
      {
        infoPath: "", // useless, but follow the type
        isCapCut: transitionConfig.isCapCut,
        readableDuration: transitionConfig.readableDuration,
        effectIdWithFileUris: transitionConfig.effectIUs
          .slice(0, transitionConfig.curDisplayCount)
          .filter((item) => item.includes("#")),
        isMainTrackOnly: false,
        randomMode: TRANS_RANDOM_MODE.PURE_RANDOM,
        soundMode: TRANS_SOUND_MODE.NO_SOUND,
      },
      targetJyConfig
    );
    if (transRes.status === "error") {
      return transRes;
    }
  }
  if (layerConfig.isNeed) {
    // filter, effect, sticker
    const layerRes = await handleAddAllBasics(
      {
        refInfoPath: layerConfig.refInfoPath,
        targetInfoPath: "", // useless, but follow the type
        randomMode: BASICS_RANDOM_MODE.PURE_RANDOM,
        isTooShortToAdd: false,
        thresholdSegLen: 0, // useless because isTooShortToAdd is false
      },
      targetJyConfig
    );
    if (layerRes.status === "error") {
      return layerRes;
    }
  }
  return {
    status: "success",
  };
};
