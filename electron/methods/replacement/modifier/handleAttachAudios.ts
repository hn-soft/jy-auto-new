import * as fs from "fs";
import * as path from "path";
import { handleCheckAudioResources } from "./checkAudioResources";
import { MODIFIER_PREFIX } from "../../../utils/const";
import {
  isLocked,
  MODIFIER_SOLUTION,
  packNumToConstDigits,
  getMaxRenderIndex,
} from "../../../utils/replaceUtils";
import { voteRandomInt } from "../../../utils/randomUtils";
import { getVideoDimensions } from "../../../utils/ffmpegUtils";
import {ModifierType} from "../../../utils/types";

const srtParser = require("subtitles-parser");

export const handleAttachAudios = async (
  projI: number,
  targetJyConfig: any,
  targetPInfoPath: string,
  modifier: ModifierType
) => {
  try {
    const { audioConfig } = modifier;
    const audioConfigItems = audioConfig.configs
      .slice(0, audioConfig.count)
      .filter((aci) => aci.audioFolder.length > 0);
    let needCutVideoTask = false;
    let needCutToLen = Number.MAX_SAFE_INTEGER;
    for (let j = 0; j < audioConfigItems.length; j++) {
      const aci = audioConfigItems[j];
      const audioRes = await handleCheckAudioResources(null, {
        parentFolderDir: aci.audioFolder,
      });
      if (audioRes.status === "error") {
        return audioRes;
      }
      // @ts-ignore
      const audioCount = audioRes.data.count;
      // @ts-ignore
      const audioNames = audioRes.data.names;
      const audioName =
        aci.randomMode === MODIFIER_SOLUTION.RANDOM_MODE.PURE_RANDOM
          ? audioNames[voteRandomInt(audioCount)]
          : audioNames[projI % audioCount];
      const sourceAudioPath = path.resolve(aci.audioFolder, audioName);
      const targetAudioDir = path.resolve(
        targetPInfoPath,
        "..",
        "modifierAudioResources",
        `${j + 1}`
      );
      if (fs.existsSync(targetAudioDir)) {
        fs.rmSync(targetAudioDir, { recursive: true, force: true });
      }
      fs.mkdirSync(targetAudioDir, { recursive: true });
      const targetAudioPath = path.resolve(targetAudioDir, audioName);
      fs.cpSync(sourceAudioPath, targetAudioPath);
      const dim = await getVideoDimensions(targetAudioPath);
      const materialDuration = adjustDrafttime(
        dim.durationInUS,
        targetJyConfig.fps
      );
      const videoLen = getVideoTrackMaxLen(targetJyConfig);
      // 初始化，数字没有实际意义。
      const sourceTimerange = { duration: materialDuration, start: 0 };
      const targetTimerange = { duration: materialDuration, start: 0 };
      let computedSpeed = 1;
      const volumeToSet = aci.audioVolume / 100;
      if (materialDuration >= videoLen) {
        // audio material is longer than video track
        if (aci.audioLonger === MODIFIER_SOLUTION.AUDIO_LONGER.SPEED) {
          sourceTimerange.start = 0;
          sourceTimerange.duration = materialDuration;
          targetTimerange.start = 0;
          targetTimerange.duration = videoLen;
          computedSpeed = materialDuration / videoLen;
        } else {
          // MODIFIER_SOLUTION.AUDIO_LONGER.CUT or empty input treated as cut
          sourceTimerange.start = 0;
          sourceTimerange.duration = videoLen;
          targetTimerange.start = 0;
          targetTimerange.duration = videoLen;
          computedSpeed = 1;
        }
      } else {
        // audio material is shorter than video track
        if (aci.audioShorter === MODIFIER_SOLUTION.AUDIO_SHORTER.SPEED) {
          sourceTimerange.start = 0;
          sourceTimerange.duration = materialDuration;
          targetTimerange.start = 0;
          targetTimerange.duration = videoLen;
          computedSpeed = materialDuration / videoLen;
        } else {
          // MODIFIER_SOLUTION.AUDIO_SHORTER.CUT_VIDEO or MODIFIER_SOLUTION.AUDIO_SHORTER.REMAIN
          // or empty input. CUT_VIDEO will also trigger cutting during automation.
          sourceTimerange.start = 0;
          sourceTimerange.duration = materialDuration;
          targetTimerange.start = 0;
          targetTimerange.duration = materialDuration;
          computedSpeed = 1;
        }
        if (aci.audioShorter === MODIFIER_SOLUTION.AUDIO_SHORTER.CUT_VIDEO) {
          needCutVideoTask = true;
          needCutToLen = materialDuration;
        }
      }
      const idSuffix = `${packNumToConstDigits(j + 1, 12)}`;
      const materialId = `${MODIFIER_PREFIX.AUDIO.MATERIAL}${idSuffix}`;
      const trackId = `${MODIFIER_PREFIX.AUDIO.TRACK}${idSuffix}`;
      const segmentId = `${MODIFIER_PREFIX.AUDIO.SEGMENT}${idSuffix}`;
      const speedId = `${MODIFIER_PREFIX.AUDIO.SPEED}${idSuffix}`;
      const beatId = `${MODIFIER_PREFIX.AUDIO.BEAT}${idSuffix}`;
      const soundChannelMappingId = `${MODIFIER_PREFIX.AUDIO.SOUND_CHANNEL_MAPPING}${idSuffix}`;
      const loudnessId = `${MODIFIER_PREFIX.AUDIO.LOUDNESS}${idSuffix}`;
      const vocalSeparationId = `${MODIFIER_PREFIX.AUDIO.VOCAL_SEPARATION}${idSuffix}`;
      targetJyConfig.materials.audios.push({
        app_id: 0,
        category_id: "",
        category_name: "",
        check_flag: 1,
        duration: materialDuration,
        effect_id: "",
        formula_id: "",
        id: materialId,
        intensifies_path: "",
        is_ai_clone_tone: false,
        is_text_edit_overdub: false,
        is_ugc: false,
        local_material_id: "",
        music_id: "",
        name: audioName,
        path: targetAudioPath,
        query: "",
        request_id: "",
        resource_id: "",
        search_id: "",
        source_from: "",
        source_platform: 0,
        team_id: "",
        text_id: "",
        tone_category_id: "",
        tone_category_name: "",
        tone_effect_id: "",
        tone_effect_name: "",
        tone_platform: "",
        tone_second_category_id: "",
        tone_second_category_name: "",
        tone_speaker: "",
        tone_type: "",
        type: "extract_music",
        video_id: "",
        wave_points: [],
      });
      targetJyConfig.materials.speeds.push({
        curve_speed: null,
        id: speedId,
        mode: 0,
        speed: computedSpeed,
        type: "speed",
      });
      targetJyConfig.materials.beats.push({
        ai_beats: {
          beat_speed_infos: [],
          beats_path: "",
          beats_url: "",
          melody_path: "",
          melody_percents: [0.0],
          melody_url: "",
        },
        enable_ai_beats: false,
        gear: 404,
        gear_count: 0,
        id: beatId,
        mode: 404,
        type: "beats",
        user_beats: [],
        user_delete_ai_beats: null,
      });
      targetJyConfig.materials.sound_channel_mappings.push({
        audio_channel_mapping: 0,
        id: soundChannelMappingId,
        is_config_open: false,
        type: "none",
      });
      targetJyConfig.materials.loudnesses?.push({
        enable: false,
        file_id: "",
        id: loudnessId,
        loudness_param: null,
        target_loudness: 0.0,
        time_range: null,
      });
      targetJyConfig.materials.vocal_separations.push({
        choice: 0,
        id: vocalSeparationId,
        production_path: "",
        time_range: null,
        type: "vocal_separation",
      });

      targetJyConfig.tracks.push({
        attribute: 0,
        flag: 0,
        id: trackId,
        is_default_name: true,
        name: "",
        segments: [
          {
            caption_info: null,
            cartoon: false,
            clip: null,
            common_keyframes: [],
            enable_adjust: false,
            enable_color_curves: true,
            enable_color_match_adjust: false,
            enable_color_wheels: true,
            enable_lut: false,
            enable_smart_color_adjust: false,
            extra_material_refs: [
              speedId,
              beatId,
              soundChannelMappingId,
              loudnessId,
              vocalSeparationId,
            ],
            group_id: "",
            hdr_settings: null,
            id: segmentId,
            intensifies_audio: false,
            is_placeholder: false,
            is_tone_modify: false,
            keyframe_refs: [],
            last_nonzero_volume: 1.0,
            material_id: materialId,
            render_index: 0,
            responsive_layout: {
              enable: false,
              horizontal_pos_layout: 0,
              size_layout: 0,
              target_follow: "",
              vertical_pos_layout: 0,
            },
            reverse: false,
            source_timerange: sourceTimerange,
            speed: computedSpeed,
            target_timerange: targetTimerange,
            template_id: "",
            template_scene: "default",
            track_attribute: 0,
            track_render_index: 0,
            uniform_scale: null,
            visible: true,
            volume: volumeToSet,
          },
        ],
        type: "audio",
      });
      // srt
      if (aci.needAttachSRT) {
        const prefix = audioName.replace(/\.[^/.]+$/, "");
        const SRTFile = path.join(aci.audioFolder, `${prefix}.SRT`);
        const srtFile = path.join(aci.audioFolder, `${prefix}.srt`);
        const targetFile = fs.existsSync(srtFile)
          ? srtFile
          : fs.existsSync(SRTFile)
          ? SRTFile
          : null;
        if (targetFile === null) {
          continue;
        }
        const srtContent = fs.readFileSync(targetFile, { encoding: "utf8" });
        const srtData = srtParser.fromSrt(srtContent, true);
        const srtDataOp = operateSRT(
          srtData,
          aci,
          materialDuration,
          videoLen,
          targetJyConfig
        );
        // 0 开头给 track id， 后续 index + 1 就给 segment
        const newTextTrack: any = {
          attribute: 0,
          flag: 1,
          id: `${MODIFIER_PREFIX.CAPTION.TRACK}${packNumToConstDigits(0, 12)}`,
          is_default_name: true,
          name: "",
          segments: [],
          type: "text",
        };
        const maxRenderIndex = getMaxRenderIndex(targetJyConfig);
        srtDataOp.forEach((line, index) => {
          const textIdSuffix = `${packNumToConstDigits(index + 1, 12)}`;
          const materialTextToAdd = {
            add_type: 2,
            alignment: 1,
            background_alpha: 1.0,
            background_color: "",
            background_height: 0.14,
            background_horizontal_offset: 0.0,
            background_round_radius: 0.0,
            background_style: 0,
            background_vertical_offset: 0.0,
            background_width: 0.14,
            bold_width: 0.0,
            border_alpha: 1.0,
            border_color: "",
            border_width: 0.08,
            caption_template_info: {
              category_id: "",
              category_name: "",
              effect_id: "",
              is_new: false,
              path: "",
              request_id: "",
              resource_id: "",
              resource_name: "",
              source_platform: 0,
            },
            check_flag: 7,
            combo_info: { text_templates: [] },
            content: "",
            fixed_height: -1.0,
            fixed_width: -1.0,
            font_category_id: "",
            font_category_name: "",
            font_id: "",
            font_name: "",
            font_path: "",
            font_resource_id: "",
            font_size: 5.0,
            font_source_platform: 0,
            font_team_id: "",
            font_title: "none",
            font_url: "",
            fonts: [],
            force_apply_line_max_width: false,
            global_alpha: 1.0,
            group_id: "",
            has_shadow: false,
            id: `${MODIFIER_PREFIX.CAPTION.MATERIAL_TEXT}${textIdSuffix}`,
            initial_scale: 1.0,
            inner_padding: -1.0,
            is_rich_text: false,
            italic_degree: 0,
            ktv_color: "",
            language: "",
            layer_weight: 1,
            letter_spacing: 0.0,
            line_feed: 1,
            line_max_width: 0.82,
            line_spacing: 0.02,
            multi_language_current: "none",
            name: "",
            original_size: [],
            preset_category: "",
            preset_category_id: "",
            preset_has_set_alignment: false,
            preset_id: "",
            preset_index: 0,
            preset_name: "",
            recognize_task_id: "",
            recognize_type: 0,
            relevance_segment: [],
            shadow_alpha: 0.8,
            shadow_angle: -45.0,
            shadow_color: "",
            shadow_distance: 8.0,
            shadow_point: { x: 1.0182337649086284, y: -1.0182337649086284 },
            shadow_smoothing: 1.0,
            shape_clip_x: false,
            shape_clip_y: false,
            source_from: "",
            style_name: "",
            sub_type: 0,
            subtitle_keywords: null,
            subtitle_template_original_fontsize: 0.0,
            text_alpha: 1.0,
            text_color: "#FFFFFF",
            text_curve: null,
            text_preset_resource_id: "",
            text_size: 30,
            text_to_audio_ids: [],
            tts_auto_update: false,
            type: "subtitle",
            typesetting: 0,
            underline: false,
            underline_offset: 0.22,
            underline_width: 0.05,
            use_effect_default_color: true,
            words: { end_time: [], start_time: [], text: [] },
          };
          targetJyConfig.materials.texts.push(materialTextToAdd);
          // boring empty materials sticker_animation
          targetJyConfig.materials.texts.push({
            animations: [],
            id: `${MODIFIER_PREFIX.CAPTION.MATERIAL_ANIMATION}${textIdSuffix}`,
            multi_language_current: "none",
            type: "sticker_animation",
          });
          // track
          const segToAdd = {
            caption_info: null,
            cartoon: false,
            clip: {
              alpha: 1.0,
              flip: { horizontal: false, vertical: false },
              rotation: 0.0,
              scale: { x: 1.0, y: 1.0 },
              transform: { x: 0.0, y: -0.8 },
            },
            common_keyframes: [],
            enable_adjust: false,
            enable_color_curves: true,
            enable_color_match_adjust: false,
            enable_color_wheels: true,
            enable_lut: false,
            enable_smart_color_adjust: false,
            extra_material_refs: [`${MODIFIER_PREFIX.CAPTION.MATERIAL_ANIMATION}${textIdSuffix}`],
            group_id: "",
            hdr_settings: null,
            id: `${MODIFIER_PREFIX.CAPTION.TRACK}${textIdSuffix}`,
            intensifies_audio: false,
            is_placeholder: false,
            is_tone_modify: false,
            keyframe_refs: [],
            last_nonzero_volume: 1.0,
            material_id: `${MODIFIER_PREFIX.CAPTION.MATERIAL_TEXT}${textIdSuffix}`,
            render_index: maxRenderIndex + index + 1,
            responsive_layout: {
              enable: false,
              horizontal_pos_layout: 0,
              size_layout: 0,
              target_follow: "",
              vertical_pos_layout: 0,
            },
            reverse: false,
            source_timerange: null,
            speed: 1.0,
            target_timerange: { duration: line.endTime - line.startTime, start: line.startTime },
            template_id: "",
            template_scene: "default",
            track_attribute: 0,
            track_render_index: 0,
            uniform_scale: { on: true, value: 1.0 },
            visible: true,
            volume: 1.0,
          };
          newTextTrack.segments.push(segToAdd);
          const configSRT = JSON.parse(aci.configSRT);
          switch (configSRT.preset) {
            case "Preset Large White Landscape":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        solid: { color: [1, 1, 1] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 8,
                    strokes: [{
                      content: {
                        solid: {
                          color: [0, 0, 0]
                        }
                      },
                      width: 0.08,
                    }],
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#000000";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 15;
              materialTextToAdd.font_size = 8;
              materialTextToAdd.text_color = "#ffffff";
              break;
            case "Preset Large White Portrait":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        solid: { color: [1, 1, 1] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 11,
                    strokes: [{
                      content: {
                        solid: {
                          color: [0, 0, 0]
                        }
                      },
                      width: 0.08,
                    }],
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#000000";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 15;
              materialTextToAdd.font_size = 11;
              materialTextToAdd.text_color = "#ffffff";
              break;
            case "Preset Pink Back Landscape":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        render_type: "solid",
                        solid: { alpha: 1, color: [1, 1, 1] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 7,
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#a74f59";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 63;
              materialTextToAdd.font_size = 7;
              materialTextToAdd.text_color = "#ffffff";
              break;
            case "Preset Pink Back Portrait":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        render_type: "solid",
                        solid: { alpha: 1, color: [1, 1, 1] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 10,
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#a74f59";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 63;
              materialTextToAdd.font_size = 10;
              materialTextToAdd.text_color = "#ffffff";
              break;
            case "Preset Small Yellow Landscape":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        solid: { color: [1, 0.870588, 0] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 6,
                    strokes: [{
                      content: {
                        solid: {
                          color: [0, 0, 0]
                        }
                      },
                      width: 0.08,
                    }],
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#000000";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 47;
              materialTextToAdd.font_size = 6;
              materialTextToAdd.text_color = "#ffde00";
              break;
            case "Preset Small Yellow Portrait":
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      content: {
                        solid: { color: [1, 0.870588, 0] },
                      },
                    },
                    range: [0, line.text.length],
                    size: 9,
                    strokes: [{
                      content: {
                        solid: {
                          color: [0, 0, 0]
                        }
                      },
                      width: 0.08,
                    }],
                    useLetterColor: true,
                  },
                ],
                text: line.text,
              });
              materialTextToAdd.background_color = "#000000";
              materialTextToAdd.border_color = "#000000";
              materialTextToAdd.check_flag = 47;
              materialTextToAdd.font_size = 9;
              materialTextToAdd.text_color = "#ffde00";
              break;
            default:
              materialTextToAdd.content = JSON.stringify({
                styles: [
                  {
                    fill: {
                      alpha: 1,
                      content: {
                        render_type: "solid",
                        solid: { alpha: 1, color: [1, 1, 1] },
                      },
                    },
                    font: { id: "", path: "" },
                    range: [0, line.text.length],
                    size: 5,
                  },
                ],
                text: line.text,
              });
          }
          if (configSRT.preset.endsWith("Landscape")) {
            segToAdd.clip.transform = { x: 0, y: -0.76 };
          } else if (configSRT.preset.endsWith("Portrait")) {
            segToAdd.clip.transform = { x: 0, y: -0.46 };
          }
        });
        targetJyConfig.tracks.push(newTextTrack);
      }
    }

    if (needCutVideoTask) {
      cutAllTracksToLen(targetJyConfig, needCutToLen);
    }
    return {
      status: "success",
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const operateSRT = (
  srtData: { id: string; startTime: number; endTime: number; text: string }[],
  aci: {
    audioFolder: string;
    audioLonger: string;
    audioShorter: string;
    audioVolume: number;
    randomMode: string;
    needAttachSRT: boolean;
    configSRT: string;
  },
  materialDuration: number,
  videoLen: number,
  targetJyConfig: any
) => {
  let ratio = 1;
  let cutPoint = Number.MAX_SAFE_INTEGER;
  if (materialDuration >= videoLen) {
    if (aci.audioLonger === MODIFIER_SOLUTION.AUDIO_LONGER.SPEED) {
      ratio = videoLen / materialDuration;
    } else {
      cutPoint = videoLen;
    }
  } else {
    if (aci.audioShorter === MODIFIER_SOLUTION.AUDIO_SHORTER.SPEED) {
      ratio = videoLen / materialDuration;
    }
  }
  const resData = srtData
    .map((item) => {
      let startTime = adjustDrafttime(
        item.startTime * 1000 * ratio,
        targetJyConfig.fps
      );
      let endTime = adjustDrafttime(
        item.endTime * 1000 * ratio,
        targetJyConfig.fps
      );
      if (startTime >= cutPoint) {
        startTime = 0;
        endTime = 0;
      }
      if (startTime < cutPoint && endTime > cutPoint) {
        endTime = cutPoint;
      }
      return {
        id: item.id,
        startTime,
        endTime,
        text: item.text.replace("\r\n", "\n"),
      };
    })
    .filter((item) => !(item.startTime === 0 && item.endTime === 0));
  return resData;
};

const getVideoTrackMaxLen = (jyConfig: any) => {
  const tracks = jyConfig.tracks;
  let maxLen = 0;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (track.type !== "video" || isLocked(track)) {
      continue;
    }
    const segments = track.segments;
    const len = segments.length;
    if (len === 0) {
      continue;
    }
    const lastSeg = segments[len - 1];
    const lastEnd =
      lastSeg.target_timerange.start + lastSeg.target_timerange.duration;
    maxLen = Math.max(maxLen, lastEnd);
  }
  return maxLen;
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

const cutAllTracksToLen = (jyConfig: any, len: number) => {
  const tracks = jyConfig.tracks;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const segments = track.segments;
    const toDeleteSegIds: string[] = [];
    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      // delete case
      if (seg.target_timerange.start > len) {
        toDeleteSegIds.push(seg.id);
      }
      // reduce length case
      if (
        seg.target_timerange.start < len &&
        seg.target_timerange.start + seg.target_timerange.duration > len
      ) {
        const newTargetDuration = len - seg.target_timerange.start;
        // 分为有无 source_timerange 的两种情况
        if (seg.source_timerange) {
          const oldTargetDuration = seg.target_timerange.duration;
          const oldSourceDuration = seg.source_timerange.duration;
          const newSourceDuration =
            (oldSourceDuration * newTargetDuration) / oldTargetDuration;
          seg.target_timerange.duration = newTargetDuration;
          seg.source_timerange.duration = newSourceDuration;
        } else {
          seg.target_timerange.duration = newTargetDuration;
        }
      }
    }
    track.segments = segments.filter((seg: any) => {
      return !toDeleteSegIds.includes(seg.id);
    });
  }
};