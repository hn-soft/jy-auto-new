import React from "react";
import "./styles.css";
import SelectProject from "../../../../components/SelectProject";
import { Modal, Button, Row, Radio, Select } from "antd";
import type { RadioChangeEvent } from "antd";
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
type PropsType = {};

type StateType = {
  needMergeTracks: boolean;
  lowestSpeedChoice: "normal" | "min-1" | "min-user-defined"; // 0 is no need, 1 is for 1.0x min, 2 is for user defined.
  lowestSpeedAllowed: number; // meaningful only when lowestSpeedChoice equals to 2.
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

export default class SpiritAlign extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      needMergeTracks: true,
      lowestSpeedChoice: "normal",
      lowestSpeedAllowed: 0.95,
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
    const res = await window.electronAPI.spiritAlignMaterial({
      infoPath: pInfo.draft_json_file,
      needMergeTracks: this.state.needMergeTracks,
      lowestSpeedChoice: this.state.lowestSpeedChoice,
      lowestSpeedAllowed: this.state.lowestSpeedAllowed,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      const dataObj = JSON.parse(res.data);
      const {
        textCount,
        audioCount,
        successTextCount,
        failedTextCount,
        failedTextContents,
      } = dataObj;
      const generalWord = `您要通过变速挪动调整${audioCount}段音频，向${textCount}段（保持位置不变的）字幕对齐，现在已经执行完成，为您节约了宝贵的时间，您可以打开剪映看看效果。`;
      let failedAllInfo = "";
      if (failedTextCount > 0) {
        const failInfo = `其中${successTextCount}段字幕得到音频匹配，而${failedTextCount}段字幕匹配不到音频，这不是本软件的错误引起的。`;
        let failInfo2 = "";
        if (textCount !== audioCount) {
          failInfo2 = `之所以有部分匹配不到的情况，很可能是您的草稿中音频和字幕数量不一样引起，请您仔细检查。如果您有部分音频无需匹配（比如冗余长原声或背景音乐），请您点击这个不需要的音频轨道左侧的喇叭按钮静音，对于被静音的轨道，本软件会视而不见，不会挪动变速它。另外，在数量不一致的情况下，如果您的目标音频距离对应的字幕太远，本软件可能无法得知匹配关系。请你将未被匹配的音频手动挪动未被匹配的字幕靠近的位置，最好左端对齐，关闭草稿，再来本软件重新执行一遍对齐操作。`;
        }
        let failInfo3 = "";
        if (failedTextContents.length > 0) {
          const failedTextPrintableContents = failedTextContents.map(
            (content: any, index: any) => `${index + 1}. ${content}`
          );
          failInfo3 = `以下列出未得到音频匹配的${
            failedTextContents.length
          }段字幕的内容供您参考:\n${failedTextPrintableContents.join("; ")}`;
        }
        failedAllInfo = `${failInfo}${failInfo2}${failInfo3}`;
      }
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。${generalWord}${failedAllInfo}`,
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
        <p>{`您是否确定要让草稿 ${pInfo.draft_name} 里的音频与字幕对齐？`}</p>
        <p>{`你希望音频变速后${this.state.needMergeTracks ? "都合并到同一条轨道" : "留在各自的原轨道"}。`}</p>
        {this.state.lowestSpeedChoice === "min-1" ? <p>{"你希望语音只做加速处理，跳过减速处理。"}</p> : null}
        {this.state.lowestSpeedChoice === "min-user-defined" ? <p>{`你希望语音最低变速倍数为${this.state.lowestSpeedAllowed.toFixed(2)}倍，即本需要更低变速倍数的语音会变速${this.state.lowestSpeedAllowed.toFixed(2)}倍。`}</p> : null}
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{`2. 本操作是通过音频变速改变音频的长度来对齐，字幕的位置和长度不改变。字幕是固定不动的被对齐的标准。如果您需要字幕去适应音频，那么有两种情况，如果你想让音频片段以同一种速率一气呵成念出来，不需要精确匹配画面，请使用对齐大师；如果你在匀速率念稿的基础上需要改变视频画面去适应语音字幕，请使用对齐大师Pro。`}</p>
        <p>{"3. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoSpiritAlignMaterial();
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
        <p>{`试用版限制只能为不超过30组的语音和字幕提供对齐，正式版没有此上限。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  renderAlignOptions = () => {
    const postOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你想要把对齐之后的音频放置在哪里？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const needMergeTracks = e.target.value === "merge";
              this.setState({ needMergeTracks });
            }}
            value={this.state.needMergeTracks ? "merge" : "original"}
          >
            <Radio value={"merge"}>
              <span className="setting-text-span">{"都合并到同一条轨道"}</span>
            </Radio>
            <Radio value={"original"}>
              <span className="setting-text-span">{"留在各自的原轨道"}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const lowestSpeedOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你是否想对需要减速的语音片段做特殊处理？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const lowestSpeedChoice = e.target.value;
              this.setState({ lowestSpeedChoice });
            }}
            value={this.state.lowestSpeedChoice}
          >
            <Radio value={"normal"}>
              <span className="setting-text-span">
                {"按照默认做法，不做特殊处理，就按照字幕长度决定语音倍速"}
              </span>
            </Radio>
            <Radio value={"min-1"}>
              <span className="setting-text-span">
                {"不对语音进行减速（即不延长语音片段到对齐字幕右端），只做加速防重叠"}
              </span>
            </Radio>
            <Radio value={"min-user-defined"}>
              <span className="setting-text-span">
                {"可让语音稍微减速，但不想要减速太多，所以自行设置最小允许值"}
              </span>
            </Radio>
          </Radio.Group>
        </Row>
        {this.state.lowestSpeedChoice === "min-user-defined" ? (
          <Row className="option-row">
            <span className="setting-text-span vertical-center">
              请设置你允许的最小变速倍数值：
            </span>
            <Select
              defaultValue="0.95"
              style={{ width: 90 }}
              onChange={(value: string) => {
                const valNum = parseFloat(value);
                this.setState({
                  lowestSpeedAllowed: valNum,
                });
              }}
              options={[
                { value: "0.95", label: "0.95" },
                { value: "0.90", label: "0.90" },
                { value: "0.85", label: "0.85" },
                { value: "0.80", label: "0.80" },
                { value: "0.75", label: "0.75" },
                { value: "0.70", label: "0.70" },
                { value: "0.65", label: "0.65" },
                { value: "0.60", label: "0.60" },
                { value: "0.55", label: "0.55" },
                { value: "0.50", label: "0.50" },
                { value: "0.45", label: "0.45" },
                { value: "0.40", label: "0.40" },
                { value: "0.35", label: "0.35" },
                { value: "0.30", label: "0.30" },
                { value: "0.25", label: "0.25" },
                { value: "0.20", label: "0.20" },
                { value: "0.15", label: "0.15" },
                { value: "0.10", label: "0.10" },
                { value: "0.05", label: "0.05" },
              ]}
            />
            <span className="setting-text-span vertical-center">&nbsp;倍</span>
          </Row>
        ) : null}
      </>
    );
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"设置"}</span>
        </Row>
        {postOption}
        {lowestSpeedOption}
        {this.state.lowestSpeedChoice !== "normal" ? (
          <Row>
            <span className="indication">{`提醒：${
              this.state.lowestSpeedChoice === "min-user-defined"
                ? `本来需要变速倍数小于${this.state.lowestSpeedAllowed.toFixed(
                    2
                  )}倍的那些语音片段会执行${this.state.lowestSpeedAllowed.toFixed(
                    2
                  )}倍变速。`
                : ""
            }${
              this.state.lowestSpeedChoice === "min-1" ? "" : "部分"
            }本来需要减速的语音片段${
              this.state.lowestSpeedChoice === "min-1" ? "" : "可能"
            }会因为你${
              this.state.lowestSpeedChoice === "min-1"
                ? "不减速"
                : `最小变速${this.state.lowestSpeedAllowed.toFixed(2)}倍`
            }的设置而导致语音片段右侧与字幕对不齐。这是正常的现象，但如果你还是想要改变字幕长度去对齐，你可以在【本页面的对齐操作完成后】点左侧菜单"次要功能辅助-字幕面向固定语音校准"解决遗留的需要对齐的问题。`}</span>
          </Row>
        ) : ""}
      </div>
    );
  };

  render() {
    return (
      <div>
        {this.renderTrialIndication()}
        <Button
          style={{ marginTop: 20, marginBottom: 5, marginLeft: 16 }}
          type="primary"
          size="large"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            this.setState({
              isExplanationModalOpen: true,
            });
          }}
        >
          {"功能解释"}
        </Button>
        {this.renderAlignOptions()}
        <SelectProject
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={""}
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的对齐操作"}
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
              <p>
                <a
                  href="https://www.bilibili.com/video/BV1p94y1674o/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {"旧视频教程（里面的设置选项还未有最低倍数，不过仍有参考意义）"}
                </a>
              </p>
              <p>{"本功能可以实现语音+字幕二者的对齐，对齐方式是保持字幕不变，通过加减速语音片段去达成对齐，防止语音重叠。其缺点是语音加减速听起来会有可能不适，如果你是一门语言翻译成另一门语言导致对不齐，不建议你使用对齐精灵功能，你应该使用左侧的对齐大师Pro功能。如果你不在意视频画面是否对齐，而是文稿类的专注于字幕和语音的对齐，先有字幕和语音的情况，那么你应该使用对齐大师(非Pro)功能，当且仅当你的视频内容很敏感，不能切割加减速时，才使用本功能。本功能是各对齐功能里使用频率最低的功能。但是其次要功能辅助可以用语音为依据，挪动字幕去对齐语音，仍然在一些情境下很有用处。"}</p>
              <p>{"1. 请确保你的剪映草稿里包含橙色字幕文本框和语音片段（绿色AI语音片段和蓝色普通语音片段皆可）。音频片段的数量应该与文本片段数量一致。如果你的语音是外来的合成的长片段，你需要先切割成小段，再使用本功能。"}</p>
              <p>{"2. 如果有任何语音片段与字幕无关，如背景音乐，请点击轨道左侧的按钮锁定它或静音它。本软件会对锁定的或静音的轨道视而不见。"}</p>
              <p>{"3. 关闭剪映草稿。"}</p>
              <p>{"4. 完成本页面的设置。"}</p>
              <p>{"5. 点击需要对齐的草稿。"}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
