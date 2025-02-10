import { filter } from "lodash";
import { extractTegPureContent } from "../../../utils/textUtils";
import { MODIFIER_SOLUTION } from "../../../utils/replaceUtils";
import { voteRandomInt } from "../../../utils/randomUtils";
import { getIsCapCut } from "../../../utils/nationVal";

const JSONbig = require("json-bigint");
const semver = require("semver");
import {ModifierType} from "../../../utils/types";

export const handleChangeTexts = async (
  projI: number,
  targetJyConfig: any,
  modifier: ModifierType
) => {
  try {
    const { textConfig } = modifier;
    const tracks = targetJyConfig.tracks;
    const textTracks = filter(tracks, {
      type: "text",
      attribute: 0,
    });
    textTracks.forEach((tr) => {
      tr.segments.forEach((teg: any) => {
        const materialTexts = targetJyConfig.materials.texts;
        const materialText = materialTexts.find(
          (item: any) => item.id === teg.material_id
        );
        const pureContent = extractTegPureContent(teg, targetJyConfig);
        for (let i = 0; i < textConfig.count; i++) {
          const textConfigConfig = textConfig.configs[i];
          if (textConfigConfig.oldContent.length === 0) {
            continue;
          }
          if (textConfigConfig.oldContent !== pureContent) {
            continue;
          }
          if (textConfigConfig.newContents.length === 0) {
            continue;
          }
          // replace
          const newContentCount = textConfigConfig.newContents.length;
          const newContentUnpure =
            textConfig.configs[i].randomMode ===
            MODIFIER_SOLUTION.RANDOM_MODE.PURE_RANDOM
              ? textConfigConfig.newContents[voteRandomInt(newContentCount)]
              : textConfigConfig.newContents[projI % newContentCount];
          const newContent = newContentUnpure.replace('\r\n', '\n');
          const appVer = targetJyConfig.last_modified_platform.app_version;
          if (isJsonFormatText(appVer)) {
            const textObj = JSONbig.parse(materialText.content);
            textObj.text = newContent;
            textObj.styles = [textObj.styles[0]];
            textObj.styles[0].range = [0, newContent.length];
            materialText.content = JSONbig.stringify(textObj);
          } else {
            materialText.content = materialText.content.replace(
              pureContent,
              newContent
            );
          }
        }
      });
    });
    return {
      status: "success",
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const isJsonFormatText = (appVer: string) => {
  if (getIsCapCut()) {
    return semver.gte(appVer, "2.9.8");
  } else {
    return semver.gte(appVer, "4.9.8");
  }
};
