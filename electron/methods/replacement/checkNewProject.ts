import * as fs from "fs";
import { handleLoadProjectInfos } from "../common";
import type { CheckNewProjectParamType,PInfoType } from "../../utils/types";

const JSONbig = require("json-bigint");

export const handleCheckNewProject = async (
  _event: any,
  param: CheckNewProjectParamType
) => {
  try {
    const { requiredCount, referenceProject, excepts } = param;
    if (requiredCount <= 0) {
      // will not happen
      return { status: "error", data: `Project required count ${requiredCount} is not reasonable.` };
    }
    const tm_reference_project_create = referenceProject.tm_draft_create;
    const projectInfos = handleLoadProjectInfos();
    if (projectInfos.status === "error") {
      return projectInfos;
    }
    const storeInfos = JSON.parse(projectInfos.data);
    const pInfoArr = storeInfos.all_draft_store;
    const timerangeFiltered = pInfoArr.filter(
      (pInfo: PInfoType) =>
        pInfo.tm_draft_create > tm_reference_project_create && !excepts.includes(pInfo.draft_json_file)
    );
    if (timerangeFiltered.length < requiredCount) {
      return { status: "error", data: `新草稿的数量是${timerangeFiltered.length}，小于所需的数量${requiredCount}。这说明你还需要创建更多的${requiredCount - timerangeFiltered.length}个草稿，请补充创建完成后再回来点击按钮。`}
    }
    timerangeFiltered.sort((a: PInfoType, b: PInfoType) => b.tm_draft_create - a.tm_draft_create);
    const targetPInfos = timerangeFiltered.slice(0, requiredCount).sort((a: PInfoType, b: PInfoType) => a.tm_draft_create - b.tm_draft_create);
    const nonEmptyTargetPInfos = targetPInfos.filter((pInfo: PInfoType) => hasNonEmptyTrack(pInfo));
    return {
      status: "success",
      data: { targetPInfos, nonEmptyTargetPInfos },
    };
  } catch (e) {
    // @ts-ignore
    return { status: "error", data: `${e?.message || e}` };
  }
};

const hasNonEmptyTrack = (pInfo: PInfoType) => {
  try {
    const jsonString = fs.readFileSync(pInfo.draft_json_file, { encoding: "utf8" });
    const jyConfigOriginal = JSONbig.parse(jsonString);
    const tracks = jyConfigOriginal.tracks;
    return tracks.length !== 0;
  } catch (e) {
    return false;
  }
}
