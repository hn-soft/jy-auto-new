export const RANDOM_MODE = {
  ORDER: "ORDER",
  FLATTEN_RANDOM: "FLATTEN_RANDOM",
  PURE_RANDOM: "PURE_RANDOM",
};

// 生成十六进制四位数,0000到FFFF
export const genRandom4DigitHexStr = () => {
  // [0,65535]整数
  const randomNum = Math.floor(Math.random() * 65536);
  const strBefore =  randomNum.toString(16).toUpperCase();
  const strLength = strBefore.length;
  const moreNeededLength = 4 - strLength;
  let result = "";
  for (let j = 0; j < moreNeededLength; j++) {
    result = result + "0";
  }
  result = result + strBefore;
  return result;
}