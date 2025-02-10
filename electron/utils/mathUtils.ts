import { voteRandomInt } from "../utils/randomUtils";
// targetArr是传入空数组，作为临时过渡值
// targetArrList是传入空数组，作为最后的结果
export function getAllArrangements<T>(sourceArr: T[], neededCount: number, userRequiredArrangementCount: number) {
    const arrangementCountTotal = arrangementCount(sourceArr.length, neededCount);
    // 这种错误的情况不存在，除非输入值有误，空数组在外面会下一步报错返回。
    if (arrangementCountTotal <= 0) {
        return [];
    }
    if (arrangementCountTotal < 10000) {
        const targetArr: T[] = [];
        const targetArrList: T[][] = [];
        getAllArrangementsExactMode(sourceArr, targetArr, targetArrList, neededCount);
        randomizeArrayOrder(targetArrList);
        const slicedArrList = targetArrList.slice(0, userRequiredArrangementCount);
        return slicedArrList;
    } else {
        return getAllArrangementsRandomMode(sourceArr, neededCount, userRequiredArrangementCount);
    }
}

function getAllArrangementsRandomMode<T>(sourceArr: T[], neededCount: number, userRequiredArrangementCount: number) {
    const targetArrList: T[][] = [];
    let errorCount = 0;
    while (targetArrList.length < userRequiredArrangementCount) {
        const targetArr: T[] = [];
        while (targetArr.length < neededCount) {
            const randomIndex = voteRandomInt(sourceArr.length);
            const randomSourceItem = sourceArr[randomIndex];
            if (targetArr.includes(randomSourceItem)) {
                continue;
            } else {
                targetArr.push(randomSourceItem);
            }
        }
        if (errorCount > 1000000) {
            return targetArrList;
        }
        if (!isArrInArrList(targetArr, targetArrList)) {
            errorCount = 0;
            targetArrList.push(targetArr);
        } else {
            errorCount++;
        }
    }
    return targetArrList;
}

// targetArr是传入空数组，作为临时过渡值
// targetArrList是传入空数组，作为最后的结果
export function getAllArrangementsExactMode<T>(sourceArr: T[], targetArr: T[], targetArrList: T[][], neededCount: number){
    if (neededCount === 0) {
        const copiedArr = targetArr.map(item => item);
        targetArrList.push(copiedArr);
        return;
    }
    for (let i = 0; i < sourceArr.length; i++) {
        if (targetArr.includes(sourceArr[i])) {
            continue;
        }
        targetArr.push(sourceArr[i]);
        getAllArrangementsExactMode(sourceArr, targetArr, targetArrList, neededCount - 1);
        targetArr.pop();
    }
}


export function randomizeArrayOrder<T>(arr: T[]){
    for (let i = 0; i < arr.length; i++) {
        let temp = arr[i];
        let j = Math.floor(Math.random() * (i + 1));
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

function isArrInArrList<T>(arr: T[], arrList: T[][]) {
    for (let i = 0; i < arrList.length; i++) {
        const arrCompare = arrList[i];
        if (isArrayEqual(arr, arrCompare)) {
            return true;
        }
    }
    return false;
}

function isArrayEqual<T>(arr1: T[], arr2: T[]) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        const item1 = arr1[i];
        const item2 = arr2[i];
        if (item1 !== item2) {
            return false;
        }
    }
    return true;
}

function arrangementCount(largest: number, neededNum: number) {
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

export const getResourceCombinations = (
    resourceCountList: number[],
    userRequiredCombinationCount: number,
) => {
    const combinationCountTotal = resourceCountList.reduce((pre, cur) => pre * cur, 1);
    if (combinationCountTotal < 10000) {
        const targetComb: number[] = [];
        const targetCombList: number[][] = [];
        getResourceCombinationsExactMode(resourceCountList, targetComb, targetCombList);
        randomizeArrayOrder(targetCombList);
        const slicedCombList = targetCombList.slice(0, userRequiredCombinationCount);
        return slicedCombList;
    } else {
        return getResourceCombinationsRandomMode(resourceCountList, userRequiredCombinationCount);
    }
}

function getResourceCombinationsRandomMode(resourceCountList: number[], userRequiredCombinationCount: number) {
    const targetCombList: number[][] = [];
    let errorCount = 0;
    while (targetCombList.length < userRequiredCombinationCount) {
        if (errorCount > 1000000) {
            break;
        }
        const targetComb: number[] = [];
        for (let i = 0; i < resourceCountList.length; i++) {
            const currentResourceCount = resourceCountList[i];
            const randomIndex = voteRandomInt(currentResourceCount);
            targetComb.push(randomIndex);
        }
        let isAlreadyElected = false;
        // 筛选完毕，是targetComb，需要校验重复性，看是不是巧合地被随机选中过
        for (let j = 0; j < targetCombList.length; j++) {
            const elected = targetCombList[j];
            if (isArrayEqual(elected, targetComb)) {
                isAlreadyElected = true;
                errorCount++;
                break;
            }
        }
        if (!isAlreadyElected) {
            targetCombList.push(targetComb);
        }
    }
    return targetCombList;
}

function getResourceCombinationsExactMode(resourceCountList: number[], targetComb: number[], targetCombList: number[][]) {
    if (targetComb.length === resourceCountList.length) {
        const copiedComb = targetComb.map(item => item);
        targetCombList.push(copiedComb);
        return;
    }
    const curResourceCount = resourceCountList[targetComb.length];
    for (let j = 0; j < curResourceCount; j++) {
        targetComb.push(j);
        getResourceCombinationsExactMode(resourceCountList, targetComb, targetCombList);
        targetComb.pop();
    }
}