import React from "react";
import "./styles.css";
import SelectProject from "../../../../../components/SelectProject";
import {
  Modal,
  Button,
} from "antd";
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

export default class ProfessionalAudioMerger extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
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
    const res = await window.electronAPI.professionalMergeAudio({
      infoPath: pInfo.draft_json_file,
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
        resultModalText: `成功了。成功向左紧靠了${res.data}段音频。`,
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
        <p>{`您是否确定要让草稿 ${pInfo.draft_name} 里的音频向左靠拢，使其紧密相靠？`}</p>
        <p>{"注意："}</p>
        <p>{"1. 建议在剪映中复制草稿作为备份。"}</p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
        <p>{"3. 填充操作会保持音频片段的时长不变，右边的音频的位置会向左移动，使得音频之间紧靠无间隙。如果不满意，可点右下角撤销按钮。"}</p>
        <p>{"4. 如果你有多条音频轨道且发现向左紧靠的不是你想要的音频轨道，你可以点击不想要的轨道左侧的眼睛按钮隐藏此轨道，再重试。对于隐藏的轨道，本软件会忽略它。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoProfessionalMergeAudio();
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
        <p>{`试用版限制只能让不超过10段音频向左紧靠，正式版没有此上限。`}</p>
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
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={"请点击你想要让音频向左紧靠的草稿"}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的音频向左紧靠操作"}
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
            <p>{"您是否要撤销刚才的音频向左紧靠操作？"}</p>
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
                <strong>音频向左紧靠</strong>的功能解释
              </p>
              <p>如图：</p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="audio-merger-demo"
                  src={"./illustration/audiomergerdemo.png"}
                />
              </p>
              <p>
                {
                  "音频片段本身的长度不变，移动其位置，让它们从左到右紧密排列。最左端的音频会移动到从00:00开始。"
                }
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
                  '那么你对齐图片或视频与音频后再打开剪映会发现对不齐，这是因为主轨的素材都会向左紧靠，所以打开的一瞬间就打破了对齐关系，并不是本软件的Bug。"音频向左紧靠"功能正是为了解决这一问题存在，但即便有此功能，还是建议你关闭"主轨磁吸"。'
                }
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
