import { STORE_KEY } from "./const";
const Store = require("electron-store");
const store = new Store();

// 如果用户在前端点了不再提示，那么我们会存该条notice info的文字信息(words)，这里判断当前存的是否为此条
// 如果是，则主进程不再push到前端，避免用户重复看同一条notice info觉得烦。但store只会存一条，覆盖，之前的会忘。
// 这个方法的应用是后端返回的notice info，我们判断它是不是现在store里存的那条，仅此而已。
export const isStoredNotShowNoticeInfoWords = (words: string) => {
  try {
    const storedNoticeInfoWords = store.get(
      STORE_KEY.NOT_SHOW_NOTICE_INFO_AGAIN_WORDS
    );
    return storedNoticeInfoWords === words;
  } catch (err) {
    return false;
  }
};
