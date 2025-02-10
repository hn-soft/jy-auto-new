import React from "react";
import "./styles.css";
import { Modal, Button, Row, Radio } from "antd";
import type { RadioChangeEvent } from "antd";
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
  isTargetCaseUpper: boolean;
  isResultModalOpen: boolean;
  resultModalText: string;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
};

export default class RenameExtensionCase extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      isTargetCaseUpper: false,
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
      await this.renameExtensionCase({
        folderDir: res.data,
        isTargetCaseUpper: this.state.isTargetCaseUpper,
      });
    }
  };

  renameExtensionCase = async (param: {
    folderDir: string;
    isTargetCaseUpper: boolean;
  }) => {
    // @ts-ignore
    const res = await window.electronAPI.renameExtensionCase(param);
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      const renameActionStr = res.data.renameActions.map((item: any) => `${item.before} -> ${item.after}`).join(';\r\n');
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。已经成功转换了${
          res.data.actuallyRenamedCount
        }个文件的后缀，将其全部改为${
          this.state.isTargetCaseUpper ? "大写" : "小写"
        }。分别是: \r\n${renameActionStr}`,
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
            <span className="align-master-setting-big-title">
              {"重命名素材的后缀大小写"}
            </span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`请问你要将该文件夹内的文件后缀统一修改为小写还是大写？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isTargetCaseUpper = e.target.value;
                this.setState({ isTargetCaseUpper });
              }}
              value={this.state.isTargetCaseUpper}
            >
              <Radio value={false}>
                <span className="setting-text-span">{"小写"}</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"大写"}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button
              type="primary"
              onClick={this.handleSelectFolder}
              style={{ marginRight: 13 }}
            >
              {"选择素材文件所在的文件夹"}
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
          <div
              style={{ height: 400, overflowY: "scroll" }}
            >
              <p>{this.state.resultModalText}</p>
          </div>
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
                <strong>重命名素材的后缀大小写</strong>的功能解释
              </p>
              <p>
                {"在替换功能中，要求新素材和参考草稿片段素材的后缀严格一致，大小写也必须一致。比如你不能将.MP4文件用于替换.mp4文件。但是，有可能你的素材里既有.MP4又有.mp4。该功能可以帮你把后缀大小写规范化。"}
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
