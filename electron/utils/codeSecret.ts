export const encodeSecret = (normalStr: string | undefined | null) => {
  if (normalStr === undefined || normalStr === null) {
    return normalStr;
  }
  return Buffer.from(normalStr).toString("base64");
};

export const decodeSecret = (base64Str: string | undefined | null) => {
  if (base64Str === undefined || base64Str === null) {
    return base64Str;
  }
  return Buffer.from(base64Str, "base64").toString();
};
