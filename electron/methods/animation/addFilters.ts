import { handleAddBasics } from "./addBasics";

const TRACK_TYPE = "filter";
import type { AddEffectsParamType } from "../../utils/types";

export const handleAddFilters = async (
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
