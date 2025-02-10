// 如果len为20，则随机结果为[0, 19]之间的任意整数（共20个），except的要排除。
export const voteRandomInt = (len: number, except?: number) => {
  const hasExcept = except != undefined;
  let voted = Math.floor(Math.random() * (hasExcept ? len - 1 : len));
  if (hasExcept && voted >= except) {
    voted = voted + 1;
  }
  return voted;
};
