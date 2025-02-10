import { handleAddBasicsForReplacement } from "../../animation/addBasics";
export { RANDOM_MODE } from "../../animation/addBasics";

// for replacement function use
const TRACK_TYPES = ["filter", "effect", "sticker"];
import {AddEffectsParamType} from "../../../utils/types";

export const handleAddAllBasics = async (
  param: AddEffectsParamType,
  targetJyConfig: any,
) => {
  for (let i = 0; i < TRACK_TYPES.length; i++) {
    const TRACK_TYPE = TRACK_TYPES[i];
    const res = await handleAddBasicsForReplacement(
      param,
      targetJyConfig,
      TRACK_TYPE
    );
    if (res.status === "error") {
      return res;
    }
  }
  return {
    status: "success",
  }
};