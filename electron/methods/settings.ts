import { STORE_KEY } from "../utils/const";
const Store = require("electron-store");
const store = new Store();

export const handleGetFirstProjectClickDeviation = () => {
  const deviation = store.get(STORE_KEY.FIRST_PROJECT_CLICK_DEVIATION);
  return deviation || { x: 0, y: 0 };
};
import type { SetFirstProjectClickDeviationParamType } from "../utils/types";

export const handleSetFirstProjectClickDeviation = (
  _event: any,
  param: SetFirstProjectClickDeviationParamType
) => {
  store.set(STORE_KEY.FIRST_PROJECT_CLICK_DEVIATION, param);
};

export const handleGetBatchReplaceClickExportWindow = () => {
  const val = store.get(STORE_KEY.BATCH_REPLACE_CLICK_EXPORT_WINDOW);
  return val;
}

export const handleSetBatchReplaceClickExportWindow = (
  _event: any,
  param: boolean
) => {
  store.set(STORE_KEY.BATCH_REPLACE_CLICK_EXPORT_WINDOW, param);
}

export const handleGetIs3ExitWindow = () => {
  const val = store.get(STORE_KEY.IS_3_EXIT_WINDOW);
  return val;
}

export const handleSetIs3ExitWindow = (
  _event: any,
  param: boolean
) => {
  store.set(STORE_KEY.IS_3_EXIT_WINDOW, param);
}