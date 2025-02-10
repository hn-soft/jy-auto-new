import React from "react";
import "./styles.css";
import SelectProject from "../../../../components/SelectProject";
import { Modal, Button, Row, Input, Progress, Select, Slider } from "antd";
import { IS_EN } from "../../../../utils/const";
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
const { TextArea } = Input;

type PropsType = {};

type StateType = {
  pureTextContents: string[];
  pauseMarkup: string;
  displayPauseMarkupInput: boolean;
  isMsAudioPrepared: boolean;
  sildur: number; // 单位是秒。
  stripSilence: number; // 在移除2s的沉默之后，左右边缘应该留下一些，这是单侧的值。单位是秒。
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
  isProgressModalOpen: boolean;
  progressFraction: number;
  progressIndication: string;
};
export default class MasterProAlign extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      pureTextContents: [],
      pauseMarkup: `<break time="2s"/>`,
      displayPauseMarkupInput: false,
      isMsAudioPrepared: false,
      sildur: 2,
      stripSilence: 0,
      isResultModalOpen: false,
      resultModalText: "",
      showUndoBtn: false,
      isUndoConfirmModalOpen: false,
      isExplanationModalOpen: false,
      activationStatus: {
        status: "",
        gt: 0,
      },
      isProgressModalOpen: false,
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

  handleClickCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    this.setState({
      isResultModalOpen: true,
      resultModalText: `字幕文本已经复制到您的剪切板。请在外界配音之后，将音频文件拖入剪映草稿时间线（如果太长你可以分多段配音，得到多个音频文件后按顺序拖入剪映草稿），然后关闭草稿，来到本页面，点击下方对应草稿。`,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    this.setState({
      isProgressModalOpen: true,
    });
    // @ts-ignore
    const res = await window.electronAPI.cutMsAudio({
      infoPath: pInfo.draft_json_file,
      sildur: this.state.sildur,
      stripSilence: this.state.stripSilence,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0,
        resultModalText: `成功了。已经成功将${res.data.longAegCount}段长音频分割为${res.data.tegCount}段语音片段（与字幕段落数相同）。现在，你可以打开剪映草稿看看，做细节调整，然后，关闭草稿，再前往 3.语音字幕画面共同对齐。`,
        showUndoBtn: true,
      });
    }
  };

  handleSelectProjectForScripts = async (pInfo: PInfoType) => {
    // @ts-ignore
    const res = await window.electronAPI.extractPureTextContents({
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
        pureTextContents: res.data,
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
        <p>{`你是否确定要让草稿 ${pInfo.draft_name} 里的音频被切断到和字幕段落数一致？`}</p>
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
    const res = await window.electronAPI.undoCutMsAudio();
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
        <p>{`试用版和正式版在分割音频时均对段落数和时长没有上限。但如果您使用的是试用版，仍建议您选取较短的音频，因为试用版在对齐时有上限限制。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  renderCutOptions = () => {
    const sildurOption = (
      <>
        <Row style={{ paddingBottom: 10 }}>
          <span className="align-master-setting-enabled-title">
            {`如果你已经将配音得到的音频导入到剪映草稿时间线，并且试听音频，确认真的有`}
          </span>
          <Select
            defaultValue="2"
            style={{ width: 220, display: "inline" }}
            onChange={(value: string) => {
              const valNum = parseFloat(value);
              this.setState({
                sildur: valNum,
              });
            }}
            options={[
              { value: "1", label: "1s" },
              { value: "1.5", label: "1.5s" },
              { value: "2", label: "2s（默认值，一般不改动）" },
              { value: "2.5", label: "2.5s" },
              { value: "3", label: "3s" },
              { value: "3.5", label: "3.5s" },
              { value: "4", label: "4s" },
              { value: "4.5", label: "4.5s" },
              { value: "5", label: "5s" },
              { value: "5.5", label: "5.5s" },
              { value: "6", label: "6s" },
            ]}
          />
          <span className="align-master-setting-enabled-title">
            {
              "的长停顿穿插在各字幕片段之间，那么请你完成下方设置后，点击下方对应的草稿标题，进行长音频分割。如果你在配音时分两部分进行，你可以导入两个长音频到同一条音频轨道。在分割时，音频总分割段落数会跟此草稿中的字幕段落数保持一致。"
            }
          </span>
        </Row>
      </>
    );
    const stripSilenceOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {`【设置】你希望语音从一句读到下一句的感觉是紧凑的还是舒缓的，往左拉更紧凑，往右拉更舒缓？`}
            <span style={{ color: "gray" }}>
              {
                "（这个设置的意义就是，当本功能把长停顿摘除后，可以在左右边缘留下一点点时长，使得一句话歇息一小会儿短停顿再到下一句。越往右拉，留下的短停顿越长。如果你觉得还是不够长，可以在主功能对齐时额外叠加设置更长间隙。您可以先保持默认0，观察草稿效果后再做调整。）"
              }
            </span>
          </span>
        </Row>
        <Row>
          <Slider
            style={{ width: "100%" }}
            trackStyle={{
              backgroundColor: "#1960d9",
              height: "4px",
              borderRadius: "2px",
            }}
            railStyle={{
              backgroundColor: "gray",
              height: "4px",
              borderRadius: "2px",
            }}
            min={-3}
            max={3}
            onChange={(value: number) => {
              this.setState({ stripSilence: value });
            }}
            value={this.state.stripSilence}
            step={0.05}
            tooltip={{
              formatter: (value: number | undefined) => {
                if (value === undefined) {
                  return "";
                }
                return `${value.toFixed(2)}s`;
              },
            }}
          />
        </Row>
      </>
    );
    return (
      <div className="align-master-setting-whole-wrapper">
        {sildurOption}
        {stripSilenceOption}
      </div>
    );
  };

  renderTextArea = () => {
    const { pureTextContents, pauseMarkup, displayPauseMarkupInput } =
      this.state;
    if (pureTextContents.length === 0) {
      return null;
    }
    let displayedContent = "";
    for (let i = 0; i < pureTextContents.length; i++) {
      const textLine = pureTextContents[i];
      if (i !== 0) {
        displayedContent = `${displayedContent}\r\n${pauseMarkup}\r\n${textLine}`;
      } else {
        displayedContent = `${textLine}`;
      }
    }
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"字幕文本"}</span>
        </Row>
        <TextArea
          style={{ height: 150, marginTop: 5, marginBottom: 15 }}
          value={displayedContent}
        ></TextArea>
        <Button
          type="primary"
          style={{ marginRight: 10, marginBottom: 15 }}
          onClick={() => {
            this.handleClickCopy(displayedContent);
          }}
        >
          {"复制字幕文本，然后到外界配音"}
        </Button>
        <Button
          type="default"
          style={{ marginBottom: 15 }}
          onClick={() => {
            this.setState({
              displayPauseMarkupInput: !displayPauseMarkupInput,
            });
          }}
        >
          {"修改停顿标记词（如果你的配音软件另有停顿标记词，点此修改）"}
        </Button>
        {displayPauseMarkupInput ? (
          <Input
            value={this.state.pauseMarkup}
            style={{ marginBottom: 20 }}
            onChange={(e: any) => {
              console.log(e);
              this.setState({ pauseMarkup: e.target.value });
            }}
          />
        ) : null}
        <div
          className="align-master-setting-enabled-title"
          style={{ marginBottom: 15 }}
        >
          {`如果你的外界配音软件是通过功能菜单添加停顿标记的方式做到停顿效果（如魔音工坊），那么你就不需要 <break time="2s"/> 这样的标记词穿插其间。请点击红色按钮复制纯字幕文本↓↓↓`}
        </div>
        <Button
          type="primary"
          danger
          style={{ marginBottom: 15 }}
          onClick={() => {
            const { pureTextContents } = this.state;
            let toCopyWithoutBreak = "";
            for (let i = 0; i < pureTextContents.length; i++) {
              const textLine = pureTextContents[i];
              if (i !== 0) {
                toCopyWithoutBreak = `${toCopyWithoutBreak}\r\n\r\n${textLine}`;
              } else {
                toCopyWithoutBreak = `${textLine}`;
              }
            }
            this.handleClickCopy(toCopyWithoutBreak);
          }}
        >
          {"去除停顿标记词，直接复制纯字幕文本，然后到外界配音"}
        </Button>
        <div
          className="align-master-setting-enabled-title"
          style={{ marginBottom: 15 }}
        >
          {
            "↓↓↓如果你已经完成配音并且把长音频导入到剪映草稿时间线，请你点击下面这个按钮，然后卷动到最下方点击对应草稿标题。↓↓↓"
          }
        </div>
        <Button
          type="primary"
          size="large"
          style={{ marginBottom: 10 }}
          onClick={() => {
            this.setState({ isMsAudioPrepared: true });
          }}
        >
          {"准备好可以分割长音频了（点后向下卷）"}
        </Button>
      </div>
    );
  };

  render() {
    return (
      <div>
        {this.renderTrialIndication()}
        <div className={"usage-words"}>
          {
            "如果你的配音是剪映或CapCut自带的AI语音，那你就不需要本步骤。请直接从 1.字幕翻译 跳到 3.语音字幕画面共同对齐。如果你的配音是外界来源，那你需要本功能，请点击 功能解释 按钮了解详情。"
          }
        </div>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            this.setState({
              isExplanationModalOpen: true,
            });
          }}
          style={{ marginTop: 1, marginLeft: 20 }}
        >
          {"功能解释"}
        </Button>
        <SelectProject
          onSelectProject={this.handleSelectProjectForScripts}
          renderConfirmContentComp={() => {}}
          headerFinePrint={"首先：请点击您要提取字幕文本的草稿"}
          skipConfirm
          hideProjectSourceSelect={IS_EN}
        />
        {this.renderTextArea()}
        {this.state.isMsAudioPrepared ? (
          <>
            {this.renderCutOptions()}
            <SelectProject
              onSelectProject={this.handleSelectProject}
              renderConfirmContentComp={this.renderConfirmContentComp}
              headerFinePrint={
                "最后一步：请点击您要分割长音频的草稿（应与第一步选择相同）"
              }
              hideProjectSourceSelect={IS_EN}
            />
          </>
        ) : null}
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的分割操作"}
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
            <p>{"您是否要撤销刚才的分割操作？"}</p>
            <p>
              {
                "请注意：务必在剪映中关闭对应的草稿后再点击“确定”按钮，否则无法成功撤销。"
              }
            </p>
          </Modal>
        ) : null}
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
                <strong>提取字幕+分割长音频</strong>的功能解释
              </p>
              <p>
                <strong>
                  {
                    "如果你的配音是剪映或CapCut自带的AI语音，那你就不需要本步骤。请直接从第1步字幕翻译跳到第3步语音字幕画面共同对齐。"
                  }
                </strong>
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="text-gap-filler-demo"
                  src={"./illustration/cut-ms-audio-before.png"}
                />
              </p>
              <p>
                {
                  "分割长视频功能的用途：您可能在外界来源配音，而非使用剪映(或CapCut)内置的AI语音，那么你会得到一段长音频，而不是一句字幕一段音频。可是第3步的对齐方式要求是一段字幕一段语音的一一匹配关系，并不适用于长音频。那么怎么解决呢？"
                }
              </p>
              <p>
                {
                  "繁琐的方法是：您在剪映草稿中找到停顿点，按Ctrl+B，手动分割长音频，使得音频段落数和字幕段落数一致。"
                }
              </p>
              <p>
                {
                  "简便的方法是：使用此页面本功能，为您自动分割长音频，使得音频段落数和字幕一致，然后，你就可以使用左侧第3步的对齐了。"
                }
              </p>
              <p>
                <img
                  style={{ width: "100%" }}
                  alt="jianying-stick-to-left-button"
                  src={"./illustration/cut-ms-audio-after.png"}
                />
              </p>
              <p>
                {`具体使用方法：先点击草稿标题，获取字幕文本（本功能会为您添加停顿标记词，让不同段落间有较长的停顿，比如2s，这个长停顿非常重要，可以帮助接下来本软件识别分割点），如果你的配音软件在停顿时的标记词和本软件的 <break time="2s"/> 不一致，比如有的配音软件用的是 [2 second pause]，你也可以在你的配音软件中手动添加停顿标记，去指引配音时在字幕之间留下1s到5s的停顿（建议2s），如果你准备在配音软件中通过功能菜单添加停顿的方式做到停顿，那么，请你点击红色按钮，你不需要有 <break time="2s"/> 这样的标记词穿插其间。所有配音软件都可以添加停顿，请仔细寻找功能。在外界配音后，导入剪映草稿，可以有一段或多段长音频文件（如果内容过长，你的配音软件不允许，你就会得到多段），放置在草稿时间线上同一条音频轨道，然后回到本页面，点击"准备好可以分割长音频了"，再完成语气舒缓程度的设置（一般保持默认即可），点击最下方的草稿标题，进行分割。完成后您就可以去到左侧 3.语音字幕画面共同对齐 去进行对齐了。`}
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
