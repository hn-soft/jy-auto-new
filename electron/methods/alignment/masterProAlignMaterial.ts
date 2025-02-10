import * as fs from "fs";
import { cloneDeep, filter, remove } from "lodash";
import { handleGetActivationStatus } from "../activation";
import { STORE_KEY, MASTER_PRO_COM_PREFIX as COM_PREFIX } from "../../utils/const";

const Store = require("electron-store");
const store = new Store();
const JSONbig = require("json-bigint");
import type { MasterProAlignMaterialParamType } from "../../utils/types";

const PRO_GAP_SETTING = {
  KEEP_ORI_GAP: "keep_ori_gap",
  ALL_REMOVE: "all_remove",
  ALL_REMOVE_EXCEPT_START_END: "all_remove_except_start_end",
};

const MUTE_SETTING = {
  YES_MUTE: "yes_mute",
  NO_MUTE: "no_mute",
  TALK_MUTE: "talk_mute",
};

const AIR_CHANGE_SETTING = {
  YES_AIR_CHANGE: "yes_air_change",
  NO_AIR_CHANGE: "no_air_change",
};

const MIN_VEG_LENGTH_FOR_FADE = 1000000; // 需在此值以上才可添加淡入淡出

export const handleMasterProAlignMaterial = async (
  _event: any,
  param: MasterProAlignMaterialParamType,
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
    let jyConfig = cloneDeep(jyConfigOriginal);
    const tracks = jyConfig.tracks;
    if (!Array.isArray(tracks)) {
      return { status: "error", data: "Tracks is not an array." };
    }
    // 操作之前第一步，检验草稿合规性
    const videoTracks = filter(tracks, {
      type: "video",
    });
    if (videoTracks.length === 0) {
      return { status: "error", data: "请添加一段视频到主轨道。" };
    }
    if (videoTracks.length > 1) {
      return {
        status: "error",
        data: `请只添加一段视频到主轨道，当前有${videoTracks.length}条视频轨道，请删除多余轨道。`,
      };
    }
    const vegs = videoTracks[0].segments;
    if (vegs.length === 0) {
      return { status: "error", data: "请添加一段视频到主轨道。" };
    }
    if (vegs.length > 1) {
      return {
        status: "error",
        data: `主轨道上视频片段的数量必须为1，当前有${vegs.length}段视频片段。如果你真的需要添加${vegs.length}段，本功能无法支持。变通的方法是：请你先用另外的草稿将这些视频片段合并为一个视频片段，再导入到此草稿以执行操作。`,
      };
    }
    const veg = vegs[0];
    if (veg.speed < 0.999 || veg.speed > 1.001) {
      return {
        status: "error",
        data: "拖入主轨道的视频不可以在本软件处理之前执行变速。",
      };
    }
    for (let i = 0; i < veg.extra_material_refs.length; i++) {
      const mRef = veg.extra_material_refs[i];
      const draftFound = jyConfig.materials.drafts.find(
        (item: any) => item.id === mRef
      );
      if (draftFound) {
        return {
          status: "error",
          data: "该功能需要主轨道的视频素材是原汁原味的素材，不可以是编辑过的复合片段，而你当前使用了复合片段。一个解决此问题的思路是：你把当前视频导出，再导入到一个新草稿中操作。在你导出时，就糅合成为了一个原汁原味的视频。再把这个视频文件导入草稿时间线，就符合条件了，不再是复合片段了。温馨提示：你导出时很可能是想要去掉字幕和AI语音的哦~",
        };
      }
    }
    if (
      veg.source_timerange.start !== veg.target_timerange.start ||
      veg.source_timerange.duration !== veg.target_timerange.duration
    ) {
      return {
        status: "error",
        data: "拖入主轨道的视频不可以在本软件处理之前裁剪掉左侧，也就是原视频素材的第一瞬间必须出现在时间轴上，如果你不想要最开始的部分，可以在下面的选项中选择裁剪掉，或者不裁剪，在输出成品草稿之后自行裁剪，这个限制是为了避免字幕与视频错位。另外，视频在主轨道上需要从00:00开始。",
      };
    }
    const textTracks = filter(tracks, {
      type: "text",
      attribute: 0,
    });
    if (textTracks.length === 0) {
      return {
        status: "error",
        data: "没有任何文字（字幕）轨道，无法执行对齐操作，请确保你已经添加了字幕并关闭草稿",
      };
    }
    if (textTracks.length > 1) {
      return {
        status: "error",
        data: "不可以有多条文字（字幕）轨道，请你将字幕之外的文字隐藏或删除，先专注于对齐。如果你的字幕在朗读AI语音后就散落多个轨道，那你的错误应该是你勾选了朗读跟随文本更新，请去掉此勾选再朗读，使得字幕只出现在一条轨道。",
      };
    }
    // text segs is tegs
    const tegs = textTracks[0].segments;
    const ranges = [];
    ranges.push(0);
    for (let i = 0; i < tegs.length; i++) {
      const lastElement = ranges[ranges.length - 1];
      const teg = tegs[i];
      const rangeLeft = teg.target_timerange.start;
      if (rangeLeft !== lastElement) {
        ranges.push(rangeLeft);
      }
      const rangeRight =
        teg.target_timerange.start + teg.target_timerange.duration;
      // rangeRight is never rangeLeft, just in case of been manipulated by others before this action
      if (rangeRight !== rangeLeft) {
        ranges.push(rangeRight);
      }
    }
    if (ranges[ranges.length - 1] > veg.source_timerange.duration) {
      return {
        status: "error",
        data: "最后一段字幕的右边沿不应该比视频右端更靠右，请手动将最后一段字幕移动到左侧再使用本软件。",
      };
    }
    if (veg.source_timerange.duration !== ranges[ranges.length - 1]) {
      // last element is video duration
      ranges.push(veg.source_timerange.duration);
    }
    const splitCount = ranges.length - 1;
    const handleMaterialCopy = (jyConfig: any, name: string, seg: any) => {
      const ma = jyConfig.materials[name];
      if (!Array.isArray(ma)) {
        return { status: "error", data: `weird ${name}` };
      }
      let videoMAIdx = -1;
      if (name === "videos") {
        videoMAIdx = ma.findIndex(
          (element: any) => seg.material_id === element.id
        );
      } else {
        videoMAIdx = ma.findIndex((element: any) =>
          seg.extra_material_refs.includes(element.id)
        );
      }
      if (videoMAIdx === -1) {
        return {
          status: "error",
          data: `weird. no ${name} obj found for video seg`,
        };
      }
      ma[videoMAIdx].id = generateId(`materials.${name}`, 0);
      for (let i = 1; i < splitCount; i++) {
        const clonedVideoMA = cloneDeep(ma[videoMAIdx]);
        clonedVideoMA.id = generateId(`materials.${name}`, i);
        ma.push(clonedVideoMA);
      }
    };

    // handle speeds obj
    handleMaterialCopy(jyConfig, "speeds", veg);

    // handle canvases obj; 虽然只有一项，但还是按照speeds obj一样寻找。
    handleMaterialCopy(jyConfig, "canvases", veg);

    // handle material_animations obj, 暂时看起来移入draft后不需要。
    // handleMaterialCopy(jyConfig, "material_animations", veg);

    // handle sound_channel_mappings obj
    handleMaterialCopy(jyConfig, "sound_channel_mappings", veg);

    // handle videos obj
    handleMaterialCopy(jyConfig, "videos", veg);

    for (let i = 1; i < splitCount; i++) {
      vegs.push(cloneDeep(veg));
    }
    for (let i = 0; i < splitCount; i++) {
      vegs[i].id = generateId("segments", i);
      vegs[i].extra_material_refs = [
        generateId("materials.speeds", i),
        generateId("materials.canvases", i),
        // generateId("materials.material_animations", i),
        generateId("materials.sound_channel_mappings", i),
      ];
      vegs[i].material_id = generateId("materials.videos", i);
      // ranges is like [0, 2000000, 6466666]
      const rangeLeft = ranges[i];
      const rangeRight = ranges[i + 1];
      vegs[i].source_timerange.start = rangeLeft;
      vegs[i].source_timerange.duration = rangeRight - rangeLeft;
      vegs[i].target_timerange.start = vegs[i].source_timerange.start;
      vegs[i].target_timerange.duration = vegs[i].source_timerange.duration;
    }

    // 切割好视频之后，接下来是让音频变速到指定倍数
    const audioTracks = filter(tracks, {
      type: "audio",
      attribute: 0,
    });
    if (audioTracks.length === 0) {
      return {
        status: "error",
        data: "没有任何非静音非锁定的音频轨道，请确保你已经添加了语音片段并关闭草稿",
      };
    }
    let combinedAudioSegs: any = [];
    audioTracks.forEach((track: any) => {
      const segments = track.segments;
      if (!Array.isArray(segments)) {
        return { status: "error", data: "Segments does not exist" };
      }
      combinedAudioSegs = combinedAudioSegs.concat(segments);
    });
    if (combinedAudioSegs.length === 0) {
      return {
        status: "error",
        data: "没有任何非静音非锁定的音频片段，请确保你已经添加了语音片段并关闭草稿",
      };
    }
    if (activationStatus.status === "trial" && combinedAudioSegs.length > 30) {
      return {
        status: "error",
        data: `发现草稿里共有${combinedAudioSegs.length}段音频，超过了试用版不大于30段的限制（正式版无此上限限制）。请你留下不超过30组需要对齐的语音和字幕，将超出数量的删除，关闭剪映草稿后，再回本软件重试。请注意删除后留下的字幕和音频数应该相同，不要一不小心误删到数量不匹配。如果您试用满意的话，恳请点击左侧的"激活软件"激活正式版~正式版可以匹配无限多段。`,
      };
    }
    // combinedAudioSegsOriginal 就是不会被改变target_timerange的一份备份，这样才可以找到按顺序排列的index。
    const combinedAudioSegsOriginal = cloneDeep(combinedAudioSegs);
    for (let i = 0; i < tegs.length; i++) {
      const textSeg = tegs[i];
      const matchAIAudioRes = matchAIAudio(
        textSeg,
        combinedAudioSegs,
        jyConfig
      );
      if (matchAIAudioRes.status === "success") {
        speedSingleAudio(matchAIAudioRes.data, textSeg, jyConfig, param.adsp);
        const videoSeg = findSamePositionSeg(vegs, textSeg);
        if (videoSeg === undefined) {
          return {
            status: "error",
            data: `Weird. After cutting, no video seg matches textSeg,${textSeg.target_timerange.start},${textSeg.target_timerange.duration}`,
          };
        }
        speedSingleVideoToAlignAudio(videoSeg, matchAIAudioRes.data, jyConfig);
        speedSingleTextToAlignAudio(textSeg, matchAIAudioRes.data);
        continue;
      }
      if (tegs.length !== combinedAudioSegs.length) {
        return {
          status: "error",
          data: `请保持字幕片段数和语音片段数相同。目前字幕片段数为${tegs.length}，语音片段数为${combinedAudioSegs.length}，所以无法为你执行操作。提示：如果你删除了一段字幕，你也需要删除一段语音。如果你手动把一段字幕切割成两段，你需要删除其原先对应的长语音，然后在剪映中选择这两段字幕，再次生成（两段）AI语音，通过此操作，字幕数和语音片段数就相等了。如果您是外界导入的从头年到尾的长音频，您需要先在左侧点击 分割长音频，将长音频分割到和字幕段落数一致。`,
        };
      }
      const matchSameIndexAudioRes = matchSameIndexAudio(
        combinedAudioSegsOriginal,
        combinedAudioSegs,
        i
      );
      if (matchSameIndexAudioRes.status === "success") {
        speedSingleAudio(
          matchSameIndexAudioRes.data,
          textSeg,
          jyConfig,
          param.adsp
        );
        const videoSeg = findSamePositionSeg(vegs, textSeg);
        if (videoSeg === undefined) {
          return {
            status: "error",
            data: `Weird. After cutting, no video seg matches textSeg,${textSeg.target_timerange.start},${textSeg.target_timerange.duration}`,
          };
        }
        speedSingleVideoToAlignAudio(
          videoSeg,
          matchSameIndexAudioRes.data,
          jyConfig
        );
        speedSingleTextToAlignAudio(textSeg, matchSameIndexAudioRes.data);
        continue;
      }
      return {
        status: "error",
        data: "有的字幕无法找到匹配语音，请确保其一一对应",
      };
    }
    // 去掉或长或短的间隙
    if (
      param.gapSetting === PRO_GAP_SETTING.ALL_REMOVE ||
      param.gapSetting === PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END
    ) {
      const toDeleteVegs = [];
      const startIdx =
        vegs.length > 2 &&
        param.gapSetting === PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END
          ? 1
          : 0;
      const endIdx =
        vegs.length > 2 &&
        param.gapSetting === PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END
          ? vegs.length - 2
          : vegs.length - 1;
      for (let i = startIdx; i <= endIdx; i++) {
        const curVeg = vegs[i];
        const curTeg = findSamePositionSeg(tegs, curVeg);
        const curAeg = findSamePositionSeg(combinedAudioSegs, curVeg);
        if (curTeg !== undefined && curAeg === undefined) {
          return {
            status: "error",
            data: "出现有的字幕没有匹配语音，请检查原草稿",
          };
        }
        if (curTeg === undefined && curAeg !== undefined) {
          return {
            status: "error",
            data: "出现有的语音没有匹配字幕，请检查原草稿",
          };
        }
        if (curTeg === undefined && curAeg === undefined) {
          toDeleteVegs.push(curVeg);
        }
      }
      const toDeleteMaterialsSpeedsIds = toDeleteVegs.map(
        (v) => v.extra_material_refs[0]
      );
      remove(jyConfig.materials.speeds, (id: any) =>
        toDeleteMaterialsSpeedsIds.includes(id)
      );
      const toDeleteMaterialsCanvasesIds = toDeleteVegs.map(
        (v) => v.extra_material_refs[1]
      );
      remove(jyConfig.materials.canvases, (id: any) =>
        toDeleteMaterialsCanvasesIds.includes(id)
      );
      const toDeleteMaterialsSoundChannelMappingsIds = toDeleteVegs.map(
        (v) => v.extra_material_refs[2]
      );
      remove(jyConfig.materials.sound_channel_mappings, (id: any) =>
        toDeleteMaterialsSoundChannelMappingsIds.includes(id)
      );
      const toDeleteMaterialsVideosIds = toDeleteVegs.map((v) => v.material_id);
      remove(jyConfig.materials.videos, (id: any) =>
        toDeleteMaterialsVideosIds.includes(id)
      );
      const toDeleteVegIds = toDeleteVegs.map((v) => v.id);
      remove(vegs, (v: any) => toDeleteVegIds.includes(v.id));
    }

    // 解说模式(仅保留无配音解说时的原声，带淡入淡出)
    if (param.muteSetting === MUTE_SETTING.TALK_MUTE) {
      for (let i = 0; i < vegs.length; i++) {
        const curVeg = vegs[i];
        const curAeg = findSamePositionSeg(combinedAudioSegs, curVeg);
        const isWithOutterAudio = curAeg !== undefined;
        // 对于有配音的段落，静音；对于没配音但是太短的段落，也静音。
        if (
          isWithOutterAudio ||
          curVeg.target_timerange.duration < MIN_VEG_LENGTH_FOR_FADE
        ) {
          curVeg.volume = 0;
        } else {
          const afId = generateId("materials.audio_fades", i);
          curVeg.extra_material_refs.push(afId);
          const chosenDuration = getFadeDuration(curVeg, jyConfig.fps, param.talkMuteFadeDuration);
          const afObj = {
            fade_in_duration: chosenDuration,
            fade_out_duration: chosenDuration,
            fade_type: 0,
            id: afId,
            type: "audio_fade",
          };
          jyConfig.materials.audio_fades.push(afObj);
          const curMaterialVideoId = curVeg.material_id;
          const materialVideoObj = jyConfig.materials.videos.find(
            (item: any) => item.id === curMaterialVideoId
          );
          if (materialVideoObj === undefined) {
            return {
              status: "error",
              data: "strange. should not happen",
            };
          }
          materialVideoObj.audio_fade = afObj;
        }
      }
    }

    // 开始确保无重叠和无空隙，按顺序找videoSeg，并找到其匹配的audioSeg和textSeg.
    for (let i = 0; i < vegs.length; i++) {
      const curVeg = vegs[i];
      const curTeg = findSamePositionSeg(tegs, curVeg);
      const curAeg = findSamePositionSeg(combinedAudioSegs, curVeg);
      if (curTeg !== undefined && curAeg === undefined) {
        return {
          status: "error",
          data: "出现有的字幕没有匹配语音，请检查原草稿",
        };
      }
      if (curTeg === undefined && curAeg !== undefined) {
        return {
          status: "error",
          data: "出现有的语音没有匹配字幕，请检查原草稿",
        };
      }
      if (i === 0) {
        curVeg.target_timerange.start = 0;
      } else {
        curVeg.target_timerange.start =
          vegs[i - 1].target_timerange.start +
          vegs[i - 1].target_timerange.duration;
      }
      if (curTeg === undefined && curAeg === undefined) {
        continue;
      }

      // 做延长零点几秒，留出气口。不用担心右端不一致，因为上方已经选定了curTeg和curAeg，
      // 只是要注意，至此下面就选不到匹配了，如果以后需要匹配，未来要去写仅左端对齐算法。
      if (
        [
          PRO_GAP_SETTING.ALL_REMOVE,
          PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END,
        ].includes(param.gapSetting) &&
        param.airChangeSetting === AIR_CHANGE_SETTING.YES_AIR_CHANGE
      ) {
        const airChangeDurationEffective = pureTransformDuration(
          param.airChangeDuration
        );
        speedSingleVideoToGetAirChange(
          curVeg,
          airChangeDurationEffective,
          jyConfig
        );
      }

      curTeg.target_timerange.start = curVeg.target_timerange.start;
      curAeg.target_timerange.start = curVeg.target_timerange.start;
    }

    // 校正到合法位置
    for (let i = 0; i < vegs.length; i++) {
      const curVeg = vegs[i];
      adjustDraftTimerange(curVeg.target_timerange, jyConfig.fps);
      const curTeg = findSamePositionSeg(tegs, curVeg);
      if (curTeg !== undefined) {
        adjustDraftTimerange(curTeg.target_timerange, jyConfig.fps);
      }
      const curAeg = findSamePositionSeg(combinedAudioSegs, curVeg);
      if (curAeg !== undefined) {
        adjustDraftTimerange(curAeg.target_timerange, jyConfig.fps);
      }
    }

    flushVideoTotalDuration(jyConfig);
    // 合成复合片段(用户反馈不佳，会卡顿，下面注释掉)
    // populateMaterialsDraft(jyConfig);

    // 音频片段整合为一条
    const targetAudioTrack = audioTracks[0];
    const toDeleteTrackIds: string[] = [];
    for (let i = 1; i < audioTracks.length; i++) {
      const sourceAudioTrack = audioTracks[i];
      const sourceAudioSegs = sourceAudioTrack.segments;
      const toDeleteSegIds: string[] = [];
      for (let j = 0; j < sourceAudioSegs.length; j++) {
        const sourceSeg = sourceAudioSegs[j];
        if (!doesSegOverlapAnyInTrack(sourceSeg, targetAudioTrack)) {
          targetAudioTrack.segments.push(sourceSeg);
          toDeleteSegIds.push(sourceSeg.id);
        }
      }
      remove(sourceAudioSegs, (seg: any) => toDeleteSegIds.includes(seg.id));
      if (sourceAudioSegs.length === 0) {
        toDeleteTrackIds.push(sourceAudioTrack.id);
      }
    }
    remove(tracks, (tr: any) => toDeleteTrackIds.includes(tr.id));
    targetAudioTrack.segments.sort(
      (segA: any, segB: any) =>
        segA.target_timerange.start - segB.target_timerange.start
    );

    // 原视频的声音静音
    if (param.muteSetting === MUTE_SETTING.YES_MUTE) {
      jyConfig.config.video_mute = true;
      videoTracks[0].attribute = 1;
      videoTracks[0].segments.forEach((s: any) => {
        s.track_attribute = 1;
        s.volume = 0;
      });
    } else if (param.muteSetting === MUTE_SETTING.NO_MUTE) {
      jyConfig.config.video_mute = false;
      videoTracks[0].attribute = 0;
    } else if (param.muteSetting === MUTE_SETTING.TALK_MUTE) {
      // 这里的处理没有主要意义，主要是在未复合时处理
      jyConfig.config.video_mute = false;
      videoTracks[0].attribute = 0;
    }

    store.set(STORE_KEY.TRIAL_TIME_LEFT, trialTimeLeft - 1);
    flushVideoTotalDuration(jyConfig);
    const resultStr = JSONbig.stringify(jyConfig);
    fs.writeFileSync(param.infoPath, resultStr, "utf8");
    return {
      status: "success",
      data: JSON.stringify({
        tegCount: tegs.length,
      }),
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const doesSegsOverlap = (segA: any, segB: any) => {
  const aStart = segA.target_timerange.start;
  const aEnd = segA.target_timerange.start + segA.target_timerange.duration;
  const bStart = segB.target_timerange.start;
  const bEnd = segB.target_timerange.start + segB.target_timerange.duration;
  if (aEnd <= bStart || bEnd <= aStart) {
    return false;
  } else {
    return true;
  }
};

const doesSegOverlapAnyInTrack = (seg: any, track: any) => {
  const segments = track.segments;
  for (let i = 0; i < segments.length; i++) {
    const targetSeg = segments[i];
    if (seg.id !== targetSeg.id && doesSegsOverlap(seg, targetSeg)) {
      return true;
    }
  }
  return false;
};

const packNumToConstDigits = (i: number, length: number) => {
  const iStr = i.toString();
  const iStrLength = iStr.length;
  const moreNeededLength = length - iStrLength;
  let result = "";
  for (let j = 0; j < moreNeededLength; j++) {
    result = result + "0";
  }
  result = result + iStr;
  return result;
};

const generateId = (
  property: string,
  idx: number,
  isInCombination?: boolean
) => {
  const prefix = COM_PREFIX;
  let mid = "";
  if (property === "materials.canvases") {
    mid = `${isInCombination ? "C" : "0"}001-`;
  }
  if (property === "materials.sound_channel_mappings") {
    mid = `${isInCombination ? "C" : "0"}002-`;
  }
  if (property === "materials.speeds") {
    mid = `${isInCombination ? "C" : "0"}003-`;
  }
  // if (property === "materials.material_animations") {
  //   mid = `${isInCombination ? 'C' : '0'}004-`;
  // }
  if (property === "materials.audio_fades") {
    mid = `${isInCombination ? "C" : "0"}005`;
  }
  if (property === "materials.videos") {
    mid = `${isInCombination ? "C" : "0"}00A-`;
  }
  if (property === "materials.drafts.combination_id") {
    mid = `${isInCombination ? "C" : "0"}00C-`;
  }
  if (property === "materials.drafts.draft.id") {
    mid = `${isInCombination ? "C" : "0"}0DD-`;
  }
  if (property === "materials.drafts") {
    mid = `${isInCombination ? "C" : "0"}00D-`;
  }
  if (property === "segments") {
    mid = `${isInCombination ? "C" : "0"}0B0-`;
  }
  const suffix = packNumToConstDigits(idx, 12);
  if (mid === "") {
    throw new Error();
  }
  return `${prefix}${mid}${suffix}`;
};

const populateMaterialsDraft = (jyConfig: any) => {
  const drafts = jyConfig.materials.drafts;
  const precombinedVideoTrackLen = getVideoTrackDuration(jyConfig);
  const draft = {
    category_id: "",
    category_name: "",
    combination_id: generateId("materials.drafts.combination_id", 0, true),
    draft: {
      canvas_config: {
        height: jyConfig.canvas_config.height,
        ratio: jyConfig.canvas_config.ratio,
        width: jyConfig.canvas_config.width,
      },
      color_space: -1,
      config: {
        adjust_max_index: 1,
        attachment_info: [],
        combination_max_index: 1, // 外层会改成2
        export_range: null,
        extract_audio_last_index: 1,
        lyrics_recognition_id: "",
        lyrics_sync: true,
        lyrics_taskinfo: [],
        maintrack_adsorb: false,
        material_save_mode: 0,
        original_sound_last_index: 1,
        record_audio_last_index: 1,
        sticker_max_index: 1,
        subtitle_recognition_id: "",
        subtitle_sync: true,
        subtitle_taskinfo: [],
        system_font_list: [],
        video_mute: false,
        zoom_info_params: null,
      },
      cover: null,
      create_time: 0,
      duration: precombinedVideoTrackLen,
      extra_info: null,
      fps: 30.0,
      free_render_index_mode_on: false,
      group_container: null,
      id: generateId("materials.drafts.draft.id", 0, true),
      keyframe_graph_list: [],
      keyframes: {
        adjusts: [],
        audios: [],
        effects: [],
        filters: [],
        handwrites: [],
        stickers: [],
        texts: [],
        videos: [],
      },
      last_modified_platform: {
        app_id: 0,
        app_source: "",
        app_version: "",
        device_id: "",
        hard_disk_id: "",
        mac_address: "",
        os: "",
        os_version: "",
      },
      materials: {
        audio_balances: [],
        audio_effects: [],
        audio_fades: jyConfig.materials.audio_fades.filter((element: any) =>
          element.id.startsWith(`${COM_PREFIX}0`)
        ),
        audios: [],
        beats: [],
        canvases: jyConfig.materials.canvases,
        chromas: [],
        color_curves: [],
        digital_humans: [],
        drafts: [],
        effects: [],
        flowers: [],
        green_screens: [],
        handwrites: [],
        hsl: [],
        images: [],
        log_color_wheels: [],
        manual_deformations: [],
        masks: [],
        material_animations: [],
        material_colors: [],
        placeholders: [],
        plugin_effects: [],
        primary_color_wheels: [],
        realtime_denoises: [],
        shapes: [],
        smart_crops: [],
        sound_channel_mappings:
          jyConfig.materials.sound_channel_mappings.filter((element: any) =>
            element.id.startsWith(`${COM_PREFIX}0`)
          ),
        speeds: jyConfig.materials.speeds.filter((element: any) =>
          element.id.startsWith(`${COM_PREFIX}0`)
        ),
        stickers: [],
        tail_leaders: [],
        text_templates: [],
        texts: [],
        transitions: [],
        video_effects: [],
        video_trackings: [],
        videos: jyConfig.materials.videos,
      },
      mutable_config: null,
      name: "",
      new_version: jyConfig.new_version,
      platform: {
        app_id: 0,
        app_source: "",
        app_version: "",
        device_id: "",
        hard_disk_id: "",
        mac_address: "",
        os: "",
        os_version: "",
      },
      relationships: [],
      render_index_track_mode_on: false,
      retouch_cover: null,
      source: "default",
      static_cover_image_path: "",
      tracks: jyConfig.tracks.filter((track: any) => track.type === "video"),
      update_time: 0,
      version: jyConfig.version,
    },
    formula_id: "",
    id: generateId("materials.drafts", 0, true), // videoSeg[0].extra_material_refs的第一项
    name: "",
    precompile_combination: false,
    type: "combination",
  };
  drafts.push(cloneDeep(draft)); // clone是重要的，因为jyConfig.materials.canvases等内容在接下来被修改。
  jyConfig.config.combination_max_index = 2;
  // sound_channel_mappings 里，video segments的都移入drafts，audio segments仍在外。
  jyConfig.materials.sound_channel_mappings = [
    {
      audio_channel_mapping: 0,
      id: generateId("materials.sound_channel_mappings", 100000000000, false), // videoSeg[0].extra_material_refs的第四项
      is_config_open: false,
      type: "", // it is empty string, no longer "none"
    },
  ].concat(
    jyConfig.materials.sound_channel_mappings.filter(
      (element: any) => !element.id.startsWith(`${COM_PREFIX}0`)
    )
  );
  // speeds 里，video segments的都移入drafts，audio segments仍在外。
  jyConfig.materials.speeds = [
    {
      curve_speed: null,
      id: generateId("materials.speeds", 100000000000, false), // videoSeg[0].extra_material_refs的第二项
      mode: 0,
      speed: 1.0,
      type: "speed",
    },
  ].concat(
    jyConfig.materials.speeds.filter(
      (element: any) => !element.id.startsWith(`${COM_PREFIX}0`)
    )
  );
  // 因为combination, canvases只剩下一项
  jyConfig.materials.canvases = [
    {
      album_image: "",
      blur: 0.0,
      color: "",
      id: generateId("materials.canvases", 100000000000, false), // videoSeg[0].extra_material_refs的第三项
      image: "",
      image_id: "",
      image_name: "",
      source_platform: 0,
      team_id: "",
      type: "canvas_color",
    },
  ];
  jyConfig.materials.audio_fades = jyConfig.materials.audio_fades.filter(
    (element: any) => !element.id.startsWith(`${COM_PREFIX}0`)
  );
  jyConfig.materials.videos = [cloneDeep(jyConfig.materials.videos[0])];
  jyConfig.materials.videos[0].category_name = "";
  jyConfig.materials.videos[0].duration = precombinedVideoTrackLen;
  jyConfig.materials.videos[0].id = generateId(
    "materials.videos",
    100000000000,
    false
  );
  jyConfig.materials.videos[0].local_material_id = "";
  jyConfig.materials.videos[0].path = "";
  const videoTrack = jyConfig.tracks.find(
    (track: any) => track.type === "video"
  );
  videoTrack.segments = [cloneDeep(videoTrack.segments[0])];
  videoTrack.segments[0].extra_material_refs = [
    generateId("materials.drafts", 0, true),
    generateId("materials.speeds", 100000000000, false),
    generateId("materials.canvases", 100000000000, false),
    generateId("materials.sound_channel_mappings", 100000000000, false),
  ];
  videoTrack.segments[0].id = generateId("segments", 100000000000, false);
  videoTrack.segments[0].material_id = generateId(
    "materials.videos",
    100000000000,
    false
  );
  videoTrack.segments[0].source_timerange = {
    duration: precombinedVideoTrackLen,
    start: 0,
  };
  videoTrack.segments[0].target_timerange = {
    duration: precombinedVideoTrackLen,
    start: 0,
  };
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

export const getVideoTrackDuration = (jyConfig: any) => {
  const tracks = jyConfig.tracks;
  const videoTracks = filter(tracks, {
    type: "video",
  });
  let largestDuration = 0;
  videoTracks.forEach((track: any) => {
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      return;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    if (lastEnd > largestDuration) {
      largestDuration = lastEnd;
    }
  });
  return largestDuration;
};

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

const speedSingleAudio = (
  audioSeg: any,
  textSeg: any,
  jyConfig: any,
  adsp: any
) => {
  audioSeg.target_timerange.start = textSeg.target_timerange.start;
  audioSeg.target_timerange.duration = Math.round(
    audioSeg.source_timerange.duration / adsp
  );
  setSpeedPart(audioSeg, jyConfig, adsp);
  audioSeg.speed = adsp;
};

const findSamePositionSeg = (vegs: any, referenceSeg: any) => {
  return vegs.find(
    (veg: any) =>
      veg.target_timerange.start === referenceSeg.target_timerange.start &&
      veg.target_timerange.duration === referenceSeg.target_timerange.duration
  );
};

const speedSingleVideoToAlignAudio = (
  videoSeg: any,
  audioSeg: any,
  jyConfig: any
) => {
  // already matched start, match again is useless, just in case
  videoSeg.target_timerange.start = audioSeg.target_timerange.start;
  videoSeg.target_timerange.duration = audioSeg.target_timerange.duration;
  const vdsp =
    videoSeg.source_timerange.duration / videoSeg.target_timerange.duration;
  setSpeedPart(videoSeg, jyConfig, vdsp);
  videoSeg.speed = vdsp;
};

const speedSingleTextToAlignAudio = (textSeg: any, audioSeg: any) => {
  textSeg.target_timerange.start = audioSeg.target_timerange.start;
  textSeg.target_timerange.duration = audioSeg.target_timerange.duration;
};

const speedSingleVideoToGetAirChange = (
  videoSeg: any,
  duration: any,
  jyConfig: any
) => {
  videoSeg.target_timerange.duration += duration;
  const vdsp =
    videoSeg.source_timerange.duration / videoSeg.target_timerange.duration;
  setSpeedPart(videoSeg, jyConfig, vdsp);
  videoSeg.speed = vdsp;
};

const matchAIAudio = (textSeg: any, audioSegs: any, jyConfig: any) => {
  const allTextMaterials = jyConfig.materials.texts;
  const textMaterial = allTextMaterials.find(
    (item: any) => item.id === textSeg.material_id
  );
  if (textMaterial === undefined) {
    return { status: "error" };
  }
  if (
    !Array.isArray(textMaterial.text_to_audio_ids) ||
    textMaterial.text_to_audio_ids.length === 0
  ) {
    return { status: "error" };
  }
  const audioId = textMaterial.text_to_audio_ids[0];
  const audioSeg = audioSegs.find((item: any) => {
    return item.id === audioId;
  });
  if (audioSeg === undefined) {
    return { status: "error" };
  }
  return { status: "success", data: audioSeg };
};

const matchSameIndexAudio = (
  audioSegsOriginal: any,
  audioSegs: any,
  textSegIndex: number
) => {
  audioSegsOriginal.sort(
    (a: any, b: any) => a.target_timerange.start - b.target_timerange.start
  );
  const audioSegOriginal = audioSegsOriginal[textSegIndex];
  const audioSeg = audioSegs.find((seg: any) => seg.id === audioSegOriginal.id);
  return { status: "success", data: audioSeg };
};

const pureTransformDuration = (readableDuration: number) => {
  return Math.round(readableDuration * 1000000);
};

// 校正到合法位置
const adjustDrafttime = (originalDt: number, fps: number) => {
  const dtSecond = Math.floor(originalDt / 1000000);
  const dtFraction = originalDt - dtSecond * 1000000;
  const minScale = 1000000 / fps; // minScale是最小刻度
  const scaleCount = Math.round(dtFraction / minScale);
  const dtFractionInScale = minScale * scaleCount;
  const dtFractionInScaleInt = Math.floor(dtFractionInScale + 0.00001);
  const dt = dtSecond * 1000000 + dtFractionInScaleInt;
  return dt;
};

// 校正到合法位置
const adjustDraftTimerange = (
  timerange: { start: number; duration: number },
  fps: number
) => {
  const end = adjustDrafttime(timerange.start + timerange.duration, fps);
  timerange.start = adjustDrafttime(timerange.start, fps);
  timerange.duration = end - timerange.start;
};

const getFadeDuration = (veg: any, fps: number, talkMuteFadeDuration: number) => {
  const start = adjustDrafttime(veg.target_timerange.start, fps);
  const end = adjustDrafttime(
    veg.target_timerange.start + veg.target_timerange.duration,
    fps
  );
  const talkMuteFadeDurationInDraft = pureTransformDuration(talkMuteFadeDuration);
  const duration = end - start;
  if (duration < talkMuteFadeDurationInDraft) {
    return duration;
  } else {
    return talkMuteFadeDurationInDraft;
  }
};
