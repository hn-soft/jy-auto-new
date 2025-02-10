export const computeProductCode20 = (pcHint: string) => {
  const getMAC = require("getmac").default;
  const macAddrPure = getMAC().split(":").join("");
  const pc = Array(20).fill(0);
  pc[0] = 1;
  pc[1] = 2;
  pc[2] = 5;
  pc[3] = 3;
  pc[4] = 3;
  pc[5] = pcHint === "init" ? 0 : 1; // 0 is for never register before, 1 is for already register before
  pc[6] = parseInt(macAddrPure.substring(1, 2) || 9, 16) % 10;
  pc[7] = parseInt(macAddrPure.substring(11, 12) || 9, 16) % 10;
  pc[8] = parseInt(macAddrPure.substring(9, 10) || 9, 16) % 10;
  if (pcHint === "init") {
    pc[9] = parseInt(macAddrPure.substring(6, 7) || 9, 16) % 10;
    pc[10] = parseInt(macAddrPure.substring(3, 4) || 9, 16) % 10;
    pc[11] = parseInt(macAddrPure.substring(5, 6) || 9, 16) % 10;
    pc[12] = parseInt(macAddrPure.substring(7, 8) || 9, 16) % 10;
    pc[13] = parseInt(macAddrPure.substring(2, 3) || 9, 16) % 10;
    pc[14] = parseInt(macAddrPure.substring(10, 11) || 9, 16) % 10;
    pc[15] = parseInt(macAddrPure.substring(8, 9) || 9, 16) % 10;
    pc[16] = parseInt(macAddrPure.substring(4, 5) || 9, 16) % 10;
    pc[17] = 0; // reserve unknown usage for the future
    pc[18] = 0; // reserve unknown usage for the future
  } else {
    const decodedAt = maskOperate(pcHint, "remove");
    for (let i = 9; i < 19; i++) {
      pc[i] = decodedAt[i];
    }
  }
  let sNum = 0;
  for (let i = 0; i < 19; i++) {
    const curPosNum = parseInt(pc[i], 10);
    sNum = sNum + curPosNum;
  }
  pc[19] = sNum % 10;
  return pc.join("");
};

export const maskOperate = (target: string, opType: "add" | "remove") => {
  const lastDigit = parseInt(target[target.length - 1], 10);
  const mask = lastDigit % 2 === 0 ? 2 : 4;
  const decoded = Array(target.length).fill(0);
  if (opType === "add") {
    for (let i = 0; i < target.length; i++) {
      decoded[i] = (parseInt(target[i], 10) + mask) % 10;
    }
  }
  if (opType === "remove") {
    for (let i = 0; i < target.length; i++) {
      decoded[i] = (parseInt(target[i], 10) + 10 - mask) % 10;
    }
  }
  return decoded.join("");
};
