import React from "react";
import "./styles.css";
import SelectProject from "../../../components/SelectProject";
import {
  Modal,
  Button,
  Row,
  Col,
  Select,
  Tooltip,
  Radio,
} from "antd";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { RANDOM_MODE, PROJECT_NATION, SOUND_MODE } from "../../../utils/const";
import type { RadioChangeEvent } from "antd";

const KEYFRAME_TYPES = {
  LEFT_TO_RIGHT: {
    key: "LEFT_TO_RIGHT",
    name: "从左向右",
  },
  RIGHT_TO_LEFT: {
    key: "RIGHT_TO_LEFT",
    name: "从右向左",
  },
  UPPER_TO_BOTTOM: {
    key: "UPPER_TO_BOTTOM",
    name: "从上向下",
  },
  BOTTOM_TO_UPPER: {
    key: "BOTTOM_TO_UPPER",
    name: "从下向上",
  },
  UPPER_LEFT_TO_BOTTOM_RIGHT: {
    key: "UPPER_LEFT_TO_BOTTOM_RIGHT",
    name: "从左上到右下",
  },
  BOTTOM_LEFT_TO_UPPER_RIGHT: {
    key: "BOTTOM_LEFT_TO_UPPER_RIGHT",
    name: "从左下到右上",
  },
  UPPER_RIGHT_TO_BOTTOM_LEFT: {
    key: "UPPER_RIGHT_TO_BOTTOM_LEFT",
    name: "从右上到左下",
  },
  BOTTOM_RIGHT_TO_UPPER_LEFT: {
    key: "BOTTOM_RIGHT_TO_UPPER_LEFT",
    name: "从右下向左上",
  },
  ZOOM_IN: {
    key: "ZOOM_IN",
    name: "放大",
  },
  ZOOM_OUT: {
    key: "ZOOM_OUT",
    name: "缩小"
  },
  ZOOM_IN_SLIGHT: {
    key: "ZOOM_IN_SLIGHT",
    name: "轻微放大",
  },
  ZOOM_OUT_SLIGHT: {
    key: "ZOOM_OUT_SLIGHT",
    name: "轻微缩小",
  },
  ZOOM_IN_SEVERE: {
    key: "ZOOM_IN_SEVERE",
    name: "剧烈放大",
  },
  ZOOM_OUT_SEVERE: {
    key: "ZOOM_OUT_SEVERE",
    name: "剧烈缩小",
  },
};

const ASPECT_RATIO = {
  LANDSCAPE: 'LANDSCAPE',
  PORTRAIT: 'PORTRAIT',
}
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
  projectNation: string;
  aspectRatio: string;
  isMainTrackOnly: boolean;
  randomMode: string;
  curDisplayCount: number;
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

const MAX_EFFECT_COUNT = 20;

export default class Keyframe extends React.Component<PropsType, StateType> {
  keyframeSelecteds: string[] = Array(MAX_EFFECT_COUNT).fill("");

