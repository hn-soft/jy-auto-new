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

export default class ProfessionalCutAudioByBeat extends React.Component<PropsType, StateType> {
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
    const res = await window.electronAPI.professionalCutAudioByBeat({
      infoPath: pInfo.draft_json_file,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
        let successText = "";
        if (res.data.originalSegCount === res.data.resultSegCount) {
            successText = `但是切割前后的音频段落数都是${res.data.originalSegCount}，很有可能你忘了添加任何节拍踩点了。请重新操作一次。`;
        } else {
            successText = `成功了。原先${res.data.originalSegCount}段音频已经切割为${res.data.resultSegCount}段音频。`
        }
      this.setState({
        isResultModalOpen: true,
        resultModalText: successText,
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
        <p>{`您是否确定要沿着节拍切割草稿 ${pInfo.draft_name} 里的音频（在音频黄点处切割）？`}</p>
        <p>{"注意："}</p>
        <p>{"1. 建议在剪映中复制草稿作为备份。"}</p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
        <p>{"3. 如果你有多条音频轨道且部分轨道不想切割，你可以点击不想要的轨道左侧的眼睛按钮隐藏此轨道，再重试。对于隐藏的轨道，本软件会忽略它。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoProfessionalCutAudioByBeat();
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
        <p>{`试用版限制只能切割成不超过1000段音频，正式版没有此上限。`}</p>
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
          headerFinePrint={"请点击你想要让沿着节拍切割音频的草稿"}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的切割音频操作"}
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
            <p>{"您是否要撤销刚才的切割音频操作？"}</p>
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
                <strong>沿着节拍切割音频</strong>的功能解释
              </p>
              <p>
                {"由于主功能可让主轨道的图片视频素材对齐按一对一的关系对齐音频，肯定有人想，平时拖拽图片到和节拍黄点对齐，很累赘，能不能做到批量自动对齐呢？此辅助功能因此诞生。此功能可以沿着黄点将音频切割成多段。你先用此功能，再回到主功能让主轨道上的图片视频素材与音频一一对齐。就可以做到啦！"}
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="jianying-stick-to-left-button"
                  src={"./illustration/cut-audio-by-beat-before.png"}
                />
              </p>
              <p>{"准备步骤："}</p>
              <p>{"1. 在剪映中导入一段音乐到时间线。"}</p>
              <p>{"2. 点击中间的旗帜（带AI标识）按钮，点击 踩节拍1 或 踩节拍2，建议是 踩节拍2，因为这样视听效果更有动感。（或者，你可以手动踩点）"}</p>
              <p>{"3. 关闭草稿，来到本软件的此功能页面。"}</p>
              <p>{"(正式步骤) 4. 点击对应的草稿标题，就完成啦。然后你就可以在主轨道上拖入图片视频素材，点击本软件左侧边栏的主功能，进行后续操作。"}</p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="jianying-stick-to-left-button"
                  src={"./illustration/cut-audio-by-beat-after.png"}
                />
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
