import * as path from "path";
import { filter } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY } from "../../utils/const";
import { isLocked, isTargetedMaterial } from "../../utils/replaceUtils";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { PreReplaceMaterialParamType } from "../../utils/types";

// 此函数是在批量替换之前先分析参考草稿的内容，得出需要替换什么样的文件格式，有多少个
export const handlePreReplaceMaterial = async (
  _event: any,
  param: PreReplaceMaterialParamType,
  jsonString: string
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
    const jyConfigOriginal = JSONbig.parse(jsonString);
    const tracks = jyConfigOriginal.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    const materialVideos = jyConfigOriginal.materials.videos;
    if (!Array.isArray(materialVideos)) {
      return { status: "error", data: "materials.videos is not an array." };
    }
    const videoTracks = tracks.filter(
      (track) => track.type === "video" && !isLocked(track)
    );
    const ignoredVideoTracks = tracks.filter(
      (track) => track.type === "video" && isLocked(track)
    );
    if (videoTracks.length === 0) {
      return {
        status: "error",
        data: `没有任何合格的视频轨道需要替换素材。合格的意思是说：这个轨道是不能锁定的。如果你锁定了某一条视频轨道，本软件会将其原封不动搬到新草稿，不寻求替换此轨道素材。你应该解除那条你想替换素材的轨道的锁定状态。`,
      };
    }
    let photoCount = 0;
    let videoCount = 0;
    const extnameMap = new Map<string, number>();
    // basename prefix e.g. left.mp4，basename prefix is left. Used for partition refill
    const basenameParts = [];
    for (let i = 0; i < videoTracks.length; i++) {
      const track = videoTracks[i];
      for (let j = 0; j < track.segments.length; j++) {
        const seg = track.segments[j];
        const materialId = seg.material_id;
        const candidateMaterial = materialVideos.find(
          (v) => v.id === materialId
        );
        if (isTargetedMaterial(candidateMaterial, param.replaceTypes)) {
          if (isPhotoMaterial(candidateMaterial)) {
            photoCount++;
          }
          if (isVideoMaterial(candidateMaterial)) {
            videoCount++;
          }
          const extname = path.extname(candidateMaterial.path);
          const basename = path.basename(candidateMaterial.path);
          const bp = basename.replace(/\.[^/.]+$/, "");
          basenameParts.push({
            prefix: bp,
            suffix: extname,
          });
          const curExtnameCount = extnameMap.get(extname);
          if (curExtnameCount === undefined) {
            extnameMap.set(extname, 1);
          } else {
            extnameMap.set(extname, curExtnameCount + 1);
          }
        }
      }
    }
    if (photoCount === 0 && videoCount === 0) {
      return {
        status: "error",
        data: `在非锁定非隐藏非静音的视频轨道上没有任何素材。`,
      };
    }
    if (activationStatus.status === "trial") {
      if (photoCount > 3) {
        return {
          status: "error",
          data: `试用版可批量替换的图片素材数量限制为不超过3，该草稿有${photoCount}个图片片段，请考虑删除${
            photoCount - 3
          }个图片片段后再试用。如果试用满意，你可以考虑点击左侧的"激活软件"页购买正式版，正式版可以批量替换无数量上限的图片片段。`,
        };
      }
      if (videoCount > 3) {
        return {
          status: "error",
          data: `试用版可批量替换的视频素材数量限制为不超过3，该草稿有${videoCount}个视频片段，请考虑删除${
            videoCount - 3
          }个视频片段后再试用。如果试用满意，你可以考虑点击左侧的"激活软件"页购买正式版，正式版可以批量替换无数量上限的视频片段。`,
        };
      }
    }
    const extnames = Array.from(extnameMap, ([extname, count]) => ({
      extname,
      count,
    }));

    return {
      status: "success",
      data: {
        eachCount: {
          videoCount,
          photoCount,
          ignoredVideoTrackCount: ignoredVideoTracks.length,
        },
        extnames,
        basenameParts,
      },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
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

const speedingTrack = (jyConfig: any, speedRatio: number) => {
  try {
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    const audioTracks = filter(tracks, {
      type: "audio",
      attribute: 0,
    });
    if (!audioTracks.length) {
      return {
        status: "error",
        data: "没有任何符合条件（未消音且未锁定）的音频轨道，无法为您做音频变速操作。",
      };
    }
    const speedMap = new Map();
    // @ts-ignore
    jyConfig.materials.speeds.forEach((item) => {
      speedMap.set(item.id, item);
    });
    // @ts-ignore
    audioTracks.forEach((track) => {
      for (let i = 0; i < track.segments.length; i++) {
        const curSeg = track.segments[i];
        curSeg.target_timerange.duration = Math.round(
          curSeg.source_timerange.duration / speedRatio
        );
        curSeg.speed = speedRatio;
        // @ts-ignore
        curSeg.extra_material_refs.forEach((ref) => {
          if (speedMap.has(ref)) {
            speedMap.get(ref).speed = speedRatio;
          }
        });
        if (i + 1 < track.segments.length) {
          const nextSeg = track.segments[i + 1];
          if (
            curSeg.target_timerange.start + curSeg.target_timerange.duration >
            nextSeg.target_timerange.start
          ) {
            nextSeg.target_timerange.start =
              curSeg.target_timerange.start + curSeg.target_timerange.duration;
          }
        }
      }
    });
    audioTracks.forEach((track) => {
      for (let i = 0; i < track.segments.length; i++) {
        const curSeg = track.segments[i];
        if (i === 0) {
          curSeg.target_timerange.start = 0;
        } else {
          const prevSeg = track.segments[i - 1];
          curSeg.target_timerange.start =
            prevSeg.target_timerange.start + prevSeg.target_timerange.duration;
        }
      }
    });
    return {
      status: "success",
    };
  } catch (err) {
    // @ts-ignore
    return { status: "error", data: `${err?.message || err}` };
  }
};

function isPhotoMaterial(material: any) {
  return material.type === "photo";
}

function isVideoMaterial(material: any) {
  return material.type === "video";
}