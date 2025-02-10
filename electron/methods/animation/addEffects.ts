import { handleAddBasics } from "./addBasics";

const TRACK_TYPE = "effect";
import type { AddEffectsParamType } from "../../utils/types";

export const handleAddEffects = async (
  _event: any,
  param: AddEffectsParamType,
  refJsonString: string,
  targetJsonString: string
) => {
  return handleAddBasics(
    _event,
    param,
    refJsonString,
    targetJsonString,
    TRACK_TYPE
  );
};
