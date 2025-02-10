import React from "react";
import "./styles.css";
import { Modal, Button, Row } from "antd";
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

type StateType = {
  isResultModalOpen: boolean;
  resultModalText: string;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
};

export default class RenameReplacedOutput extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      isResultModalOpen: false,
      resultModalText: "",
      isExplanationModalOpen: false,
      activationStatus: {
        status: "",
        gt: 0,
      },
    };
  }

  componentDidMount(): void {
    this.getActivationStatus();
  }

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  handleSelectFolder = async () => {
    // @ts-ignore
    const res = await window.electronAPI.openDirectory();
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      if (res.data.length === 0) {
        return;
      }
      await this.renameReplacedOutput({
        folderDir: res.data,
      });
    }
  };

  renameReplacedOutput = async (param: { folderDir: string }) => {
    // @ts-ignore
    const res = await window.electronAPI.renameReplacedOutput(param);
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。已经成功重命名了${res.data.actuallyRenamedCount}个文件。`,
      });
    }
  };

  renderTrialIndication = () => {
    const { activationStatus } = this.state;
    if (activationStatus.status !== "trial") {
      return null;
    }
    return (
      <div className="align-master-trial-container">
        <p>
          <strong>{"试用版限制："}</strong>
        </p>
        <p>{`剩余试用次数: ${activationStatus.trialTimeLeft}次。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  render() {
    return (
      <div>
        {this.renderTrialIndication()}
        <Button
          type="primary"
          size="large"
          onClick={() => {
            this.setState({
              isExplanationModalOpen: true,
            });
          }}
          style={{ marginTop: 20, marginLeft: 20 }}
        >
          {"功能解释"}
        </Button>
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">{"重命名导出的视频"}</span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button
              type="primary"
              onClick={this.handleSelectFolder}
              style={{ marginRight: 13 }}
            >
              {"选择导出视频所在的文件夹"}
            </Button>
          </Row>
        </div>
        <Modal
          open={this.state.isResultModalOpen}
          onOk={this.handleClickModalOk}
          closable={false}
          cancelButtonProps={{
            style: {
              display: "none",
            },
          }}
        >
          <p>{this.state.resultModalText}</p>
        </Modal>
        {this.state.isExplanationModalOpen ? (
          <Modal
            open={true}
            closable={false}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
            onOk={() => {
              this.setState({
                isExplanationModalOpen: false,
              });
            }}
          >
            <div style={{ height: 400, overflowY: "scroll" }}>
              <p style={{ fontSize: 18 }}>
                <strong>重命名导出的视频</strong>的功能解释
              </p>
              <p>{"如果你不喜欢导出的视频文件是以日期命名，那么你就需要本功能。"}</p>
              <p>{`对于【按组精确替换素材】，该功能会把输出视频命名为该组素材所在的子文件夹的名称。`}</p>
              <p>{`对于【混剪裂变替换素材】，如果替换的素材只有一个，该功能会把输出视频命名为该素材的名称。如果有多个则不会重命名。`}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
