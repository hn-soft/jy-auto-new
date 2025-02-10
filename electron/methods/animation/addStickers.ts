import { handleAddBasics } from "./addBasics";

const TRACK_TYPE = "sticker";
import type { AddEffectsParamType } from "../../utils/types";

export const handleAddStickers = async (
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
