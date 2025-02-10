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

export default class Innovation extends React.Component<PropsType, StateType> {
  render() {
    return (
      <div>
        <iframe
          src={`https://friendpei.lxhfight.com/innovation?timestamp=${+new Date()}`}
          title="更多软件资源"
          style={{ width: "100%", height: "99vh", backgroundColor: "white" }}
        ></iframe>
      </div>
    );
  }
}
