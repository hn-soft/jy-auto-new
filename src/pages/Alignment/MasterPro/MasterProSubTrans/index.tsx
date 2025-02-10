import React from "react";
import "./styles.css";
type PInfoType = {
  "draft_cloud_last_action_download":false,
  "draft_cloud_purchase_info":"",
  "draft_cloud_template_id":"",
  "draft_cloud_tutorial_info":"",
  "draft_cloud_videocut_purchase_info":"",
  "draft_cover":"",
  "draft_fold_path":"",
  "draft_id":"",
  "draft_is_ai_shorts":false,
  "draft_is_invisible":false,
  "draft_json_file":"",
  "draft_name":"",
  "draft_new_version":"",
  "draft_root_path":"",
  "draft_timeline_materials_size":0,
  "draft_type":"",
  "tm_draft_cloud_completed":"",
  "tm_draft_cloud_modified":0,
  "tm_draft_create":0,
  "tm_draft_modified":0,
  "tm_draft_removed":0,
  "tm_duration":0
};
type PropsType = {};
type StateType = {};

export default class MasterProSubTrans extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className={"usage-words"}>
        {
          "该子功能不包含字幕翻译功能，该页面是作为一个广告的作用存在，告诉你此步骤可以用我的软件完成，方便高效。如果你需要字幕翻译功能，那么，请你下载 "
        }
        <strong>
          <a
            href="https://friendpei.lxhfight.com/download#jianying-subtitle-translation-master"
            target="_blank"
            rel="noopener noreferrer"
          >
            剪映字幕翻译大师
          </a>
        </strong>
        {"。"}
        {"请注意：剪映字幕翻译大师是另外的软件，可以搭配本软件使用。但剪映字幕翻译大师是需要独立付费才可以使用的，拥有本软件的正式版不意味着你可以免费使用剪映字幕翻译大师。但是，你可以免费试用，满意再付。您如果要自己手动翻译，也可以不必使用我的字幕翻译软件，您依然可以进行后续步骤的操作。"}
      </div>
    );
  }
}
