import React from "react";
import "./styles.css";
import { Modal, Button, Row, Progress, Radio } from "antd";
import SelectProject from "../../../components/SelectProject";
import type { RadioChangeEvent } from "antd";
import { IS_EN } from "../../../utils/const";
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

const EXPORT_MODE = {
  SINGLE_TRACK: "SINGLE_TRACK",
  MULTI_TRACK: "MULTI_TRACK",
};

const COPY_CODEC = {
  YES: 'YES',
  NO: 'NO',
}

type StateType = {
  folderDir: string;
  copyCodec: string;
  exportMode: string;
  wholeOutputFilePath: string;
  isResultModalOpen: boolean;
  resultModalText: string;
  isProgressModalOpen: boolean;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
  progressFraction: number;
  progressIndication: string;
};

export default class ExportMainTrackManyClips extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      folderDir: "",
      copyCodec: COPY_CODEC.YES,
      exportMode: EXPORT_MODE.SINGLE_TRACK,
      wholeOutputFilePath: "",
      isResultModalOpen: false,
      resultModalText: "",
      isProgressModalOpen: false,
      isExplanationModalOpen: false,
      activationStatus: {
        status: "",
        gt: 0,
      },
      progressFraction: 0,
      progressIndication: "",
    };
  }

  componentDidMount(): void {
    // @ts-ignore
    window.electronAPI.onUpdateProgressInfo(this.handleUpdateProgressInfo);
    this.getActivationStatus();
  }

  componentWillUnmount(): void {
    // @ts-ignore
    window.electronAPI.offUpdateProgressInfo(this.handleUpdateProgressInfo);
  }

  handleUpdateProgressInfo = (
    _event: any,
    param: { fraction: number; indication: string }
  ) => {
    this.setState({
      progressFraction: param.fraction,
      progressIndication: param.indication,
    });
  };

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
      this.setState({
        folderDir: res.data,
      });
    }
  };

  handleSelectWholeOutputFile = async () => {
    // @ts-ignore
    const res = await window.electronAPI.openFile();
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
      this.setState({
        wholeOutputFilePath: res.data,
      });
    }
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    this.setState({
      isProgressModalOpen: true,
    });
    // @ts-ignore
    const res = await window.electronAPI.exportMainTrackAllClips({
      infoPath: pInfo.draft_json_file,
      folderDir: this.state.folderDir,
      copyCodec: this.state.copyCodec,
      exportMode: this.state.exportMode,
      wholeOutputFilePath: this.state.wholeOutputFilePath,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        resultModalText: `成功导出了${res.data}个视频片段，为您节约了宝贵的时间！接下来你可以去到左侧菜单的批量替换功能，进行自动化混剪替换。`,
        progressFraction: 0,
      });
    }
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    return (
      <div>
        <p>{`您是否确定要导出草稿 ${pInfo.draft_name} 的主轨道上的所有视频片段?`}</p>
        <p>{"注意："}</p>
        <p>{"1. 请确认剪映软件中该草稿处于关闭状态。"}</p>
      </div>
    );
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

  isSettingCompleted = () => {
    return (
      (this.state.exportMode === EXPORT_MODE.SINGLE_TRACK &&
        this.state.folderDir.length > 0) ||
      (this.state.exportMode === EXPORT_MODE.MULTI_TRACK &&
        this.state.folderDir.length > 0 &&
        this.state.wholeOutputFilePath.length > 0)
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
              {"批量导出一个草稿的主轨道上的所有视频片段"}
            </span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`导出的文件要存放在哪里？`}
            </span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button
              type="primary"
              onClick={this.handleSelectFolder}
              style={{ marginRight: 13 }}
            >
              {`${this.state.folderDir.length > 0 ? "修改" : "选择"}导出文件夹`}
            </Button>
          </Row>
          {this.state.folderDir.length > 0 ? (
            <Row
              style={{ marginTop: 10 }}
            >{`已选择：${this.state.folderDir}`}</Row>
          ) : null}
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`【导出速度】是否采用快速导出法？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const copyCodec = e.target.value;
                this.setState({ copyCodec });
              }}
              value={this.state.copyCodec}
            >
              <Radio value={COPY_CODEC.YES}>
                <span className="setting-text-span">
                  {"是"}
                </span>
              </Radio>
              <Radio value={COPY_CODEC.NO}>
                <span className="setting-text-span">
                  {"否"}
                </span>
              </Radio>
            </Radio.Group>
          </Row>          
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`【轨道选择】请问你要是否需要导出的视频片段包含叠加在上面的其他轨道的元素（如文字、贴纸、特效、滤镜等）？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const exportMode = e.target.value;
                this.setState({ exportMode });
              }}
              value={this.state.exportMode}
            >
              <Radio value={EXPORT_MODE.SINGLE_TRACK}>
                <span className="setting-text-span">
                  {"仅导出主轨道视频片段"}
                </span>
              </Radio>
              <Radio value={EXPORT_MODE.MULTI_TRACK}>
                <span className="setting-text-span">
                  {"导出的视频片段需要叠加草稿其他元素"}
                </span>
              </Radio>
            </Radio.Group>
          </Row>
          {this.state.exportMode === EXPORT_MODE.MULTI_TRACK ? (
            <Row style={{ marginTop: 10 }}>
              <Button
                type="primary"
                onClick={this.handleSelectWholeOutputFile}
                style={{ marginRight: 13 }}
              >
                {`${
                  this.state.wholeOutputFilePath.length > 0 ? "修改" : "选择"
                }完整视频文件（你需要先导出完整时间线的视频）`}
              </Button>
            </Row>
          ) : null}
          {this.state.wholeOutputFilePath.length > 0 ? (
            <Row
              style={{ marginTop: 10 }}
            >{`已选择：${this.state.wholeOutputFilePath}`}</Row>
          ) : null}
          {this.isSettingCompleted() ? (
            <div className="finish-options" style={{ marginTop: 10 }}>
              你已经完成了所有设置。请点击下方草稿↓↓↓
            </div>
          ) : null}
        </div>
        <SelectProject
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={""}
          hideProjectSourceSelect={IS_EN}
        />
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
        {this.state.isProgressModalOpen ? (
          <Modal
            open={true}
            okButtonProps={{
              style: {
                display: "none",
              },
            }}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
            closable={false}
          >
            <p>{this.state.progressIndication}</p>
            <Progress
              percent={parseFloat(
                (this.state.progressFraction * 100).toFixed(1)
              )}
              status="active"
            />
          </Modal>
        ) : null}
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
                <strong>批量导出一个草稿的主轨道上的所有视频片段</strong>
                的功能解释
              </p>
              <p>
                {
                  `注意：如果你选择“仅导出主轨道视频片段”，叠加在视频片段上的效果，如文字、贴纸、特效、滤镜等等将不会导出；复合片段不会被导出；图片片段不会被导出；放置在其他视频轨道上的片段不会被导出。如果你选择“导出的视频片段需要叠加草稿中其他元素（如文字、贴纸、特效、滤镜等）”，复合片段会被导出；图片片段会被导出。`
                }
              </p>
              <p>{"使用步骤："}</p>
              <p>{`1. 选择导出文件夹，后续导出的各个片段会保存在该文件夹中。`}</p>
              <p>{`2. 你可以选择"仅导出主轨道视频片段"，则叠加在视频片段上的效果，如文字、特效、滤镜等等将不会导出。你也可以选择“导出的视频片段需要叠加草稿中其他元素（如文字、贴纸、特效、滤镜等）”，这种模式下，你需要先用剪映的导出功能手动导出整条时间线的完整视频。然后告知本软件这个导出视频在哪里，本功能依然会根据下一步你选择的草稿（勿选错）的主轨道上的分割点为你分割视频。`}</p>
              <p>{`3. 选择草稿。请确保其主轨道上有视频片段。`}</p>
              <p>{`完成啦。接下来你可以去到左侧菜单的批量替换功能，进行自动化混剪替换。`}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
