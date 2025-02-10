import React from "react";
import "./styles.css";
import SelectProject from "../../../components/SelectProject";
import {
  Modal,
  Button,
  InputNumber,
  Slider,
  Row,
  Radio,
} from "antd";
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
  speedSetting: string;
  speedRatio: number;
  gapSetting: string;
  gapTime: number;
  alignMode: string;
  isResultModalOpen: boolean;
  resultModalText: string;
  showUndoBtn: boolean;
  isUndoConfirmModalOpen: boolean;
  isExplanationModalOpen: boolean;
  explanationRenderer: () => any;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
};

const SPEED_SETTING = {
  NO_CHANGE: "no_change",
  YES_CHANGE_DEFINED: "yes-change-defined",
  YES_CHANGE_TO_VIDEO: "yes-change-to-video",
};

const GAP_SETTING = {
  NO_CHANGE: "no_change",
  YES_CHANGE: "yes_change",
};

const ALIGN_MODE = {
  EXACT_MATCH: "exact_match",
  ORDER_MATCH: "order_match",
};

export default class Master extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      speedSetting: SPEED_SETTING.NO_CHANGE,
      speedRatio: 1,
      gapSetting: GAP_SETTING.NO_CHANGE,
      gapTime: 0,
      alignMode: ALIGN_MODE.EXACT_MATCH,
      isResultModalOpen: false,
      resultModalText: "",
      showUndoBtn: false,
      isUndoConfirmModalOpen: false,
      isExplanationModalOpen: false,
      explanationRenderer: () => {},
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

  handleChangeSpeedRatio = (value: number | null) => {
    if (value == null) {
      return;
    }
    if (isNaN(value)) {
      return;
    }
    this.setState({
      speedRatio: value,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    // @ts-ignore
    const res = await window.electronAPI.masterAlignMaterial({
      infoPath: pInfo.draft_json_file,
      isChangeSpeed: this.state.speedSetting !== SPEED_SETTING.NO_CHANGE,
      speedRatio: this.state.speedRatio,
      isChangeSpeedAuto: this.state.speedSetting === SPEED_SETTING.YES_CHANGE_TO_VIDEO,
      isChangeGap: this.state.gapSetting === GAP_SETTING.YES_CHANGE,
      gapTime: this.state.gapTime,
      isOrderMode: this.state.alignMode === ALIGN_MODE.ORDER_MATCH,
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
        resultModalText: `成功对齐了${res.data}组字幕和AI语音，为您节约了宝贵的时间。您可以用剪映软件打开该草稿继续创作啦！`,
        showUndoBtn: true,
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    let isChangeSpeedWord = "";
    switch (this.state.speedSetting) {
      case SPEED_SETTING.NO_CHANGE:
        isChangeSpeedWord = "不调整音频倍速";
        break;
      case SPEED_SETTING.YES_CHANGE_DEFINED:
        isChangeSpeedWord = `音频变速为${this.state.speedRatio.toFixed(2)}倍`;
        break;
      case SPEED_SETTING.YES_CHANGE_TO_VIDEO:
        isChangeSpeedWord = `音频根据视频长度变速`;
        break;
    }
    let gapWord = "";
    switch (this.state.gapSetting) {
      case GAP_SETTING.NO_CHANGE:
        gapWord = "语音片段之间不留间隙";
        break;
      case GAP_SETTING.YES_CHANGE:
        gapWord = `语音片段间隙为${this.state.gapTime.toFixed(1)}秒`;
        break;
    }
    let modeWord = "";
    switch (this.state.alignMode) {
      case ALIGN_MODE.EXACT_MATCH:
        modeWord = "按精确对应关系对齐";
        break;
      case ALIGN_MODE.ORDER_MATCH:
        modeWord = "按时间顺序匹配对齐";
    }
    return (
      <div>
        <p>{`您是否确定要对齐草稿 ${pInfo.draft_name} 里的字幕和AI语音？`}</p>
        <p>{`您的设置是${isChangeSpeedWord}，${gapWord}，${modeWord}。`}</p>
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{`2. 对齐操作仅可应用于所有文字（字幕）都有AI语音，所有语音都有对应字幕的一一对应情况。如果你把一段字幕回车切分成两段，你应该删除原有的长AI语音，再次生成两段短AI语音。`}</p>
        <p>{`3. 本操作不是改动视频画面去适应字幕语音，如果你希望改动视频画面播放速率，请使用对齐大师Pro；本操作会让所有AI语音的播放速率值相同，如果你接受或快或慢不统一，接受音频之间有或长或短的间隙，请使用对齐精灵（注：对齐精灵也不改动视频画面）。`}</p>
        <p>{"4. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoMasterAlignMaterial();
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
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"设置"}</span>
        </Row>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`【变速设置】你是否需要调整AI语音播放速率？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const speedSetting = e.target.value;
              this.setState({ speedSetting });
            }}
            value={this.state.speedSetting}
          >
            <Radio value={SPEED_SETTING.NO_CHANGE}>
              <span className="setting-text-span">
                否，我认为当前默认速度很合适。
              </span>
            </Radio>
            <Radio value={SPEED_SETTING.YES_CHANGE_DEFINED}>
              <span className="setting-text-span">
                是，我想要自己调整音频变速倍数。
              </span>
            </Radio>
            <Radio value={SPEED_SETTING.YES_CHANGE_TO_VIDEO}>
              <span className="setting-text-span">
                是，让软件智能根据视频长度决定音频变速倍数，让语音全念完时刚好视频画面播放完
                <span
                  style={{ color: "aqua" }}
                  onClick={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const contentRenderer = () => {
                      return (
                        <p>{`举例：如果你的视频轨道上有视频或图片共1分钟长度，而语音按默认一倍速播完需要2分钟，那么选择了本选项之后，软件会自动将语音调整到2倍速，缩短语音时间，使得语音念完时，视频画面刚好播完。如果你的视频有1分钟长度，而语音按默认一倍速播完需要54秒，那么选择了本选项之后，变速倍数会设置为0.9倍，延长语音，使得语音变成1分钟长。也就是在时间线上，本选项使得语音右端和视频右端对齐。请注意：1. 对齐大师不会去动视频片段，只做字幕和AI语音的对齐，视频片段长度只是参考依据。2. 变速倍数由软件智能计算，自动设置，不需要你计算。3. 异常情况：如果你的视频轨道上没有任何东西，或者间隙设置得太长，甚至长于视频画面，那么本软件无法确定变速倍数，就会按照默认1倍速处理语音。4. 极少数情况下，由于剪映自身精度有限，可能音频字幕末端距离视频画面末端有零点零几秒的小差异，这是可接受的正常误差现象。5. 尽管语音念完时画面刚好播完，但如果视频画面原本有声音，你是智能识别字幕再生成AI语音，这并不代表对齐大师的语音完美贴合原有视频画面。因为可能原视频画面中间有长停顿，但是用对齐大师一气呵成念出来后，语速降低，语句连贯，停顿被消除，所以并不是每一句话都精确贴合原画面。如果需要贴合原画面，请使用对齐大师Pro。对齐大师Pro会改变视频画面播放速率，而本功能即对齐大师(非Pro)不会动视频画面。`}</p>
                      );
                    };
                    this.setState({
                      isExplanationModalOpen: true,
                      explanationRenderer: contentRenderer,
                    });
                  }}
                >
                  （举例）
                </span>
                。
              </span>
            </Radio>
          </Radio.Group>
        </Row>
        {this.state.speedSetting === SPEED_SETTING.YES_CHANGE_DEFINED ? (
          <>
            <Row>
              <InputNumber
                addonBefore={"音频变速倍数:"}
                addonAfter={"x"}
                min={0.2}
                max={3}
                style={{ width: "215px" }}
                step={0.01}
                value={this.state.speedRatio}
                onChange={(value: number | null) => {
                  this.setState({
                    speedRatio: typeof value === "number" ? value : 1,
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
                min={0.2}
                max={3}
                onChange={(value: number) => {
                  this.setState({ speedRatio: value });
                }}
                value={this.state.speedRatio}
                step={0.01}
                tooltip={{ formatter: (value: number | undefined) => {
                    if (value === undefined) {
                      return "";
                    }
                    return `${value.toFixed(2)}x`;
                  }
                }}
              />
            </Row>
          </>
        ) : null}
        <Row className="option-row">
          <span className="align-master-setting-enabled-title">
            {`【间隙设置】你是否需要AI语音片段之间留有间隙？`}
          </span>
          <br />
          <span style={{ color: "gray" }}>
            {`(建议：为了观众更好的听觉体验，音频倍速小于1.3x时不要设置间隙;大于1.3x时要设置0.1s或0.2s的间隙，防止听起来过于仓促)`}
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
            <Radio value={GAP_SETTING.NO_CHANGE}>
              <span className="setting-text-span">否，不需要间隙。</span>
            </Radio>
            <Radio value={GAP_SETTING.YES_CHANGE}>
              <span className="setting-text-span">是，需要间隙。</span>
            </Radio>
          </Radio.Group>
        </Row>
        {this.state.gapSetting === GAP_SETTING.YES_CHANGE ? (
          <>
            <Row>
              <InputNumber
                addonBefore={"语音间隙时长:"}
                addonAfter={"s"}
                min={0}
                max={3}
                style={{ width: "215px" }}
                step={0.1}
                value={this.state.gapTime}
                onChange={(value: number | null) => {
                  this.setState({
                    gapTime: typeof value === "number" ? value : 0,
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
                max={3}
                onChange={(value: number) => {
                  this.setState({ gapTime: value });
                }}
                value={this.state.gapTime}
                step={0.1}
                tooltip={{ formatter: (value: number | undefined) => {
                  if (value === undefined) {
                    return "";
                  }
                  return `${value.toFixed(1)}s`;
                }}}
              />
            </Row>
          </>
        ) : null}
        <Row className="option-row">
          <span className="align-master-setting-enabled-title">
            {`【对齐模式设置】`}
            <span style={{ color: "gray" }}>
              {"建议一般保持“按精确对应关系”不动"}
            </span>
            <span style={{ color: 'aqua', cursor: 'pointer' }} onClick={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              const contentRenderer = () => {
                return (
                  <>
                    <p>{`【按精确对应关系】该模式要求语音需要是字幕所生成的AI语音，不能是反过来由AI语音生成出字幕。如果你反过来的话，可能会看到部分字幕在对齐后消失的情况。如果你按照视频教程操作，那就没有问题。该模式对齐的语音只能是绿色的AI语音片段，不能对齐蓝色的普通语音片段，按时间顺序匹配则可以对齐绿色或蓝色两种。`}</p>
                    <p>{`【按时间顺序匹配】该模式不会删除字幕，哪怕不是符合字幕生成语音的关系。在该模式下，请你删除多余的音频，如BGM，否则可能BGM也会被当为一段语音，按从左到右的出现时间的顺序匹配。你应该自己保证音频段落数量和字幕段落数量相等，否则可能出现出乎意料的结果。常见错误是：字幕生成语音后，在右上角按回车键将一段字幕断成两行，这样的话字幕就会比音频多，解决方式是删除原来的长的语音，这两段字幕再识别出两段AI语音。`}</p>
                  </>
                );
              };
              this.setState({
                isExplanationModalOpen: true,
                explanationRenderer: contentRenderer,
              });
            }}>&nbsp;（解释）</span>
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const alignMode = e.target.value;
              this.setState({ alignMode });
            }}
            value={this.state.alignMode}
          >
            <Radio value={ALIGN_MODE.EXACT_MATCH}>
              <span className="setting-text-span">按精确对应关系</span>
            </Radio>
            <Radio value={ALIGN_MODE.ORDER_MATCH}>
              <span className="setting-text-span">按时间顺序匹配</span>
            </Radio>
          </Radio.Group>
        </Row>
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
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            const contentRenderer = () => {
              return (
                <>
                  <p>
                    <a
                      href="https://www.bilibili.com/video/BV1gu4y1F73y/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {`【(旧)视频教程，界面略有不同，未涵盖设置选项，但仔细阅读设置文字也应该能懂】`}
                    </a>
                  </p>
                  <p>{"使用步骤:"}</p>
                  <p>{"1. 确认剪映草稿中有字幕也有语音(AI语音或普通语音均可、如果是普通语音请在下方选择按时间顺序匹配模式)."}</p>
                  <p>{"2. 如果有不需要匹配字幕的音频(如背景音乐或冗余原声音频)，请点击其轨道左侧的喇叭按钮静音，本软件会对静音轨道“视而不见”."}</p>
                  <p>{"3. 关闭剪映草稿."}</p>
                  <p>{"4. 完成下方的设置选项."}</p>
                  <p>{"5. 点击下方需要对齐的草稿."}</p>
                </>
              );
            };
            this.setState({
              isExplanationModalOpen: true,
              explanationRenderer: contentRenderer,
            });
          }}          
        >
          {"功能解释"}
        </Button>
        {this.renderAlignOptions()}
        <SelectProject
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={this.renderConfirmContentComp}
          headerFinePrint={
            ""
          }
          hideProjectSourceSelect={IS_EN}
        />
        <div style={{ float: "right" }}>
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
            onOk={() => {
              this.setState({
                isExplanationModalOpen: false,
              });
            }}
            closable={false}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
          >
            {this.state.explanationRenderer()}
          </Modal>
        ) : null}
      </div>
    );
  }
}
