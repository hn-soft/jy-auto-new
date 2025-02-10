import { STORE_KEY } from "../utils/const";
const Store = require("electron-store");
const store = new Store();

export const handleNotShowNoticeInfoAgain = (_event: any, words: string) => {
  try {
    store.set(STORE_KEY.NOT_SHOW_NOTICE_INFO_AGAIN_WORDS, words);
    return { status: "success", data: "" };
  } catch (error) {
    return {
      status: "error",
      // @ts-ignore
      data: `${error?.message}` || `${error}`,
    };
  }
};
