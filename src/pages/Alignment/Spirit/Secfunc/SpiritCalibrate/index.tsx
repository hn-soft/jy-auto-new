import React from "react";
import "./styles.css";
import SelectProject from "../../../../../components/SelectProject";
import { Modal, Button } from "antd";
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

export default class SpiritCalibrate extends React.Component<
  PropsType,
  StateType
> {
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
    const res = await window.electronAPI.spiritCalibrateMaterial({
      infoPath: pInfo.draft_json_file,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      const dataObj = JSON.parse(res.data);
      const changedTexts = dataObj.changedTexts;
      const overlappedTexts = dataObj.overlappedTexts;
      let sentenceChanged = '';
      const changedLen = changedTexts.length;
      if (changedLen > 0) {
        sentenceChanged = `以下${changedLen}段字幕发生变动（其余字幕不需要变动），校准了其对应的音频，其内容为:\n${changedTexts.join("; ")}`;
      } else {
        sentenceChanged = '但此次操作其实没有任何字幕有位置和长度的实质性变动。看来一切都好，您不需要使用此功能。';
      }
      let sentenceOverlapped = '';
      const overlappedLen = overlappedTexts.length;
      if (overlappedLen > 0) {
        sentenceOverlapped = `\n此外，值得你关注的是，在校准后有${overlappedLen}段字幕有非自然的重叠，看来你是在没有使用主功能的情况下使用此功能，请检查你是否有先使用主功能。时间线上的重叠可能会引起后续视频编辑的麻烦，您需要打开剪映手动拖拽其长度和位置做调整，以下列出字幕内容供你参考:\n${overlappedTexts.join("; ")}`;
      }
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。${sentenceChanged}${sentenceOverlapped}`,
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
        <p>{`您是否确定要让草稿 ${pInfo.draft_name} 里的字幕面向固定语音校准？`}</p>
        <p>{"注意："}</p>
        <p>{"1. 建议在剪映中复制草稿作为备份。"}</p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
        <p>
          {
            "3. 你需要在使用主功能（语音与固定字幕对齐）之后再来这里进行操作，否则可能出现字幕不自然的重叠。请你务必点击“功能解释”按钮，理解本功能之后再执行操作。"
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
    const res = await window.electronAPI.undoSpiritCalibrateMaterial();
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
        <p>{`试用版限制字幕数量不能超过30段字幕，正式版没有此上限。`}</p>
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
          headerFinePrint={"请点击你想要操作的草稿"}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的校准操作"}
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
            <p>{"您是否要撤销刚才的校准操作？"}</p>
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
                <strong>字幕面向固定语音校准</strong>的功能解释
              </p>
              <p>
                在主功能（语音与固定字幕对齐）里，我们通过变速语音，让语音片段去对齐字幕的位置和时长，如果一切都对齐了，那为什么还有此功能呢？
              </p>
              <p>
                原因：在主功能里，你可能会觉得语音减速后不好听，你愿意牺牲一点画面匹配精准度，来换取语音不剧烈减速。因此你可能选择特殊处理，设置最小允许减速倍数，或者干脆不允许减速。（请注意你这样的操作并不妨碍防重叠的功能，加速才是防重叠的操作，减速是延长语音片段，是否减速都不会重叠。）
              </p>
              <p>如果你做了特殊处理，就会带来一个问题。</p>
              <p>如图：</p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="audio-and-text-not-calibrated"
                  src={"./illustration/time-is-money.png"}
                />
              </p>
              <p>
                {
                  "如果待减速的语音不能向右自由延长到对齐字幕右端，那么在视频播放时，声音就会先结束，而字幕还停留在屏幕上一会儿。（此问题对于加速语音的情况不存在，所以不是所有语音都受影响。）"
                }
              </p>
              <p>这时，本功能（字幕面向固定语音校准）应运而生。</p>
              <p>
                上图的例子在经过本功能操作之后，字幕右端会往左缩，缩到对齐语音，而语音保持位置不变，也不变速。所以本功能是以语音为固定标准，通过改变字幕而实现对齐，这个特性与主功能是截然相反的。
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="audio-and-text-calibrated"
                  src={"./illustration/time-is-money-calibrated.png"}
                />
              </p>
              <p>
                {
                  "你应该在主功能对齐操作完成之后，再来本功能执行操作。如果没有经过主功能而执行此操作，那么如果语音片段本身就是散落多个轨道的重叠状态，则字幕可能会出现非自然的重叠状态而造成后续视频编辑的麻烦。但是如果你的语音本身是不重叠的，你对此很有把握，那你可以直接执行本功能以达到所有字幕去对齐语音。请记住：本功能会让字幕挪动，去匹配语音片段，以语音片段为固定标准，语音片段的位置和长度不会发生改变。你在执行此操作时，也跟主功能一样，建议你的字幕数量和语音片段数量保持一致，如果有背景音乐，请点击背景音乐轨道左侧的眼睛按钮隐藏轨道。"
                }
              </p>
              {this.state.activationStatus.status === "trial" ? (
                <p>
                  {
                    "最后，如本例中字幕文字内容——“时间就是生命，效率就是金钱”，本软件竭诚为你节约视频创作时间，相当于是为你节约了宝贵的财富。如果试用满意，请付费激活本软件支持一下辛勤开发和制作教程的作者吧~🙏🙏🙏"
                  }
                </p>
              ) : null}
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
