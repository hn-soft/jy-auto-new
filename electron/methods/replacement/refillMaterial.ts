import { screen, app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { cloneDeep } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { getImageDimensions } from "../../utils/imageUtils";
import { getVideoDimensions } from "../../utils/ffmpegUtils";
import { getAllArrangements, randomizeArrayOrder } from "../../utils/mathUtils";
import { delay } from "../../utils/transUtils";
import { rbClick, robot as rb } from "../../robot";
import { handleLoadProjectInfos } from "../common";

import {
  isLocked,
  isWinEnv,
  isKeyboardPR,
  isTargetedMaterial,
} from "../../utils/replaceUtils";
import { handleGetFirstProjectClickDeviation } from "../settings";
import { handleModifierChange } from "./modifier/handleModifierChange";
import type { TimerangeType } from "../../utils/types";

const chokidar = require("chokidar");

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");

const REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION = {
  DEFAULT_1X_SPEED: "default_1x_speed",
  SOURCE_SPEED: "source_speed",
};

const REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION = {
  LONG_CUT_SHORT_SPEED: "long_cut_short_speed",
  LONG_RIGHT_SHORT_SPEED: "long_right_short_speed",
  LONG_RANDOM_SHORT_SPEED: "long_random_short_speed",
  LONG_SPEED_SHORT_SPEED: "long_speed_short_speed",
  BREAK_TIMELINE: "break_timeline",
};

const REPLACE_VIDEO_DECORATION_SOLUTION = {
  NO_ALIGN: "no_align",
  YES_ALIGN_ATTRIBUTE_0: "yes_align_attribute_0",
  YES_ALIGN_ATTRIBUTE_ALL: "yes_align_attribute_all",
};

const REFILL_SELECT_MODE_SOLUTION = {
  ORDER: "order",
  RANDOM: "random",
};


import type { AutoRefillMaterialParamType,PInfoType } from "../../utils/types";
import type { RefillMaterialParamType } from "../../utils/types";

export const handleRefillMaterial = async (
  _event: any,
  param: RefillMaterialParamType,
  sourceJsonString: string,
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  }
) => {
  const activationStatus = handleGetActivationStatus();
  if (activationStatus.status === "expired") {
    const expiredDate = new Date(activationStatus.gt * 1000).toLocaleDateString(
      "zh-CN",
      { timeZone: "Asia/Shanghai" }
    );
    return {
      status: "error",
      data: `该软件已经到期，无法执行此操作，过期日期是 ${expiredDate}。诚挚恳请您续费，请跳转到"激活软件"页面获取新的产品信息码和联系方式。`,
    };
  }
  try {
    const trialTimeLeft = store.get(STORE_KEY.TRIAL_TIME_LEFT);
    if (activationStatus.status === "trial" && trialTimeLeft === 0) {
      return {
        status: "error",
        data: `您的剩余试用次数为0。诚挚恳请您购买正式版，请跳转到"激活软件"页面获取产品信息码和联系方式。`,
      };
    }
    // 之所以 oftl 要用小于等于，是为了防止漏网之鱼让它掉到0以下。
    if (
      activationStatus.status === "official" &&
      activationStatus.tier === "basic" &&
      activationStatus.oftl <= 0
    ) {
      return {
        status: "error",
        data: `您在有效期内剩余可用次数为0。无法为您执行本操作。建议您考虑续费不限次数的正式版。`,
      };
    }
    const {
      sourcePInfoPath,
      replaceTypesStr,
      resourceInfos,
      parentFolderDir,
      refillSelectModeSolution,
      newProjectCount,
      targetPInfoPaths,
    } = param;
    if (newProjectCount <= 0) {
      return {
        status: "error",
        data: "所需新草稿数量不对",
      };
    }
    if (activationStatus.status === "trial" && newProjectCount > 5) {
      return {
        status: "error",
        data: `试用版限制一次性只能生成至多5套新草稿，而当前你请求的是生成${newProjectCount}套新草稿。建议你减少所需新草稿数量再重试，你也可以购买正式版，正式版单次限制为1000个新草稿。`,
      };
    }
    const resultStrs = [];
    const sourceJyConfig = JSONbig.parse(sourceJsonString);
    // 按排列组合规律选出素材再copy
    const orderedFilenamesList: {
      extname: string;
      orderedFilenamesArr: string[][];
      orderedFilenames: string[];
      nextPickIndex: number;
    }[] = [];
    for (let i = 0; i < resourceInfos.length; i++) {
      const resourceInfo = resourceInfos[i];
      if (refillSelectModeSolution === REFILL_SELECT_MODE_SOLUTION.RANDOM) {
        const targetArrList = getAllArrangements(
          resourceInfo.filenames,
          resourceInfo.sourceCount,
          newProjectCount
        );
        if (targetArrList.length < newProjectCount) {
          return {
            status: "error",
            data: `${resourceInfo.extname}后缀文件排列数${targetArrList.length}小于所需新草稿数量${newProjectCount}`,
          };
        }
        randomizeArrayOrder(targetArrList);
        orderedFilenamesList.push({
          extname: resourceInfo.extname,
          orderedFilenamesArr: targetArrList,
          orderedFilenames: [],
          nextPickIndex: 0,
        });
      } else if (
        refillSelectModeSolution === REFILL_SELECT_MODE_SOLUTION.ORDER
      ) {
        // 比如有25个，而每个新草稿需要10个，那就是[0,10),[10,20)。剩下5个遗弃。
        // 这里我们假定newProjectCount这个数量不会太大，如何保证呢？前端保证的。
        const orderedCuttedFilenamesArr = [];
        let cutStartIndex = 0;
        for (let j = 0; j < newProjectCount; j++) {
          const cutEndIndex = cutStartIndex + resourceInfo.sourceCount;
          const orderedCuttedFilenames = resourceInfo.filenames.slice(
            cutStartIndex,
            cutEndIndex
          );
          orderedCuttedFilenamesArr.push(orderedCuttedFilenames);
          cutStartIndex = cutEndIndex;
        }
        orderedFilenamesList.push({
          extname: resourceInfo.extname,
          orderedFilenamesArr: orderedCuttedFilenamesArr,
          orderedFilenames: [],
          nextPickIndex: 0,
        });
      } else {
        return {
          status: "error",
          data: "refillSelectModeSolution is not set.",
        };
      }
    }
    for (let i = 0; i < newProjectCount; i++) {
      progressHandler.updateProgressInfo({
        fraction: i / newProjectCount,
        indication: `当前进度`,
      });
      orderedFilenamesList.forEach((item) => {
        item.orderedFilenames = item.orderedFilenamesArr[i];
        item.nextPickIndex = 0;
      });
      const targetPInfoPath = targetPInfoPaths[i];
      const targetProjectDir = path.resolve(targetPInfoPath, "..");
      const materialDir = path.resolve(targetProjectDir, "materialResources");
      if (!fs.existsSync(materialDir)) {
        fs.mkdirSync(materialDir);
      } else {
        fs.rmSync(materialDir, { recursive: true, force: true });
        fs.mkdirSync(materialDir);
      }
      orderedFilenamesList.forEach((item) => {
        item.orderedFilenames.forEach((filename) => {
          fs.cpSync(
            path.resolve(parentFolderDir, filename),
            path.resolve(materialDir, filename),
            { recursive: true }
          );
        });
      });
      const sourceTextReadingPath = path.resolve(
        sourcePInfoPath,
        "..",
        "textReading"
      );
      if (fs.existsSync(sourceTextReadingPath)) {
        fs.cpSync(
          sourceTextReadingPath,
          path.resolve(targetProjectDir, "textReading"),
          { recursive: true }
        );
      }
      const sourceAudioRecordPath = path.resolve(
        sourcePInfoPath,
        "..",
        "audio_record"
      );
      if (fs.existsSync(sourceAudioRecordPath)) {
        fs.cpSync(
          sourceAudioRecordPath,
          path.resolve(targetProjectDir, "audio_record"),
          { recursive: true }
        );
      }
      // 共享草稿的情况会把素材存在这个文件夹里，有可能_开头，需要复制。
      const sourceUnrelatedMaterialsPath = path.resolve(
        sourcePInfoPath,
        "..",
        "materials"
      );
      if (fs.existsSync(sourceUnrelatedMaterialsPath)) {
        fs.cpSync(
          sourceUnrelatedMaterialsPath,
          path.resolve(targetProjectDir, "materials"),
          { recursive: true }
        );
      }
      const targetJyConfig = cloneDeep(sourceJyConfig);
      const replaceTypes = replaceTypesStr.split("-");
      const resRMV = await handleRefillMaterialsVideo(
        param,
        orderedFilenamesList,
        materialDir,
        targetJyConfig,
        replaceTypes
      );
      if (resRMV.status !== "success") {
        return resRMV;
      }


      // modifier
      // const resMOD = await handleModifierChange(
      //   i,
      //   param.modifier,
      //   targetJyConfig,
      //   targetPInfoPath
      // );
      // if (resMOD.status !== "success") {
      //   return resMOD;
      // }


      flushVideoTotalDuration(targetJyConfig);
      resultStrs.push(targetJyConfig);
    }
    progressHandler.updateProgressInfo({
      fraction: 0.998,
      indication: `正在完成最后步骤...`,
    });
    for (let i = 0; i < newProjectCount; i++) {
      fs.writeFileSync(
        targetPInfoPaths[i],
        JSONbig.stringify(resultStrs[i]),
        "utf8"
      );
    }
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    return {
      status: "success",
      data: {
        taskCount: newProjectCount,
      },
    };
  } catch (e) {
    console.log(e);
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

// 对于单一目标json文件的修改操作，有i个新草稿，就会调用i次此函数（i是第一个参数），执行结果是同位替换 targetJyConfig.
const handleRefillMaterialsVideo = async (
  param: RefillMaterialParamType,
  orderedFilenamesList: {
    extname: string;
    orderedFilenamesArr: string[][];
    orderedFilenames: string[];
    nextPickIndex: number;
  }[],
  draftResourceFolderDir: string,
  targetJyConfig: any,
  replaceTypes: string[]
) => {
  const {
    videoDefaultSpeedSolution,
    videoLengthDifferenceSolution,
    videoDecorationSolution,
  } = param;
  const tracks = targetJyConfig.tracks;
  const materialVideos = targetJyConfig.materials.videos;
  const videoTracks = tracks.filter((track: any) =>
    isTaskTrack(track, targetJyConfig, replaceTypes)
  );
  // 跟随着改变时间线的视频移动而伴随的元素移动的任务记录，一条track弄一次，存在一定风险会不同视频素材起始和结尾刚好相同，但是可能性微乎其微。
  const segMoveTasks: {
    referenceSeg: { target_timerange: TimerangeType };
    referenceFrom: TimerangeType;
  }[] = [];
  for (let i = 0; i < videoTracks.length; i++) {
    const track = videoTracks[i];
    for (let j = 0; j < track.segments.length; j++) {
      const seg = track.segments[j];
      // 由于这个视频片段的时长和位置可能会发生变化（无论是图片还是视频，无论有没有下划线），所以如果需要重新对齐其他元素，就要提前记录下所有图片视频片段的旧位置
      segMoveTasks.push({
        referenceSeg: seg,
        referenceFrom: {
          start: seg.target_timerange.start,
          duration: seg.target_timerange.duration,
        },
      });
      const materialId = seg.material_id;
      const candidateMaterial = materialVideos.find(
        (v: any) => v.id === materialId
      );
      const candidateMaterialIndex = materialVideos.findIndex(
        (v: any) => v.id === materialId
      );
      if (
        candidateMaterialIndex !== -1 &&
        isTargetedMaterial(candidateMaterial, replaceTypes)
      ) {
        const extname = path.extname(candidateMaterial.path);
        const orderedFilenamesForSpecificExtname = orderedFilenamesList.find(
          (item) => item.extname === extname
        );
        if (orderedFilenamesForSpecificExtname === undefined) {
          return {
            status: "error",
            data: `遇到了 ${extname} 这个未知后缀`,
          };
        }
        if (
          orderedFilenamesForSpecificExtname.nextPickIndex >=
          orderedFilenamesForSpecificExtname.orderedFilenames.length
        ) {
          return {
            status: "error",
            data: "你可能在设置选项之后修改过参考草稿",
          };
        }
        const pickedFilename =
          orderedFilenamesForSpecificExtname.orderedFilenames[
            orderedFilenamesForSpecificExtname.nextPickIndex
          ];
        orderedFilenamesForSpecificExtname.nextPickIndex += 1;
        const newMaterialPath = path.resolve(
          draftResourceFolderDir,
          pickedFilename
        );
        if (isPhotoMaterial(candidateMaterial)) {
          const imageDim = await getImageDimensions(newMaterialPath);
          candidateMaterial.width = imageDim.width;
          candidateMaterial.height = imageDim.height;
        }
        if (isVideoMaterial(candidateMaterial)) {
          const videoDim = await getVideoDimensions(newMaterialPath);
          // 如果是 LONG_SPEED_SHORT_SPEED，则不需要管默认速度是哪个，因为没意义，直接变速即可。
          if (
            videoLengthDifferenceSolution ===
            REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_SPEED_SHORT_SPEED
          ) {
            speedNewMaterilToFitDuration(
              seg,
              targetJyConfig,
              videoDim.durationInUS
            );
          } else if (
            videoLengthDifferenceSolution ===
              REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_CUT_SHORT_SPEED ||
            videoLengthDifferenceSolution ===
              REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RIGHT_SHORT_SPEED ||
            videoLengthDifferenceSolution ===
              REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RANDOM_SHORT_SPEED
          ) {
            // 如果是DEFAULT_1X_SPEED则是1, REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION只有两个可能。然后拿新素材的长度来跟这个目标ratio比较长短，再决定裁切或者是变速。
            const defaultRatio =
              videoDefaultSpeedSolution ===
              REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION.SOURCE_SPEED
                ? seg.source_timerange.duration / seg.target_timerange.duration
                : 1;
            const ratioIfNewMaterialAllLengthUsed =
              videoDim.durationInUS / seg.target_timerange.duration;
            if (ratioIfNewMaterialAllLengthUsed > defaultRatio) {
              setSpeedPart(seg, targetJyConfig, defaultRatio);
              seg.speed = defaultRatio;
              seg.source_timerange.duration =
                seg.target_timerange.duration * defaultRatio;
              switch (videoLengthDifferenceSolution) {
                case REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_CUT_SHORT_SPEED:
                  seg.source_timerange.start = 0;
                  break;
                case REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RIGHT_SHORT_SPEED:
                  seg.source_timerange.start =
                    videoDim.durationInUS - seg.source_timerange.duration;
                  break;
                case REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RANDOM_SHORT_SPEED:
                  const mathmin = 0;
                  const mathmax =
                    videoDim.durationInUS - seg.source_timerange.duration;
                  const randVal = Math.random() * (mathmax - mathmin) + mathmin;
                  const randInt = Math.round(randVal);
                  seg.source_timerange.start = randInt;
                  break;
              }
            } else {
              speedNewMaterilToFitDuration(
                seg,
                targetJyConfig,
                videoDim.durationInUS
              );
            }
          } else if (
            videoLengthDifferenceSolution ===
            REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE
          ) {
            const defaultRatio =
              videoDefaultSpeedSolution ===
              REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION.SOURCE_SPEED
                ? seg.source_timerange.duration / seg.target_timerange.duration
                : 1;
            setSpeedPart(seg, targetJyConfig, defaultRatio);
            seg.speed = defaultRatio;
            seg.source_timerange.start = 0;
            seg.source_timerange.duration = videoDim.durationInUS;
            seg.target_timerange.duration =
              videoDim.durationInUS / defaultRatio;
          } else {
            // 现在不会有这种情况，以后可能添加其他选项在这里补
          }
          candidateMaterial.width = videoDim.width;
          candidateMaterial.height = videoDim.height;
          candidateMaterial.duration = videoDim.durationInUS;
        }
        candidateMaterial.material_name = pickedFilename;
        candidateMaterial.path = newMaterialPath;
      }
    }
    // 现在是在这个track的loop里，上面替换完了此track所有seg
    // 有可能需要去重叠，取决于是否 videoLengthDifferenceSolution === REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE
    // 其他情况无需去重叠。
    if (
      videoLengthDifferenceSolution ===
      REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE
    ) {
      for (let j = 1; j < track.segments.length; j++) {
        const curSeg = track.segments[j];
        const prevSeg = track.segments[j - 1];
        if (
          prevSeg.target_timerange.start + prevSeg.target_timerange.duration >
          curSeg.target_timerange.start
        ) {
          curSeg.target_timerange.start =
            prevSeg.target_timerange.start + prevSeg.target_timerange.duration;
        }
      }
      // 对于主轨道上的素材，无论重叠不重叠，都把它做成从左到右紧密排列
      const mainVideoTrack = getMainVideoTrack(targetJyConfig);
      if (!!mainVideoTrack && !isLocked(mainVideoTrack)) {
        const firstSeg = track.segments[0];
        if (!!firstSeg) {
          firstSeg.target_timerange.start = 0;
        }
        for (let j = 1; j < mainVideoTrack.segments.length; j++) {
          const curSeg = mainVideoTrack.segments[j];
          const prevSeg = mainVideoTrack.segments[j - 1];
          curSeg.target_timerange.start =
            prevSeg.target_timerange.start + prevSeg.target_timerange.duration;
        }
      }
    }
  }
  // 需要重新执行一遍两层循环，把原先对齐视频片段的元素再对齐，如果左右两端相同，这保证长度相同，如果不同，则移位即可
  if (videoDecorationSolution !== REPLACE_VIDEO_DECORATION_SOLUTION.NO_ALIGN) {
    let realignedTracks = [];
    if (
      videoDecorationSolution ===
      REPLACE_VIDEO_DECORATION_SOLUTION.YES_ALIGN_ATTRIBUTE_0
    ) {
      realignedTracks = tracks.filter((track: any) =>
        isRealignedTrack(track, targetJyConfig, replaceTypes)
      );
    }
    const realignedDoneSegIds = new Set();
    for (let h = 0; h < segMoveTasks.length; h++) {
      const segMoveTask = segMoveTasks[h];
      for (let i = 0; i < realignedTracks.length; i++) {
        const track = realignedTracks[i];
        for (let j = 0; j < track.segments.length; j++) {
          const seg = track.segments[j];
          if (realignedDoneSegIds.has(seg.id)) {
            continue;
          }
          if (
            areTimerangesSame(
              seg.target_timerange,
              segMoveTask.referenceFrom
            ) ||
            areTimerangesSame(seg.target_timerange, {
              start: 0,
              duration: targetJyConfig.duration,
            })
          ) {
            let newTargetStart = 0;
            let newTargetDuration = 0;
            if (
              areTimerangesSame(seg.target_timerange, segMoveTask.referenceFrom)
            ) {
              newTargetStart = segMoveTask.referenceSeg.target_timerange.start;
              newTargetDuration =
                segMoveTask.referenceSeg.target_timerange.duration;
            } else if (
              areTimerangesSame(seg.target_timerange, {
                start: 0,
                duration: targetJyConfig.duration,
              })
            ) {
              newTargetStart = 0;
              newTargetDuration = getTaskTracksVideoTotalDuration(
                targetJyConfig,
                replaceTypes
              ); // 这个是当前替换后的素材，targetJyConfig.duration则是先前的, 应该计算现有taskTrack最长长度
            } else {
              // 绝对不可能发生，除非后续修改了if条件。
              throw new Error();
            }
            // 如果从当前位置向后延展能够满足目标，则延展（不变速），如果不能，则干脆不延展，就直接变速。
            if (track.type === "video" || track.type === "audio") {
              const materialOfSeg = findMaterials(
                seg.material_id,
                targetJyConfig,
                `${track.type}s`
              );
              const materialDuration = materialOfSeg.duration;
              const maxPotentialNewSourceDuration =
                materialDuration - seg.source_timerange.start;
              const maxPotentialNewTargetDuration =
                (maxPotentialNewSourceDuration *
                  seg.target_timerange.duration) /
                seg.source_timerange.duration;
              // 如果符合条件者延展素材（不变速），否则就不延展素材，直接变速
              if (maxPotentialNewTargetDuration > newTargetDuration) {
                seg.source_timerange.duration = Math.round(
                  (newTargetDuration / seg.target_timerange.duration) *
                    seg.source_timerange.duration
                );
                seg.target_timerange.duration = newTargetDuration;
                seg.target_timerange.start = newTargetStart;
              } else {
                setSpeedPart(
                  seg,
                  targetJyConfig,
                  seg.source_timerange.duration / newTargetDuration
                );
                seg.speed = seg.source_timerange.duration / newTargetDuration;
                seg.target_timerange.duration = newTargetDuration;
                seg.target_timerange.start = newTargetStart;
              }
            } else {
              seg.target_timerange.duration = newTargetDuration;
              seg.target_timerange.start = newTargetStart;
            }
            realignedDoneSegIds.add(seg.id);
          } else if (
            areTimerangesInclusive(
              seg.target_timerange,
              segMoveTask.referenceFrom
            ) &&
            isReferenceSegReallyMoved(segMoveTask)
          ) {
            if (
              areStickToRightEdge(
                seg.target_timerange,
                segMoveTask.referenceFrom
              )
            ) {
              // 特殊情况，特效或滤镜等元素原本对齐素材右端，现在继续保持右端对齐
              const movedDistance =
                segMoveTask.referenceSeg.target_timerange.start +
                segMoveTask.referenceSeg.target_timerange.duration -
                (segMoveTask.referenceFrom.start +
                  segMoveTask.referenceFrom.duration);
              seg.target_timerange.start += movedDistance;
              // 替换后的视频片段可能短得多，所以如果这个元素超出了范围，我们要把它纠正，框定回范围内，提升视觉效果。
              if (
                seg.target_timerange.start <
                segMoveTask.referenceSeg.target_timerange.start
              ) {
                const diff =
                  segMoveTask.referenceSeg.target_timerange.start -
                  seg.target_timerange.start;
                seg.target_timerange.start =
                  segMoveTask.referenceSeg.target_timerange.start;
                seg.target_timerange.duration -= diff;
              }
            } else {
              // 一般情况，左端距离保持不变
              const movedDistance =
                segMoveTask.referenceSeg.target_timerange.start -
                segMoveTask.referenceFrom.start;
              seg.target_timerange.start += movedDistance;
              // 替换后的视频片段可能短得多，所以如果这个元素超出了范围，我们要把它纠正，框定回范围内，提升视觉效果。
              const unadjustedSegEnd =
                seg.target_timerange.start + seg.target_timerange.duration;
              const curReferenceSegEnd =
                segMoveTask.referenceSeg.target_timerange.start +
                segMoveTask.referenceSeg.target_timerange.duration;
              if (unadjustedSegEnd > curReferenceSegEnd) {
                seg.target_timerange.duration =
                  curReferenceSegEnd - seg.target_timerange.start;
              }
            }
            realignedDoneSegIds.add(seg.id);
          }
        }
      }
    }
    // 附属元素移动到对齐video seg的操作后可能有重叠，需要对于附属元素所在track进行位置去重
    for (let i = 0; i < realignedTracks.length; i++) {
      const track = realignedTracks[i];
      for (let j = 1; j < track.segments.length; j++) {
        const curSeg = track.segments[j];
        const prevSeg = track.segments[j - 1];
        if (
          prevSeg.target_timerange.start + prevSeg.target_timerange.duration >
          curSeg.target_timerange.start
        ) {
          curSeg.target_timerange.start =
            prevSeg.target_timerange.start + prevSeg.target_timerange.duration;
        }
      }
    }
  }
  return { status: "success" };
};

export const flushVideoTotalDuration = (jyConfig: any) => {
  if (jyConfig.duration === undefined) {
    return { status: "error", data: "Duration does not exist" };
  }
  let durationToSet = 0;
  const tracks = jyConfig.tracks;
  if (!Array.isArray(tracks)) {
    return { status: "error", data: "Tracks is not an array." };
  }
  tracks.forEach((track) => {
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      return;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    if (lastEnd > durationToSet) {
      durationToSet = lastEnd;
    }
  });
  jyConfig.duration = durationToSet;
};

export const getTaskTracksVideoTotalDuration = (
  jyConfig: any,
  replaceTypes: string[]
) => {
  let durationToSet = 0;
  const tracks = jyConfig.tracks.filter((track: any) =>
    isTaskTrack(track, jyConfig, replaceTypes)
  );
  tracks.forEach((track: any) => {
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      return;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    if (lastEnd > durationToSet) {
      durationToSet = lastEnd;
    }
  });
  return durationToSet;
};

function isPhotoMaterial(material: any) {
  return material.type === "photo";
}

function isVideoMaterial(material: any) {
  return material.type === "video";
}

const setSpeedPart = (seg: any, jyConfig: any, speedRatio: number) => {
  const speeds = jyConfig.materials.speeds;
  let speedObj = null;
  for (let i = 0; i < speeds.length; i++) {
    const curSpeedObj = speeds[i];
    if (seg.extra_material_refs.includes(curSpeedObj.id)) {
      speedObj = curSpeedObj;
      break;
    }
  }
  if (speedObj === null) {
    const speedId = `00000001${seg.id.substring(8, 36)}`;
    speeds.push({
      curve_speed: null,
      id: speedId,
      mode: 0,
      speed: speedRatio,
      type: "speed",
    });
    seg.extra_material_refs.push(speedId);
    return;
  }
  speedObj.speed = speedRatio;
};

const speedNewMaterilToFitDuration = (
  seg: any,
  jyConfig: any,
  newDuration: number
) => {
  const vdsp = newDuration / seg.target_timerange.duration;
  setSpeedPart(seg, jyConfig, vdsp);
  seg.speed = vdsp;
  seg.source_timerange.start = 0;
  seg.source_timerange.duration = newDuration;
};

const areTimerangesSame = (
  timerangeA: TimerangeType,
  timerangeB: TimerangeType
) => {
  if (timerangeA == null) {
    return false;
  }
  return (
    Math.abs(timerangeA.start - timerangeB.start) < 100 &&
    Math.abs(timerangeA.duration - timerangeB.duration) < 100
  );
};

const findMaterials = (
  materialId: string,
  jyConfig: any,
  materialSubCategory: string
) => {
  const subMaterials = jyConfig.materials[materialSubCategory];
  return subMaterials.find((item: any) => item.id === materialId);
};

const areTimerangesInclusive = (
  timerangeA: TimerangeType,
  timerangeB: TimerangeType
) => {
  if (timerangeA == null) {
    return false;
  }
  const aStart = timerangeA.start;
  const bStart = timerangeB.start;
  const aEnd = timerangeA.start + timerangeA.duration;
  const bEnd = timerangeB.start + timerangeB.duration;
  return aStart >= bStart && aEnd <= bEnd;
};

const areStickToRightEdge = (
  timerangeA: TimerangeType,
  timerangeB: TimerangeType
) => {
  if (timerangeA == null) {
    return false;
  }
  const aEnd = timerangeA.start + timerangeA.duration;
  const bEnd = timerangeB.start + timerangeB.duration;
  return Math.abs(aEnd - bEnd) < 500000; // 0.5s内
};

const isReferenceSegReallyMoved = (task: {
  referenceSeg: { target_timerange: TimerangeType };
  referenceFrom: TimerangeType;
}) => {
  return (
    task.referenceSeg.target_timerange.start !== task.referenceFrom.start ||
    task.referenceSeg.target_timerange.duration !== task.referenceFrom.duration
  );
};

const getMainVideoTrack = (jyConfig: any) => {
  const tracks = jyConfig.tracks;
  const videoTracks = tracks.filter((track: any) => track.type === "video");
  return videoTracks[0];
};

export const handleAutoRefillMaterial = async (
  _event: any,
  param: AutoRefillMaterialParamType,
  sourceJsonString: string,
  progressHandler: {
    updateProgressInfo: (param: {
      fraction: number;
      indication: string;
    }) => void;
  }
) => {
  const activationStatus = handleGetActivationStatus();
  if (activationStatus.status === "expired") {
    const expiredDate = new Date(activationStatus.gt * 1000).toLocaleDateString(
      "zh-CN",
      { timeZone: "Asia/Shanghai" }
    );
    return {
      status: "error",
      data: `该软件已经到期，无法执行此操作，过期日期是 ${expiredDate}。诚挚恳请您续费，请跳转到"激活软件"页面获取新的产品信息码和联系方式。`,
    };
  }
  try {
    const trialTimeLeft = store.get(STORE_KEY.TRIAL_TIME_LEFT);
    if (activationStatus.status === "trial" && trialTimeLeft === 0) {
      return {
        status: "error",
        data: `您的剩余试用次数为0。诚挚恳请您购买正式版，请跳转到"激活软件"页面获取产品信息码和联系方式。`,
      };
    }
    // 之所以 oftl 要用小于等于，是为了防止漏网之鱼让它掉到0以下。
    if (
      activationStatus.status === "official" &&
      activationStatus.tier === "basic" &&
      activationStatus.oftl <= 0
    ) {
      return {
        status: "error",
        data: `您在有效期内剩余可用次数为0。无法为您执行本操作。建议您考虑续费不限次数的正式版。`,
      };
    }
    const {
      sourcePInfoPath,
      replaceTypesStr,
      resourceInfos,
      parentFolderDir,
      refillSelectModeSolution,
      chosenLatencyFactor,
      newProjectCount,
    } = param;
    if (newProjectCount <= 0) {
      return {
        status: "error",
        data: "所需新草稿数量不对",
      };
    }
    if (activationStatus.status === "trial" && newProjectCount > 5) {
      return {
        status: "error",
        data: `试用版限制一次性只能生成至多5套新草稿，而当前你请求的是生成${newProjectCount}套新草稿。建议你减少所需新草稿数量再重试，你也可以购买正式版，正式版单次限制为1000个新草稿。`,
      };
    }
    const sourceJyConfig = JSONbig.parse(sourceJsonString);
    // 按排列组合规律选出素材再copy
    const orderedFilenamesList: {
      extname: string;
      orderedFilenamesArr: string[][];
      orderedFilenames: string[];
      nextPickIndex: number;
    }[] = [];
    for (let i = 0; i < resourceInfos.length; i++) {
      const resourceInfo = resourceInfos[i];
      if (refillSelectModeSolution === REFILL_SELECT_MODE_SOLUTION.RANDOM) {
        const targetArrList = getAllArrangements(
          resourceInfo.filenames,
          resourceInfo.sourceCount,
          newProjectCount
        );
        if (targetArrList.length < newProjectCount) {
          return {
            status: "error",
            data: `${resourceInfo.extname}后缀文件排列数${targetArrList.length}小于所需新草稿数量${newProjectCount}`,
          };
        }
        orderedFilenamesList.push({
          extname: resourceInfo.extname,
          orderedFilenamesArr: targetArrList,
          orderedFilenames: [],
          nextPickIndex: 0,
        });
      } else if (
        refillSelectModeSolution === REFILL_SELECT_MODE_SOLUTION.ORDER
      ) {
        // 比如有25个，而每个新草稿需要10个，那就是[0,10),[10,20)。剩下5个遗弃。
        // 这里我们假定newProjectCount这个数量不会太大，如何保证呢？前端保证的。
        const orderedCuttedFilenamesArr = [];
        let cutStartIndex = 0;
        for (let j = 0; j < newProjectCount; j++) {
          const cutEndIndex = cutStartIndex + resourceInfo.sourceCount;
          const orderedCuttedFilenames = resourceInfo.filenames.slice(
            cutStartIndex,
            cutEndIndex
          );
          orderedCuttedFilenamesArr.push(orderedCuttedFilenames);
          cutStartIndex = cutEndIndex;
        }
        orderedFilenamesList.push({
          extname: resourceInfo.extname,
          orderedFilenamesArr: orderedCuttedFilenamesArr,
          orderedFilenames: [],
          nextPickIndex: 0,
        });
      } else {
        return {
          status: "error",
          data: "refillSelectModeSolution is not set.",
        };
      }
    }
    progressHandler.updateProgressInfo({
      fraction: 0,
      indication: `请立刻聚焦于剪映窗口（不要打开具体草稿），让它出现在屏幕正中央。`,
    });
    await delay(5000);
    for (let i = 0; i < newProjectCount; i++) {
      progressHandler.updateProgressInfo({
        fraction: i / newProjectCount,
        indication: `当前进度`,
      });
      orderedFilenamesList.forEach((item) => {
        item.orderedFilenames = item.orderedFilenamesArr[i];
        item.nextPickIndex = 0;
      });
      const preTimestamp = 1000 * +new Date();
      await delay(1000 * chosenLatencyFactor);
      rb.keyTap("n", [isWinEnv() ? "control" : "command"]);
      await delay(1000 * chosenLatencyFactor);
      isWinEnv() ? rb.keyTap("f4", ["alt"]) : rb.keyTap("w", ["command"]);
      await delay(1000 * chosenLatencyFactor);
      const projectInfos = handleLoadProjectInfos();
      if (projectInfos.status === "error") {
        return projectInfos;
      }
      const storeInfos = JSON.parse(projectInfos.data);
      const pInfoArr = storeInfos.all_draft_store;
      const timerangeFiltered = pInfoArr.filter(
        (pInfo: PInfoType) => pInfo.tm_draft_create > preTimestamp
      );
      if (timerangeFiltered.length === 0) {
        app.focus({
          steal: true,
        });
        return {
          status: "error",
          data: "奇怪了! 机器做了新建草稿操作，但是却检测不到新草稿。可能是你鼠标点了别的地方，使得剪映失去焦点，也可能你拖动了剪映窗口，使得软件没法点击草稿。导致新建草稿失败。如果你的剪映初始窗口不在正中央，可能导致识别失败，解决方法是关闭剪映，再打开剪映，就在正中央了。此次操作终止，请重试。",
        };
      }
      // 大概率只有一项在sort，因为与此同时新建的概率不大，如果遇到小概率也没辙了，任选吧，错就错
      timerangeFiltered.sort(
        (a: PInfoType, b: PInfoType) => b.tm_draft_create - a.tm_draft_create
      );
      const targetPInfoPath = timerangeFiltered[0].draft_json_file;
      console.log("targetPInfoPath is:", targetPInfoPath);
      const targetProjectDir = path.resolve(targetPInfoPath, "..");
      const materialDir = path.resolve(targetProjectDir, "materialResources");
      if (!fs.existsSync(materialDir)) {
        fs.mkdirSync(materialDir);
      } else {
        fs.rmSync(materialDir, { recursive: true, force: true });
        fs.mkdirSync(materialDir);
      }
      orderedFilenamesList.forEach((item) => {
        item.orderedFilenames.forEach((filename) => {
          fs.cpSync(
            path.resolve(parentFolderDir, filename),
            path.resolve(materialDir, filename),
            { recursive: true }
          );
        });
      });
      const sourceTextReadingPath = path.resolve(
        sourcePInfoPath,
        "..",
        "textReading"
      );
      if (fs.existsSync(sourceTextReadingPath)) {
        fs.cpSync(
          sourceTextReadingPath,
          path.resolve(targetProjectDir, "textReading"),
          { recursive: true }
        );
      }
      const sourceAudioRecordPath = path.resolve(
        sourcePInfoPath,
        "..",
        "audio_record"
      );
      if (fs.existsSync(sourceAudioRecordPath)) {
        fs.cpSync(
          sourceAudioRecordPath,
          path.resolve(targetProjectDir, "audio_record"),
          { recursive: true }
        );
      }
      // 共享草稿的情况会把素材存在这个文件夹里，有可能_开头，需要复制。
      const sourceUnrelatedMaterialsPath = path.resolve(
        sourcePInfoPath,
        "..",
        "materials"
      );
      if (fs.existsSync(sourceUnrelatedMaterialsPath)) {
        fs.cpSync(
          sourceUnrelatedMaterialsPath,
          path.resolve(targetProjectDir, "materials"),
          { recursive: true }
        );
      }
      const targetJyConfig = cloneDeep(sourceJyConfig);
      const replaceTypes = replaceTypesStr.split("-");
      const resRMV = await handleRefillMaterialsVideo(
        {
          ...param,
          targetPInfoPaths: [], // just for typing, passing into it is meaningless
        },
        orderedFilenamesList,
        materialDir,
        targetJyConfig,
        replaceTypes
      );
      if (resRMV.status !== "success") {
        return resRMV;
      }


      // 在老版本中没有此方法，暂时注释掉

      // modifier
      // const resMOD = await handleModifierChange(
      //   i,
      //   param.modifier,
      //   targetJyConfig,
      //   targetPInfoPath
      // );
      // if (resMOD.status !== "success") {
      //   return resMOD;
      // }


      flushVideoTotalDuration(targetJyConfig);
      fs.writeFileSync(
        targetPInfoPath,
        JSONbig.stringify(targetJyConfig),
        "utf8"
      );
      const mainScreen = screen.getPrimaryDisplay();
      const screenWidth = mainScreen.size.width;
      const screenHeight = mainScreen.size.height;
      const deviation = handleGetFirstProjectClickDeviation();
      rbClick({
        x: screenWidth / 2 - 200 + deviation.x,
        y: screenHeight / 2 - 30 + deviation.y,
      });
      await delay(1000 + 1000 * chosenLatencyFactor);
      rb.keyTap(isKeyboardPR() ? "m" : "e", [
        isWinEnv() ? "control" : "command",
      ]);
      await delay(1000 + 1000 * chosenLatencyFactor);
      let watcher: any = null;
      // 一定不能过早挂载fs.watch，因为打开草稿时会触发一次新增importcache，把materialResources的内容加进去。
      await new Promise((resolve, reject) => {
        let hasResolved = false;
        watcher = chokidar
          .watch(targetProjectDir)
          .on("all", (event: any, path: any) => {
            if (event === "change" && path.endsWith("draft_settings")) {
              console.log("chokidar detects it");
              hasResolved = true;
              resolve(null);
              return;
            }
          });
        setTimeout(() => {
          rb.keyTap("enter");
        }, 500);
        setTimeout(() => {
          if (!hasResolved) {
            reject(
              "Timeout. Maybe your video is too long. It takes more than two hours to export. Or you have not focused on CapCut Window."
            );
          }
        }, 7200000); // 容纳二个小时的时间，后续可以改掉，让用户改，现在先写死。
      });
      if (watcher && watcher.close) {
        watcher.close();
      }
      console.log("I think export is finished.", i);
      await delay(1000 + 1000 * chosenLatencyFactor); // 这个延迟非常重要，因为剪映需要一定时间把导出窗口变成导出成功窗口，如果不等待，按command+w就会失败，导致需要按三次
      if (store.get(STORE_KEY.BATCH_REPLACE_CLICK_EXPORT_WINDOW)) {
        rbClick({
          x: screenWidth / 2,
          y: screenHeight / 2,
        });
        await delay(2000);
      }
      if (
        param.refillSelectModeSolution === REFILL_SELECT_MODE_SOLUTION.ORDER &&
        param.deleteAfterComplete
      ) {
        orderedFilenamesList.forEach((item) => {
          item.orderedFilenames.forEach((filename) => {
            fs.rmSync(
              path.resolve(parentFolderDir, filename),
              { force: true }
            );
          });
        });
      }
      isWinEnv() ? rb.keyTap("f4", ["alt"]) : rb.keyTap("w", ["command"]);
      console.log("clicked first exit");
      let isExitProjectDetected = false;
      let exitWatcher = null;
      let exitRetry = 0;
      if (store.get(STORE_KEY.IS_3_EXIT_WINDOW)) {
        exitWatcher = chokidar
        .watch(targetProjectDir)
        .on("all", (event: any, path: any) => {
          if (event === "change" && path.endsWith("draft_settings")) {
            console.log("chokidar detects exit project");
            isExitProjectDetected = true;
            return;
          }
        });
      }
      await delay(1000 + 1000 * chosenLatencyFactor);
      isWinEnv() ? rb.keyTap("f4", ["alt"]) : rb.keyTap("w", ["command"]);
      console.log("clicked second exit");
      await delay(1000 + 1000 * chosenLatencyFactor);
      while (store.get(STORE_KEY.IS_3_EXIT_WINDOW) && !isExitProjectDetected && exitRetry < 3) {
        isWinEnv() ? rb.keyTap("f4", ["alt"]) : rb.keyTap("w", ["command"]);
        console.log('clicked additional exit');
        await delay(1000 + 1000 * chosenLatencyFactor);
        exitRetry++;
      }
      if (exitWatcher && exitWatcher.close) {
        exitWatcher.close();
      }
    }
    progressHandler.updateProgressInfo({
      fraction: 0.998,
      indication: `正在完成最后步骤...`,
    });
    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    app.focus({
      steal: true,
    });
    return {
      status: "success",
      data: {
        taskCount: newProjectCount,
      },
    };
  } catch (e) {
    console.log(e);
    app.focus({
      steal: true,
    });
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const isTaskTrack = (
  track: any,
  targetJyConfig: any,
  replaceTypes: string[]
) => {
  if (isLocked(track)) {
    return false;
  }
  if (track.type !== "video") {
    return false;
  }
  const materialVideos = targetJyConfig.materials.videos;

  const isVideoToBeReplacedOnly =
    replaceTypes.length === 1 && replaceTypes[0] === "video";
  if (
    isVideoToBeReplacedOnly &&
    !hasAnyVideoMaterialOnVideoTrack(track, materialVideos)
  ) {
    return false;
  }
  const isPhotoToBeReplacedOnly =
    replaceTypes.length === 1 && replaceTypes[0] === "photo";
  if (
    isPhotoToBeReplacedOnly &&
    !hasAnyPhotoMaterialOnVideoTrack(track, materialVideos)
  ) {
    return false;
  }
  return true;
};

const isRealignedTrack = (
  track: any,
  targetJyConfig: any,
  replaceTypes: string[]
) => {
  if (isLocked(track)) {
    return false;
  }
  return !isTaskTrack(track, targetJyConfig, replaceTypes);
};

const hasAnyVideoMaterialOnVideoTrack = (track: any, materialVideos: any) => {
  for (let i = 0; i < track.segments.length; i++) {
    const seg = track.segments[i];
    const materialId = seg.material_id;
    const material = materialVideos.find((v: any) => v.id === materialId);
    if (material === undefined) {
      continue;
    }
    if (
      material.material_name.startsWith("_") ||
      material.material_name.startsWith("ignoreme") ||
      material.material_name.startsWith("复合片段") ||
      material.material_name.startsWith("Compound clip")
    ) {
      continue;
    }
    if (material.type === "video") {
      return true;
    }
  }
  return false;
};

const hasAnyPhotoMaterialOnVideoTrack = (track: any, materialVideos: any) => {
  for (let i = 0; i < track.segments.length; i++) {
    const seg = track.segments[i];
    const materialId = seg.material_id;
    const material = materialVideos.find((v: any) => v.id === materialId);
    if (material === undefined) {
      continue;
    }
    if (
      material.material_name.startsWith("_") ||
      material.material_name.startsWith("ignoreme") ||
      material.material_name.startsWith("复合片段") ||
      material.material_name.startsWith("Compound clip")
    ) {
      continue;
    }
    if (material.type === "photo") {
      return true;
    }
  }
  return false;
};
