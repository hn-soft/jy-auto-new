import React from "react";
import "./styles.css";
import SelectProject from "../../../../../components/SelectProject";
import { Modal, Button, Row, Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import { IS_EN } from "../../../../../utils/const";
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
  fillMethod: string; // midmerge, rightward
  isStartFromZero: boolean;
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

const FILL_METHOD = {
  MIDMERGE: "midmerge",
  RIGHTWARD: "rightward",
};

export default class ProfessionalTextGapFiller extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      fillMethod: FILL_METHOD.MIDMERGE,
      isStartFromZero: true,
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

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    // @ts-ignore
    const res = await window.electronAPI.professionalFillTextGap({
      infoPath: pInfo.draft_json_file,
      fillMethod: this.state.fillMethod,
      isStartFromZero: this.state.isStartFromZero,
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
        resultModalText: `成功填补了${res.data}段字幕之间的间隙。`,
        showUndoBtn: true,
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    return (
      <div>
        <p>{`您是否确定要填充草稿 ${pInfo.draft_name} 里的字幕间隙，使其紧密相靠？`}</p>
        <p>{`您设置的填补方式是${this.state.fillMethod === FILL_METHOD.MIDMERGE ? '相邻两段向中间填补。' : '向右侧填补到紧贴下一段。'}`}</p>
        <p>{`${this.state.isStartFromZero ? '您希望第一段字幕从00:00开始。' : '您希望第一段字幕起始时间保持不变。'}`}</p>
        <p>{"注意："}</p>
        <p>{"1. 建议在剪映中复制草稿作为备份。"}</p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
        <p>
          {
            "3. 填充操作会增大字幕片段的时长，如果不满意最终效果，可点右下角撤销按钮。"
          }
        </p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoProfessionalFillTextGap();
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
        <p>{`试用版限制只能填补不超过10段字幕的间隙，正式版没有此上限。`}</p>
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
            <span className="align-master-setting-big-title">{"设置"}</span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">{`你希望字幕间隙怎样被填补？`}</span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                this.setState({ fillMethod: e.target.value });
              }}
              value={this.state.fillMethod}
            >
              <Radio value={FILL_METHOD.MIDMERGE}>
                <span className="setting-text-span">{`相邻两段字幕都向中间延长，共同填补间隙`}</span>
              </Radio>
              <Radio value={FILL_METHOD.RIGHTWARD}>
                <span className="setting-text-span">{`字幕向右延长，填补间隙到紧贴下一段字幕`}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">{`第一段字幕左端是否需要延长到从00:00开始？`}</span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                this.setState({ isStartFromZero: e.target.value });
              }}
              value={this.state.isStartFromZero}
            >
              <Radio value={true}>
                <span className="setting-text-span">{`是，在视频最开始时出现字幕`}</span>
              </Radio>
              <Radio value={false}>
                <span className="setting-text-span">{`否，保留第一段字幕起始时间点不变`}</span>
              </Radio>
            </Radio.Group>
          </Row>
        </div>
        <SelectProject
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={"请点击你想要填补字幕间隙的草稿"}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的填补操作"}
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
            <p>{"您是否要撤销刚才的填补操作？"}</p>
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
                <strong>填补字幕间隙</strong>的功能解释
              </p>
              <p>如图：</p>
              <p>
                <strong>相邻两段字幕都向中间延长，共同填补间隙</strong>示意图如下
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="text-gap-filler-demo"
                  src={"./illustration/textgapfillerdemo.png"}
                />
              </p>
              <p>
                <strong>字幕向右延长，填补间隙到紧贴下一段字幕</strong>示意图如下
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="text-gap-filler-demo"
                  src={"./illustration/textgapfillerdemo2.png"}
                />
              </p>
              <p>如果你开启了"主轨磁吸"（下图的绿色按钮）</p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="jianying-stick-to-left-button"
                  src={"./illustration/sticktoleft.png"}
                />
              </p>
              <p>
                {
                  '那么你对齐图片或视频与字幕后再打开剪映会发现对不齐，这是因为主轨的素材都会向左紧靠，所以打开的一瞬间就打破了对齐关系，并不是本软件的Bug。"填补字幕间隙"功能正是为了解决这一问题存在，但即便有此功能，还是建议你关闭"主轨磁吸"。'
                }
              </p>
              <p>
                {
                  '填补字幕间隙操作会延长字幕出现的时长，字幕相对位置保持基本不变。如果你要改变字幕位置，让字幕向左紧靠，与此同时字幕长度保持原样，请你选择左侧的"字幕向左紧靠"功能。'
                }
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