  constructor(props: PropsType) {
    super(props);
    this.state = {
      projectNation: "",
      aspectRatio: ASPECT_RATIO.LANDSCAPE,
      isMainTrackOnly: true,
      randomMode: RANDOM_MODE.ORDER,
      curDisplayCount: 1,
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

  async componentDidMount() {
    await this.getActivationStatus();
    const projectNation = await this.fetchIsCapCut();
    this.setState({
      projectNation,
    });
  }

  fetchIsCapCut = async () => {
    // @ts-ignore
    const isCapCutRes = await window.electronAPI.getIsCapCut();
    const projectNation =
      isCapCutRes.status === "success" && isCapCutRes.data === "true"
        ? PROJECT_NATION.CAPCUT
        : PROJECT_NATION.JIANYING;
    return projectNation;
  };

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    const keyframeTypeList = this.keyframeSelecteds
      .slice(0, this.state.curDisplayCount)
      .filter((item) => item.length > 0);
    // @ts-ignore
    const res = await window.electronAPI.addKeyframes({
      infoPath: pInfo.draft_json_file,
      isCapCut: this.getIsCapCut(),
      keyframes: keyframeTypeList,
      aspectRatio: this.state.aspectRatio,
      isMainTrackOnly: this.state.isMainTrackOnly,
      randomMode: this.state.randomMode,
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
        resultModalText: `成功了。已经为${res.data.appliedTrackCount}条视频轨道批量共${res.data.crossTrackAddCount}个片段添加了关键帧动画。`,
        showUndoBtn: true,
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    const keyframeTypeList = this.keyframeSelecteds
    .slice(0, this.state.curDisplayCount)
    .filter((item) => item.length > 0);
    let randomWords = "";
    switch (this.state.randomMode) {
      case RANDOM_MODE.ORDER:
        randomWords = "按顺序循环添加";
        break;
      case RANDOM_MODE.FLATTEN_RANDOM:
        randomWords = "按均匀随机模式添加";
        break;
      case RANDOM_MODE.PURE_RANDOM:
        randomWords = "按纯随机模式添加";
        break;
    }
    return (
      <div>
        <p>{`你是否确定要给草稿 ${pInfo.draft_name} 批量添加关键帧动画？`}</p>
        <p>{`您设置了${keyframeTypeList.length}种关键帧动画效果，您希望这些关键帧被添加到${
          this.state.isMainTrackOnly
            ? "仅主视频轨道"
            : "所有视频轨道（排除掉锁定的视频轨道）"
        }，${randomWords}。`}</p>
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoAddKeyframes();
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

  renderKeyframeSelects = () => {
    const { curDisplayCount } = this.state;
    const indexes = [];
    for (let i = 0; i < curDisplayCount; i++) {
      indexes.push(i);
    }
    return (
      <>
        {indexes.map((i) => {
          const keyframeOptions = Object.values(KEYFRAME_TYPES).map(item => {
            return {
                label: item.name,
                value: item.key,
            };
          });
          return (
            <Row key={`keyframe-${i}-${this.keyframeSelecteds[i]}`}>
              <Col>
                <Select
                  value={this.keyframeSelecteds[i] || "-- 选择具体效果 --"}
                  style={{
                    width: 160,
                    marginBottom: 12,
                  }}
                  onChange={(value: string) => {
                    this.keyframeSelecteds[i] = value;
                    this.forceUpdate();
                  }}
                  options={keyframeOptions}
                />
              </Col>
            </Row>
          );
        })}
        <Row style={{ marginBottom: 10 }}>
          <Col style={{ marginRight: 10 }}>
            <Tooltip title="增加">
              <Button
                size="small"
                shape="circle"
                icon={<PlusOutlined  />}
                onClick={() => {
                  if (curDisplayCount < MAX_EFFECT_COUNT) {
                    this.setState({ curDisplayCount: curDisplayCount + 1 });
                  } else {
                    this.setState({
                      isResultModalOpen: true,
                      resultModalText: `已达最大动画效果数量${MAX_EFFECT_COUNT}，不可以再添加更多。如有特殊需要，请付费定制。`,
                    });
                  }
                }}
              />
            </Tooltip>
          </Col>
          <Col>
            <Tooltip title="减少">
              <Button
                size="small"
                shape="circle"
                icon={<MinusOutlined  />}
                onClick={() => {
                  if (curDisplayCount > 1) {
                    this.setState({ curDisplayCount: curDisplayCount - 1 });
                  } else if (curDisplayCount === 1) {
                    this.setState({
                      isResultModalOpen: true,
                      resultModalText: `至少需要选择1个动画效果`,
                    });
                  } else {
                    alert("不应该出现的动画效果数量");
                  }
                }}
              />
            </Tooltip>
          </Col>
          <Col
            style={{
              marginLeft: 13,
              display: "flex",
              justifyItems: "center",
              alignItems: "center",
            }}
          >
            <div style={{}}>{`当前数量: ${this.state.curDisplayCount}`}</div>
          </Col>
        </Row>
      </>
    );
  };

  renderOptions = () => {
    const effectOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ paddingBottom: 10 }}
          >
            {`请选择你的${
              this.getIsCapCut() ? "CapCut" : "剪映"
            }草稿所需要的关键帧动画效果（可点击"+"添加更多）`}
          </span>
        </Row>
        {this.renderKeyframeSelects()}
      </>
    );
    const aspectRatioOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问你的视频尺寸是怎样的?`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const aspectRatio = e.target.value;
              this.setState({ aspectRatio });
            }}
            value={this.state.aspectRatio}
          >
            <Radio value={ASPECT_RATIO.LANDSCAPE}>
              <span className="setting-text-span">{`16:9(横屏)`}</span>
            </Radio>
            <Radio value={ASPECT_RATIO.PORTRAIT}>
              <span className="setting-text-span">
                {`9:16(竖屏)`}
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const trackOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问关键帧动画要批量添加到哪些视频轨道?`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const isMainTrackOnly = e.target.value;
              this.setState({ isMainTrackOnly });
            }}
            value={this.state.isMainTrackOnly}
          >
            <Radio value={true}>
              <span className="setting-text-span">仅主视频轨道</span>
            </Radio>
            <Radio value={false}>
              <span className="setting-text-span">
                所有视频轨道（排除掉锁定的视频轨道）
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const randomOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问你希望你选择的动画效果以什么样的顺序添加到视频轨道上?`}
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
              <span className="setting-text-span">
                按设置中的排列顺序依次添加并循环
              </span>
            </Radio>
            <Radio value={RANDOM_MODE.FLATTEN_RANDOM}>
              <span className="setting-text-span">
                均匀随机模式（随机但尽量避免相邻重复）
              </span>
            </Radio>
            <Radio value={RANDOM_MODE.PURE_RANDOM}>
              <span className="setting-text-span">
                纯随机模式（相邻可能重复）
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"设置"}</span>
        </Row>
        {effectOption}
        {aspectRatioOption}
        {trackOption}
        {randomOption}
      </div>
    );
  };

  getIsCapCut = () => {
    return this.state.projectNation === PROJECT_NATION.CAPCUT;
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
        {this.state.projectNation.length > 0 ? (
          <>
            {this.renderOptions()}
            <SelectProject
              onSelectProject={this.handleSelectProject}
              renderConfirmContentComp={this.renderConfirmContentComp}
              headerFinePrint={""}
              hideProjectSourceSelect
              key={this.state.projectNation}
            />
            <div style={{ float: "right", marginBottom: 15 }}>
              {this.state.showUndoBtn ? (
                <Button onClick={this.handleClickUndo}>
                  {"撤销刚才的操作"}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
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
            <p>{"您是否要撤销刚才的操作？"}</p>
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
                <strong>{`关键帧动画功能`}</strong>
              </p>
              <p>{`本功能可以添加关键帧动画到视频轨道上的各个片段。建议你视频轨道上要有不止一个片段，这样才能看出效果。`}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
