import { getIsCapCut } from "./nationVal";
const semver = require("semver");
const JSONbig = require("json-bigint");

export const extractTegPureContent = (teg: any, jyConfig: any) => {
  const isJsonFormatText = (appVer: string) => {
    if (getIsCapCut()) {
      return semver.gte(appVer, "2.9.8");
    } else {
      return semver.gte(appVer, "4.9.8");
    }
  };
  const extractPureTextContentOlder = (content: string) => {
    if (typeof content !== "string") {
      return "";
    }
    const startLeftIndex = content.lastIndexOf(">[");
    if (startLeftIndex === -1) {
      return "";
    }
    const startIndex = startLeftIndex + 2;
    const endIndex = content.indexOf("]</");
    if (endIndex === -1) {
      return "";
    }
    return content.substring(startIndex, endIndex);
  };
  const extractPureTextContentNewer = (content: string) => {
    try {
      const textObj = JSONbig.parse(content);
      return textObj.text;
    } catch (e) {
      return "";
    }
  };
  const extractPureTextContent = (content: string) => {
    const appVer = jyConfig.last_modified_platform.app_version;
    if (isJsonFormatText(appVer)) {
      return extractPureTextContentNewer(content);
    } else {
      return extractPureTextContentOlder(content);
    }
  };
  const materialTexts = jyConfig.materials.texts;
  const materialText = materialTexts.find(
    (item: any) => item.id === teg.material_id
  );
  if (materialText === undefined) {
    return "";
  }
  return extractPureTextContent(materialText.content);
};
