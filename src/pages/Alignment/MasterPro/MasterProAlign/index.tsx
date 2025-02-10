import React from "react";
import "./styles.css";
import SelectProject from "../../../../components/SelectProject";
import { Modal, Button, Row, Radio, InputNumber, Slider, Select } from "antd";
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
  adsp: number;
  gapSetting: string;
  airChangeSetting: string;
  airChangeDuration: number;
  talkMuteFadeDuration: number;
  muteSetting: string;
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

const PRO_GAP_SETTING = {
  KEEP_ORI_GAP: "keep_ori_gap",
  ALL_REMOVE: "all_remove",
  ALL_REMOVE_EXCEPT_START_END: "all_remove_except_start_end",
};

const MUTE_SETTING = {
  YES_MUTE: "yes_mute",
  NO_MUTE: "no_mute",
  TALK_MUTE: "talk_mute",
};

const AIR_CHANGE_SETTING = {
  YES_AIR_CHANGE: "yes_air_change",
  NO_AIR_CHANGE: "no_air_change",
};

export default class MasterProAlign extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      adsp: 1,
      gapSetting: PRO_GAP_SETTING.KEEP_ORI_GAP,
      muteSetting: MUTE_SETTING.TALK_MUTE,
      airChangeSetting: AIR_CHANGE_SETTING.NO_AIR_CHANGE,
      airChangeDuration: 0,
      talkMuteFadeDuration: 5,
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
    const res = await window.electronAPI.masterProAlignMaterial({
      infoPath: pInfo.draft_json_file,
      adsp: this.state.adsp,
      gapSetting: this.state.gapSetting,
      muteSetting: this.state.muteSetting,
      airChangeSetting: this.state.airChangeSetting,
      airChangeDuration: this.state.airChangeDuration,
      talkMuteFadeDuration: this.state.talkMuteFadeDuration,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      const dataObj = JSON.parse(res.data);
      const tegCount = dataObj.tegCount;
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。已经为你对齐了${tegCount}组字幕与语音，并让他们对齐视频画面。`,
        showUndoBtn: true,
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    let gapSentence = "";
    switch (this.state.gapSetting) {
      case PRO_GAP_SETTING.KEEP_ORI_GAP:
        gapSentence = "原有的或长或短的间隙是有意义的，需要保留";
        break;
      case PRO_GAP_SETTING.ALL_REMOVE:
        gapSentence = "将原有的间隙都完全删减掉，使得语音念出来一气呵成";
        break;
      case PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END:
        gapSentence =
          "将原有中间的间隙删减掉，使得语音念出来一气呵成，但保留开头和结尾的无语音片段";
        break;
    }
    return (
      <div>
        <p>{`你是否确定要让草稿 ${pInfo.draft_name} 里的音频与字幕对齐？`}</p>
        <p>
          {`你希望音频变速倍数为${this.state.adsp.toFixed(2)}倍。`}
          {`你${
            this.state.muteSetting === MUTE_SETTING.NO_MUTE ? "不" : ""
          }希望在操作后让原视频静音。`}
          {`关于或长或短的无语音的间隙，你的设置是：${gapSentence}。`}
          {[
            PRO_GAP_SETTING.ALL_REMOVE,
            PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END,
          ].includes(this.state.gapSetting) &&
          this.state.airChangeSetting === AIR_CHANGE_SETTING.YES_AIR_CHANGE
            ? `不过，你希望删除间隙后仍保留${this.state.airChangeDuration.toFixed(
                1
              )}秒的短暂换气停顿。`
            : null}
        </p>
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{`2. 本操作会对齐语音+字幕+视频画面，为了达到这三者的对齐，本操作（对齐大师Pro）会修改视频。如果你只想修改字幕和语音而不改动视频，你可以考虑使用左侧的附赠功能里的对齐大师(非Pro)或对齐精灵功能。`}</p>
        <p>{"3. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoMasterProAlignMaterial();
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
    const adspOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ paddingBottom: 10 }}
          >
            {`你想要语音朗读得多快？`}
          </span>
        </Row>
        <Row>
          <InputNumber
            addonBefore={"音频变速倍数:"}
            addonAfter={"x"}
            min={0.5}
            max={2.5}
            style={{ width: "215px" }}
            step={0.01}
            value={this.state.adsp}
            onChange={(value: number | null) => {
              this.setState({
                adsp: typeof value === "number" ? value : 1,
              });
            }}
          />
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
            min={0.5}
            max={2.5}
            onChange={(value: number) => {
              this.setState({ adsp: value });
            }}
            value={this.state.adsp}
            step={0.01}
            tooltip={{
              formatter: (value: number | undefined) => {
                if (value === undefined) {
                  return "";
                }
                return `${value.toFixed(2)}x`;
              },
            }}
          />
        </Row>
      </>
    );
    const gapOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {`在视频里，可能有或长或短的间隙是没有语音的（没有语音的定义就是没有字幕，所以你如果删除了某一句字幕，该字幕原有区域就算是没有语音的间隙，但这些间隙并不意味着实际上完全无声，也可能有环境杂音原声或不需要朗读的区域）。你想要如何处理没有语音的间隙？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const gapSetting = e.target.value;
              this.setState({ gapSetting });
            }}
            value={this.state.gapSetting}
          >
            <Radio value={PRO_GAP_SETTING.KEEP_ORI_GAP}>
              <span className="setting-text-span">
                原有的或长或短的间隙是有意义的，需要保留
              </span>
            </Radio>
            <Radio value={PRO_GAP_SETTING.ALL_REMOVE}>
              <span className="setting-text-span">
                将原有的间隙都完全删减掉，使得语音念出来一气呵成
              </span>
            </Radio>
            <Radio value={PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END}>
              <span className="setting-text-span">
                将原有中间的间隙删减掉，使得语音念出来一气呵成，但保留开头和结尾的无语音片段
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const airChangeOption = [
      PRO_GAP_SETTING.ALL_REMOVE,
      PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END,
    ].includes(this.state.gapSetting) ? (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {`【补充设置】你设置了将间隙删减掉，默认将让语音紧密排列，请问是否需要额外在各语音片段之间留出零点几秒的短暂换气停顿，使得一气呵成的语音显得舒缓？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const airChangeSetting = e.target.value;
              this.setState({ airChangeSetting });
            }}
            value={this.state.airChangeSetting}
          >
            <Radio value={AIR_CHANGE_SETTING.NO_AIR_CHANGE}>
              <span className="setting-text-span">
                否，不需要短暂换气停顿。
              </span>
            </Radio>
            <Radio value={AIR_CHANGE_SETTING.YES_AIR_CHANGE}>
              <span className="setting-text-span">
                是，我将自己设置小于1秒的换气停顿。
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    ) : null;
    const airChangeDurationOption =
      [
        PRO_GAP_SETTING.ALL_REMOVE,
        PRO_GAP_SETTING.ALL_REMOVE_EXCEPT_START_END,
      ].includes(this.state.gapSetting) &&
      this.state.airChangeSetting === AIR_CHANGE_SETTING.YES_AIR_CHANGE ? (
        <>
          <Row>
            <span
              className="align-master-setting-enabled-title"
              style={{ paddingBottom: 10 }}
            >
              {`你想要多长时间的换气停顿？`}
            </span>
          </Row>
          <Row>
            <InputNumber
              addonBefore={"换气停顿时长:"}
              addonAfter={"s"}
              min={0}
              max={0.9}
              style={{ width: "215px" }}
              step={0.1}
              value={this.state.airChangeDuration}
              onChange={(value: number | null) => {
                this.setState({
                  airChangeDuration: typeof value === "number" ? value : 0,
                });
              }}
            />
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
              min={0}
              max={0.9}
              onChange={(value: number) => {
                this.setState({ airChangeDuration: value });
              }}
              value={this.state.airChangeDuration}
              step={0.1}
              tooltip={{
                formatter: (value: number | undefined) => {
                  if (value === undefined) {
                    return "";
                  }
                  return `${value.toFixed(1)}x`;
                },
              }}
            />
          </Row>
        </>
      ) : null;
    const muteOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {`你是否想要让原视频静音？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const muteSetting = e.target.value;
              this.setState({ muteSetting });
            }}
            value={this.state.muteSetting}
          >
            <Radio value={MUTE_SETTING.TALK_MUTE}>
              <span className="setting-text-span">
                {"解说模式(仅保留无配音解说时的原声，带淡入淡出"}
              </span>
              <span
                className="setting-text-span"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
              <Select
                defaultValue="5"
                onChange={(value: string) => {
                  const valNum = parseFloat(value);
                  this.setState({
                    talkMuteFadeDuration: valNum,
                  });
                }}
                options={[
                  { value: "0", label: "0s" },
                  { value: "1", label: "1s" },
                  { value: "2", label: "2s" },
                  { value: "3", label: "3s" },
                  { value: "4", label: "4s" },
                  { value: "5", label: "5s" },
                  { value: "6", label: "6s" },
                  { value: "7", label: "7s" },
                  { value: "8", label: "8s" },
                ]}
              />
              </span>
              <span className="setting-text-span">
                {")"}
              </span>
            </Radio>
            <Radio value={MUTE_SETTING.YES_MUTE}>
              <span className="setting-text-span">静音原视频</span>
            </Radio>
            <Radio value={MUTE_SETTING.NO_MUTE}>
              <span className="setting-text-span">保留原视频声音</span>
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
        {adspOption}
        {muteOption}
        {gapOption}
        {airChangeOption}
        {airChangeDurationOption}
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
                  href="https://www.bilibili.com/video/BV13C4y1F71v/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {"视频教程（虽然视频里介绍的软件和本软件名不一样，但内容是一样的。剪映自动化大师是集成各功能的软件，以后新的离线编辑功能都加在剪映自动化大师里。）"}
                </a>
              </p>
              <p>{"本功能可以实现语音+字幕+视频画面三者的对齐"}</p>
              <p>{"之前步骤1和步骤2的使用方法："}</p>
              <p>{"1. 导入一段视频到剪映中，并拖动到视频主轨道。"}</p>
              <p>{`2. 右键点击视频-识别字幕/歌词，或者导入srt字幕文件，得到橙色文本框字幕。`}</p>
              <p>{`3. 如果你想要翻译字幕，请仔细阅读步骤1的提示，得到对应的目标语言橙色文本框字幕。`}</p>
              <p>{`4. 获取语音，如果你要用剪映内置的AI语音音色，点击右上角的朗读按钮，跳过左侧的步骤2，直接来到步骤3（此步骤）；如果你要在外界配音，你会得到一个长的音频文件，需要通过步骤2切割到段落数和字幕一样多，才可以来到步骤3（此步骤）。`}</p>
              <p>{`来到此步骤，该页面，即步骤3，是完成最后的三者对齐操作的步骤。`}</p>
              <p>{"5. 关闭剪映草稿。"}</p>
              <p>
                {
                  "6. 完成下方设置（小提示：你可以通过提高音频倍速来缩短总视频时长，因为总视频时长受制于音频播放速度。）"
                }
              </p>
              <p>{"7. 点击需要对齐的草稿。"}</p>
              <p>
                {
                  "8. 完成了。如果你对结果不满意，可以点此页面右下角撤销按钮，然后修改设置选项，再试一次。"
                }
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
