import { app } from "electron";
import { STORE_KEY, ACTIVATE_URL, BASIC_OFFICIAL_USAGE_LIMIT_PER_MONTH } from "../utils/const";
import { computeProductCode20, maskOperate } from "../utils/activationUtils";
import axios from "axios";
import { encodeSecret, decodeSecret } from "../utils/codeSecret";

const Store = require("electron-store");
const store = new Store();

export const handleGetRendererProductCode = () => {
  try {
    const activationCode = decodeSecret(store.get(STORE_KEY.USING_ACTIVATION_CODE));
    let productCode = "";
    if (activationCode != undefined) {
      productCode = computeProductCode20(activationCode);
    } else {
      productCode = computeProductCode20("init");
    }
    return { status: "success", data: productCode };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

export const handleGetActivationStatus = () => {
  if (store.get(STORE_KEY.DISABLED)) {
    return { status: "trial", gt: 0, trialTimeLeft: 0 };
  }
  const rpcRes = handleGetRendererProductCode();
  const latestInternetTimestampS = store.get(
    STORE_KEY.LATEST_INTERNET_TIMESTAMP_S
  );
  if (rpcRes.status === "error") {
    return { status: "trial", gt: 0, trialTimeLeft: 0 };
  }
  const rendererProductCode = rpcRes.data;
  if (rendererProductCode.charAt(5) === "0") {
    const trial_time_left = store.get(STORE_KEY.TRIAL_TIME_LEFT);
    return {
      status: "trial",
      gt: 0,
      trialTimeLeft: trial_time_left,
    };
  } else {
    const tsStr = rendererProductCode.substring(9, 19);
    const utInt = parseInt(tsStr, 10);
    const dateNow = Date.now();
    if (dateNow > utInt * 1000) {
      return { status: "expired", gt: utInt };
    }
    if (!!latestInternetTimestampS && latestInternetTimestampS > utInt) {
      return { status: "expired", gt: utInt };
    }
    if (isSimpleRuleWrong()) {
      store.set(STORE_KEY.TRIAL_TIME_LEFT, 0);
      store.delete('using_product_code');
      store.delete('using_activation_code');
      return {
        status: "trial",
        gt: 0,
      }
    }
    // tier related
    const tierRes = handleGetOfficialTier();
    const officialTimeLeft = getOfficialTimeLeft(utInt);
    return { status: "official", gt: utInt, isForever: utInt > 4000000000, tier: tierRes.data, oftl: officialTimeLeft };
  }
};

export const handleGetContact = () => {
  const DEFAULT_CONTACT = "微信 yxxz1024 或 QQ 414151500";
  try {
    if (store.get(STORE_KEY.CONTACT) === undefined) {
      return { status: "success", data: DEFAULT_CONTACT };
    }
    return { status: "success", data: decodeSecret(store.get(STORE_KEY.CONTACT))};
  } catch (e) {
    return { status: "success", data: DEFAULT_CONTACT };
  }
}

export const handleGetOfficialTier = (decodedActivationCode?: string) => {
  try {
    let ac = "";
    if (decodedActivationCode != undefined) {
      ac = decodedActivationCode;
    } else {
      const storedAct = decodeSecret(store.get(STORE_KEY.USING_ACTIVATION_CODE));
      if (storedAct == undefined) {
        return { status: "success", data: "trial" }
      }
      ac = storedAct;
    }
    const tsStr = maskOperate(ac, "remove").substring(9, 19);
    if (tsStr.charAt(9) === "0") {
      return { status: "success", data: "standard" }
    } else if (tsStr.charAt(9) === "5") {
      return { status: "success", data: "basic" }
    } else {
      return { status: "success", data: "unknown-official" }
    }
  } catch (e) {
    return { status: "success", data: "unknown" }
  }
}

// 获取基础正式版剩余可用次数，如果是标准版，那就会得到99999999或略低
const getOfficialTimeLeft = (utInt: number) => {
  const timesMark = Math.floor(utInt / 10) % 10; 
  // 得到倒数第二位数。如果是0，就BASIC_OFFICIAL_USAGE_LIMIT_PER_MONTH（50）的一倍，如果是1到9，2倍再乘timesMark;
  const initialAvailableTimes = timesMark === 0 ? BASIC_OFFICIAL_USAGE_LIMIT_PER_MONTH : BASIC_OFFICIAL_USAGE_LIMIT_PER_MONTH * 2 * timesMark;
  const storedTrialTimeLeft = store.get(STORE_KEY.TRIAL_TIME_LEFT);
  const tier = handleGetOfficialTier();
  if (tier.data !== "basic") {
    return storedTrialTimeLeft;
  } else {
    const toZeroTrialTimeLeft = 99999999 - initialAvailableTimes;
    return storedTrialTimeLeft - toZeroTrialTimeLeft;
  }
}

export const handleActivateProduct = async (
  _event: any,
  param: { productCode: string; activationCode: string }
) => {
  if (param.activationCode === "00000000000000000000") {
    try {
      store.set(STORE_KEY.OFFLINE_ACTIVATION, true);
      return {
        status: "error",
        data: `不过并不是因为你输入错误。检查到你输入的不是激活码，是为了解决无法连接墙外激活服务器的问题。你现在可以重新输入激活码进行验证。`,
      };
    } catch (e) {
      // @ts-ignore
      return { status: "error", data: `${e?.message || e}` };
    }
  }
  try {
    const rpcRes = handleGetRendererProductCode();
    if (rpcRes.status !== "success") {
      return rpcRes;
    }
    if (rpcRes.data !== param.productCode) {
      return { status: "error", data: "产品信息码出错了。"};
    }
    if (store.get(STORE_KEY.OFFLINE_ACTIVATION)) {
      const isTrueActivationCode = offlineVerify(param);
      if (!isTrueActivationCode) {
        return { status: "error", data: "错误的激活码，请检查是否输入错误！" };
      }
    } else {
      const res = await axios.post(ACTIVATE_URL, {
        pc: param.productCode,
        ac: param.activationCode,
        v: app.getVersion(),
        os: process.platform,
      });
      if (res.status !== 200) {
        return { status: "error", data: `激活服务器未返回200结果，请联系我。` };
      }
      const resBody = res.data;
      if (resBody.status === "error") {
        return { status: "error", data: resBody.statusInfo };
      }
    }
    store.set(STORE_KEY.USING_PRODUCT_CODE, encodeSecret(param.productCode));
    store.set(STORE_KEY.USING_ACTIVATION_CODE, encodeSecret(param.activationCode));
    store.set(STORE_KEY.TRIAL_TIME_LEFT, 99999999);
    const tsStr = maskOperate(param.activationCode, "remove").substring(9, 19);
    const expirationDate = new Date(parseInt(tsStr, 10) * 1000);
    const readableDateStr = expirationDate.toLocaleDateString("zh-CN", {
      timeZone: "Asia/Shanghai",
    });
    const tierRes = handleGetOfficialTier(param.activationCode);
    return { status: "success", data: readableDateStr, dataIsForever: parseInt(tsStr, 10) > 4000000000, tier: tierRes.data };
  } catch (e) {
    // @ts-ignore
    if (e?.code === "ENOTFOUND") {
      return {
        status: "error",
        data: `您没有正确连接到互联网，请检查网络设置。`,
      };
    }
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

export const getApiParamK = () => {
  try {
    const productCode = decodeSecret(store.get(STORE_KEY.USING_PRODUCT_CODE));
    if (productCode == undefined) {
      const rendererProductCodeRes = handleGetRendererProductCode();
      if (rendererProductCodeRes.status === "error") {
        return "0";
      }
      return rendererProductCodeRes.data;
    }
    const activationCode = decodeSecret(store.get(STORE_KEY.USING_ACTIVATION_CODE));
    if (activationCode == undefined) {
      return "2";
    }
    return `${productCode}-${activationCode}`;
  } catch (e) {
    return "3";
  }
};

// 如果isSimpleRuleWrong为true，大概率是用户试图破解，把activation_code复制到另一台电脑。
// 对于产品信息码变化的情况，会有9999999次提醒，而破解则无，所以可以区分。
export const isSimpleRuleWrong = () => {
  const usingProductCode = decodeSecret(store.get(STORE_KEY.USING_PRODUCT_CODE));
  if (usingProductCode == undefined) {
    return false;
  }
  const usingActivationCode = decodeSecret(store.get(STORE_KEY.USING_ACTIVATION_CODE));
  if (usingActivationCode == undefined) {
    return false;
  }
  const decodedAt = maskOperate(usingActivationCode, "remove");
  let sum1 = 0;
  for (let i = 0; i < 10; i++) {
    sum1 = sum1 + parseInt(usingProductCode[i], 10);
  }
  const isMatched = parseInt(decodedAt[5], 10) === sum1 % 10;
  return !isMatched;
}

export const offlineVerify = (param: { productCode: string; activationCode: string }) => {
  const decodedAt = maskOperate(param.activationCode, "remove");
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < 20; i++) {
    if (i < 10) {
      sum1 = sum1 + parseInt(param.productCode[i], 10);
    }
    if (i >= 10) {
      sum2 = sum2 + parseInt(param.productCode[i], 10);
    }
  }
  const isMatched1 = parseInt(decodedAt[5], 10) === sum1 % 10;
  const isMatched2 = parseInt(decodedAt[6], 10) === sum2 % 10;
  return isMatched1 && isMatched2;
}

export const getMacAddrPure = () => {
  try {
    const getMAC = require("getmac").default;
    const macAddrPure = getMAC().split(":").join("");
    return macAddrPure;
  } catch (e) {
    return "";
  }
}