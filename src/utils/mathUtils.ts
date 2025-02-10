export function arrangementCount(largest: number, neededNum: number) {
    let currentResult = 1;
    let currentFactor = largest;
    let currentNeededNum = neededNum;
    while (currentNeededNum > 0) {
        currentResult = currentResult * currentFactor;
        currentFactor = currentFactor - 1;
        currentNeededNum = currentNeededNum - 1;
    }
    return currentResult;
}