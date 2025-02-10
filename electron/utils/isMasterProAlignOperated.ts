import { MASTER_PRO_COM_PREFIX as COM_PREFIX } from "../utils/const";
import { filter } from "lodash";

const JSONbig = require("json-bigint");

export const isMasterProAlignOperated = (jsonString: string) => {
    try {
        const jyConfigOriginal = JSONbig.parse(jsonString);
        const tracks = jyConfigOriginal.tracks;
        if (!Array.isArray(tracks)) {
          return { status: "error", data: "Tracks is not an array." };
        }
        const videoTracks = filter(tracks, {
          type: "video",
        });
        for (let i = 0; i < videoTracks.length; i++) {
            const videoTrack = videoTracks[i];
            const vegs = videoTrack.segments;
            for (let j = 0; j < vegs.length; j++) {
                const veg = vegs[j];
                if (veg.id.startsWith(COM_PREFIX)) {
                    return { status: "success", data: true }
                }
            }
        }
        return { status: "success", data: false }
    } catch {
      return {
        status: "error",
        data: `检查是否为对齐大师Pro操作过的草稿时出错`,
      }
    }
  };