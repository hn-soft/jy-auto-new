import React from "react";
import "./styles.css";
import { Modal, Button, Row, Radio, InputNumber } from "antd";
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

type StateType = {
  refPInfo: PInfoType | undefined;
  randomMode: string;
  isTooShortToAdd: boolean;
  thresholdSegLen: number;
  isResultModalOpen: boolean;
  resultModalText: string;
  showUndoBtn: boolean;
  isUndoConfirmModalOpen: boolean;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
};

const RANDOM_MODE = {
  ORDER: "ORDER",
  PURE_RANDOM: "PURE_RANDOM",
};

export default class Filter extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      refPInfo: undefined,
      randomMode: RANDOM_MODE.ORDER,
      isTooShortToAdd: false,
      thresholdSegLen: 1,
      isResultModalOpen: false,
      resultModalText: "",
      showUndoBtn: false,
      isUndoConfirmModalOpen: false,
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

  componentWillUnmount(): void {}

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

  handleSelectRefProject = async (pInfo: PInfoType) => {
    this.setState({
      refPInfo: pInfo,
    });
  };

  handleSelectTargetProject = async (pInfo: PInfoType) => {
    if (this.state.refPInfo === undefined) {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因：你还没在上方选择参考草稿。请先选择参考草稿再选择目标草稿。`,
      });
      return;
    }
    // @ts-ignore
    const res = await window.electronAPI.addFilters({
      refInfoPath: this.state.refPInfo?.draft_json_file,
      targetInfoPath: pInfo.draft_json_file,
      randomMode: this.state.randomMode,
      isTooShortToAdd: this.state.isTooShortToAdd,
      thresholdSegLen: this.state.thresholdSegLen,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功为${res.data.vSegCount}个视频片段添加了${res.data.layerCount}层滤镜，共${res.data.addedCount}个滤镜片段。为您节约了宝贵的时间！`,
        showUndoBtn: true,
      });
    }
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    return (
      <div>
        <p>{`您是否确定要为 ${pInfo.draft_name} 批量添加滤镜?`}</p>
        <p>{`您设置的是${ this.state.randomMode === RANDOM_MODE.ORDER ? "顺序模式" : "纯随机模式" }。`}</p>
        <p>{`${ this.state.isTooShortToAdd ?  `时长短于${this.state.thresholdSegLen}s的片段不会添加滤镜` : "主轨道每个片段都要添加滤镜" }。`}</p>
        <p>{"注意："}</p>
        <p>{"1. 请确认剪映软件中该草稿处于关闭状态。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoAddFilters();
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。${res.data}`,
        showUndoBtn: false,
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
        <p>{`试用版限制只能为不超过1分钟的草稿做操作，正式版没有此上限。`}</p>
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
        <SelectProject
          onSelectProject={this.handleSelectRefProject}
          renderConfirmContentComp={() => {}}
          headerFinePrint={
            "请选择参考草稿（该草稿中的具体滤镜会被用于添加到下方的目标草稿中）"
          }
          skipConfirm
          hideProjectSourceSelect={IS_EN}
        />
        {this.state.refPInfo ? (
          <Row>
            <span className="align-master-setting-enabled-title">
              {`你已经选择了参考草稿：${this.state.refPInfo.draft_name}。该草稿不会被改动，改动的是下方你要选择的目标草稿。接下来请你完成下方设置，并点击目标草稿。`}
            </span>
          </Row>
        ) : null}
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">{"设置"}</span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">
              {`如何从上方的参考草稿中选取具体的滤镜？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const randomMode = e.target.value;
                this.setState({ randomMode });
              }}
              value={this.state.randomMode}
            >
              <Radio value={RANDOM_MODE.ORDER}>
                <span className="setting-text-span">顺序模式</span>
              </Radio>
              <Radio value={RANDOM_MODE.PURE_RANDOM}>
                <span className="setting-text-span">纯随机模式</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">
              {`下方的参考草稿中什么样的片段需要添加滤镜？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isTooShortToAdd = e.target.value;
                this.setState({ isTooShortToAdd });
              }}
              value={this.state.isTooShortToAdd}
            >
              <Radio value={false}>
                <span className="setting-text-span">主轨道每个片段都要添加滤镜</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">主轨道上太短的片段不添加滤镜，由我定义阈值</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row className="option-row">
            { 
                this.state.isTooShortToAdd ? 
                <InputNumber
                    addonBefore={"阈值时长（短于此时长的片段不添加滤镜）:"}
                    addonAfter={"s"}
                    min={0}
                    max={100}
                    style={{ width: "400px" }}
                    step={0.1}
                    value={this.state.thresholdSegLen}
                    onChange={(value: number | null) => {
                    this.setState({
                        thresholdSegLen: typeof value === "number" ? value : 0,
                    });
                    }}
              /> : null
            }
          </Row>
        </div>
        <SelectProject
          onSelectProject={this.handleSelectTargetProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={"请选择目标草稿（滤镜将会添加到该草稿中）"}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right" }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的操作"}
            </Button>
          ) : null}
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
        {this.state.isUndoConfirmModalOpen ? (
          <Modal
            open={true}
            onOk={() => {
              this.handleUndo();
              this.setState({
                isUndoConfirmModalOpen: false,
              });
            }}
            onCancel={() => {
              this.setState({
                isUndoConfirmModalOpen: false,
              });
            }}
            closable={false}
          >
            <p>{"您是否要撤销刚才的对齐操作？"}</p>
            <p>
              {
                "请注意：务必在剪映中关闭对应的草稿后再点击“确定”按钮，否则无法成功撤销。"
              }
            </p>
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
                <strong>滤镜</strong>
                的功能解释
              </p>
              <p>
                {`该功能可以让你批量添加滤镜到目标草稿，目标草稿主轨道上的每个片段都会对应于一个滤镜。如果你想要有许多不同种类的滤镜，你可以丰富你的参考草稿。参考草稿中已有的滤镜是本功能的选取来源。在实际使用中，参考草稿一般是一个放满了滤镜而没有其他内容的草稿，它专门用于本功能提取具体滤镜，你可以把你喜欢的滤镜都放进去。请注意：参考草稿中的滤镜如果被放在多条轨道，那么目标草稿操作后就有多条滤镜轨道，每条滤镜轨道的具体滤镜来源于参考草稿各条滤镜轨道上的滤镜。如果你想要目标草稿叠放3条滤镜轨道，你需要在参考草稿中放置3条滤镜轨道。`}
              </p>
              <p>{"使用步骤："}</p>
              <p>{`1. 选择参考草稿。`}</p>
              <p>{`2. 完成设置（也可以保持默认不动）。`}</p>
              <p>{`3. 选择目标草稿。`}</p>
              <p>{`完成啦。接下来你可以打开剪映草稿查看效果。`}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
