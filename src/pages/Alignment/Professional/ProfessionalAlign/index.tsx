import React from "react";
import "./styles.css";
import SelectProject from "../../../../components/SelectProject";
import { Modal, Button, Row, Col, Radio, Input } from "antd";
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
const { TextArea } = Input;

type PropsType = {};

type StateType = {
  textContent: string;
  alignSource: string;
  alignTarget: string;
  longVideoTreatment: string;
  quantityRatio: string;
  customInput: string;
  customParagraphs: string[];
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
  isCutModalOpen: boolean;
  cutModalIndicationHide: boolean;
};

export default class ProfessionalAlign extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      textContent: "",
      alignSource: "",
      alignTarget: "",
      longVideoTreatment: "",
      quantityRatio: "",
      customInput: "",
      customParagraphs: [],
      isResultModalOpen: false,
      resultModalText: "",
      showUndoBtn: false,
      isUndoConfirmModalOpen: false,
      isExplanationModalOpen: false,
      activationStatus: {
        status: "",
        gt: 0,
      },
      isCutModalOpen: false,
      cutModalIndicationHide: false,
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
    const res = await window.electronAPI.professionalAlignMaterial({
      infoPath: pInfo.draft_json_file,
      alignSource: this.state.alignSource,
      alignTarget: this.state.alignTarget,
      longVideoTreatment: this.state.longVideoTreatment,
      quantityRatio: this.state.quantityRatio,
      customParagraphs: this.state.customParagraphs,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      const src = this.mapAlignSourceValueToText(this.state.alignSource);
      const tgt = this.mapAlignTargetValueToText(this.state.alignTarget);
      const dataObj = JSON.parse(res.data);
      const { totalSrcCount, totalTgtCount, alignedSrcCount, alignedTgtCount } =
        dataObj;
      let additionalWords = "";
      if (totalSrcCount > alignedSrcCount) {
        additionalWords = `多余的${
          totalSrcCount - alignedSrcCount
        }段${src.replace("和", "或")}依然放置于主轨道上，紧随其后。`;
      } else if (totalTgtCount > alignedTgtCount) {
        additionalWords = `${
          totalTgtCount - alignedTgtCount
        }段${tgt}匹配不到${src.replace(
          "和",
          "或"
        )}，需要你后续手动处理（当然也可以不处理）。`;
      }
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功让主轨道上${alignedSrcCount}段${src.replace(
          "和",
          "或"
        )}对齐${alignedTgtCount}段${tgt}。${additionalWords}另外，你可以考虑从左侧获取"批量动画"，它可以帮你同时批量添加多种风格的转场效果，让主轨道图片视频切换时不生硬，也可以批量添加出入场，关键帧等。`,
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
      const pureTextContents = res.data;
      const textContent = pureTextContents.join("\r\n");
      this.setState({
        textContent,
        customParagraphs: [textContent],
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    const src = this.mapAlignSourceValueToText(this.state.alignSource);
    const tgt = this.mapAlignTargetValueToText(this.state.alignTarget);
    return (
      <div>
        <p>{`您是否确定要对齐草稿 ${pInfo.draft_name} 里的${src}，对齐的目标是${tgt}？`}</p>
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{`2. 如果你的草稿中，${tgt}片段之间有间隙，那么请你务必关闭主轨磁吸功能（剪映软件里时间线右上方按钮），否则本软件对齐之后，你再打开剪映时，主轨道的素材瞬间就都靠左紧密排列，让你误解本软件无法对齐。不过，推荐操作还是请先消除${tgt}片段之间的间隙，本软件提供了次要功能辅助你完成这个操作，请你点击左侧"次要功能辅助"。操作完再回到本页面对齐。`}</p>
        <p>{"3. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoProfessionalAlignMaterial();
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
        <p>{`试用版限制只能为不超过10段的图片或视频对齐字幕或音频，正式版没有此上限。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  renderAlignOptions = () => {
    const sourceOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你已经放置在主轨道上的需要对齐的素材是什么类型？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({ alignSource: e.target.value });
            }}
            value={this.state.alignSource}
          >
            <Radio value={"photo"}>
              <span className="setting-text-span">{"图片"}</span>
            </Radio>
            <Radio value={"video"}>
              <span className="setting-text-span">{"视频"}</span>
            </Radio>
            <Radio value={"photo-video"}>
              <span className="setting-text-span">{"图片和视频"}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const targetOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你的${this.mapAlignSourceValueToText(
              this.state.alignSource
            )}素材在进行对齐操作时，是要对准字幕还是音频？`}
          </span>
          <span className="align-master-setting-enabled-subtitle">
            {`注解：改变的是${this.mapAlignSourceValueToText(
              this.state.alignSource
            )}素材的时长，字幕或音频的时长和位置固定不变；草稿有字幕推荐以下选字幕；如果你的音频是一整个长片段而不是多个片段，那也只能选字幕；如果你要自定义分镜，只能选字幕；如果没有字幕且有多个音频片段，才选择音频；如果字幕或音频片段间有间隙，建议先点左侧"次要功能辅助"下的功能处理再回到此页面执行对齐，否则，如果你在剪映中开启了主轨磁吸，再次打开草稿所有主轨素材都会紧密靠左，与本操作冲突，无法对齐。`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({ alignTarget: e.target.value });
            }}
            value={this.state.alignTarget}
          >
            <Radio value={"text"}>
              <span className="setting-text-span">{"字幕(推荐)"}</span>
            </Radio>
            <Radio value={"audio"}>
              <span className="setting-text-span">{"音频"}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const videoOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`如果视频素材片段的原始长度大于对齐目标${this.mapAlignTargetValueToText(
              this.state.alignTarget
            )}片段，你想要怎样处理？`}
          </span>
          <span className="align-master-setting-enabled-subtitle">
            {`如果反过来，对齐目标${this.mapAlignTargetValueToText(
              this.state.alignTarget
            )}片段长度大于视频素材片段的原始长度，对齐操作将默认减速视频以增加时长。${
              this.state.alignSource.includes("photo")
                ? "如果是静态图片则没有此问题。"
                : ""
            }`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({ longVideoTreatment: e.target.value });
            }}
            value={this.state.longVideoTreatment}
          >
            <Radio value={"cutright"}>
              <span className="setting-text-span">
                {"裁剪视频片段，舍弃掉一部分"}
              </span>
            </Radio>
            <Radio value={"speedup"}>
              <span className="setting-text-span">
                {"适当加速视频以缩短时长"}
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const renderQuantityOption = () => {
      if (
        this.state.alignSource.includes("video") &&
        !this.state.longVideoTreatment
      ) {
        return null;
      }
      if (
        !this.state.alignSource.includes("video") &&
        !this.state.alignTarget
      ) {
        return null;
      }
      const sourceText = `${this.mapAlignSourceValueToText(
        this.state.alignSource
      ).replace("和", "或")}`;
      const targetText = `${this.mapAlignTargetValueToText(
        this.state.alignTarget
      )}`;
      return (
        <>
          <Row>
            <span className="align-master-setting-enabled-title">{`你希望${this.mapAlignSourceValueToText(
              this.state.alignSource
            )}素材与${this.mapAlignTargetValueToText(
              this.state.alignTarget
            )}片段在对齐时的数量关系是怎样的？`}</span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                this.setState({ quantityRatio: e.target.value });
              }}
              value={this.state.quantityRatio}
            >
              <Radio value={"1:1"}>
                <span className="setting-text-span">{`一段${sourceText}素材对齐一段${targetText}(常用)`}</span>
              </Radio>
              <Radio value={"2:1"}>
                <span className="setting-text-span">{`两段${sourceText}素材对齐一段${targetText}`}</span>
              </Radio>
              <Radio value={"1:2"}>
                <span className="setting-text-span">{`一段${sourceText}素材对齐两段${targetText}`}</span>
              </Radio>
              {this.state.alignTarget === "text" ? (
                <Radio value={"custom"}>
                  <span className="setting-text-span">{`人工设置分镜，自定义对齐数量关系`}</span>
                </Radio>
              ) : null}
            </Radio.Group>
          </Row>
        </>
      );
    };

    const renderCutSetting = () => {
      if (this.state.quantityRatio !== "custom") {
        return null;
      }
      return (
        <div className="setting-cut-wrapper">
          <Button
            type="primary"
            onClick={() => {
              this.setState({ isCutModalOpen: true });
            }}
          >
            {this.state.customParagraphs.length === 0 ? "设置分镜" : "修改分镜"}
          </Button>
          <div className="setting-cut-indication">{this.state.customParagraphs.length === 0 ? "← 请点击按钮设置分镜" : `(已设置${this.state.customParagraphs.length}条分镜)`}</div>
        </div>
      );
    };

    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"设置"}</span>
        </Row>
        {sourceOption}
        {!!this.state.alignSource ? targetOption : null}
        {!!this.state.alignTarget && this.state.alignSource.includes("video")
          ? videoOption
          : null}
        {renderQuantityOption()}
        {renderCutSetting()}
        {this.isSettingCompleted() ? (
          <div className="finish-options">
            你已经完成了所有设置。请点击下方草稿↓↓↓
          </div>
        ) : null}
      </div>
    );
  };

  mapAlignSourceValueToText = (val: string) => {
    switch (val) {
      case "photo":
        return "图片";
      case "video":
        return "视频";
      case "photo-video":
        return "图片和视频";
      default:
        return "";
    }
  };

  mapAlignTargetValueToText = (val: string) => {
    switch (val) {
      case "text":
        return "字幕";
      case "audio":
        return "音频";
      default:
        return "";
    }
  };

  isSettingCompleted = () => {
    if (
      this.state.quantityRatio.length > 0 &&
      this.state.quantityRatio !== "custom"
    ) {
      return true;
    }
    if (
      this.state.quantityRatio === "custom" &&
      this.state.customParagraphs.length > 0
    ) {
      return true;
    }
    return false;
  };

  handleTransformCustomInput = () => {};

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
        {this.state.isCutModalOpen ? (
          <Modal
            width={950}
            open={true}
            onOk={() => {
              this.setState({
                isCutModalOpen: false,
              });
            }}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
            closable={false}
          >
            <p
              style={{
                display: this.state.cutModalIndicationHide ? "none" : "block",
              }}
            >
              {
                "操作提示：请点击草稿标题提取字幕（后续设置好分镜后需要在主界面下方再点一次草稿执行对齐），字幕文稿会出现在左下方，请你在需要切换分镜的地方按回车键留出一段空白行（或者输入#），以断开形成不同段落，每一个段落形成一个分镜，也就是每一个段落文字的那些字幕（无论是两段字幕还是三段字幕...）共享同一个图片或视频素材，形成切分和对齐的关系。你切割文稿段落的操作定义了图片或视频素材与字幕的数量对应关系。右边会展现当前根据你的输入产生的分镜预览。如果你发现字幕不是你想要的那一行，那么可能是你有多行文字，本软件错判了哪一行是你要的字幕，你可以在剪映中删除或隐藏其他行文字，只剩一行，再回到本软件。"
              }
              <span
                onClick={() => {
                  this.setState({ cutModalIndicationHide: true });
                }}
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                {"隐藏操作提示"}
              </span>
            </p>
            <SelectProject
              onSelectProject={this.handleSelectProjectForScripts}
              renderConfirmContentComp={() => {}}
              headerFinePrint={"请先点击要设置分镜的草稿"}
              skipConfirm
              hideProjectSourceSelect={IS_EN}
            />
            <Row>
              <Col span={12}>
                <TextArea
                  style={{ height: 380 }}
                  value={this.state.textContent}
                  placeholder="请点击草稿标题填充内容后手动分段"
                  onChange={(e) => {
                    this.setState({ textContent: e.target.value });
                    const customParagraphs = e.target.value
                      .split(/\r\n\r\n|\r\n\n|\n\r\n|\n\n|#/)
                      .filter((para) => para.trim().length > 0);
                    this.setState({ customParagraphs });
                  }}
                ></TextArea>
              </Col>
              <Col span={12}>
                <div className="custom-paras-container" style={{ height: 380 }}>
                  {this.state.customParagraphs.map((para, idx) => {
                    return (
                      <div className="custom-para-container" key={para}>
                        <div className="custom-para-title">{`分镜${
                          idx + 1
                        }`}</div>
                        <div className="custom-para-content">{para}</div>
                      </div>
                    );
                  })}
                </div>
              </Col>
            </Row>
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
            <div
              style={{ height: 400, overflowY: "scroll" }}
            >
              <a
                href="https://www.bilibili.com/video/BV1mV411G7tg/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {`【(旧)视频教程，仅包含固定数量关系教程，未包含自定义分镜选项，但仍有意义】`}
              </a>
              <p>{"该功能挪动的是主视频轨道上的图片和视频素材，对齐的目标是字幕或语音。"}</p>
              <p>{"使用步骤:"}</p>
              <p>{"1. 请确保你的草稿包含橙色字幕文本框和语音片段 (绿色AI语音片段和蓝色普通语音片段均可). 字幕或者是语音，二者其一是作为对齐操作的参考依据，操作时字幕和语音本身不动。移动的是视频轨道上的图片和视频素材的位置和长度。"}</p>
              <p>{"2. 在剪映中拉取主轨道上的图片和视频素材进入主视频轨道。他们可能看起来很杂乱，并不对齐字幕，也不对齐语音。没关系。这就是此页面此功能要帮助你的。"}</p>
              <p>{"3. 关闭剪映草稿。"}</p>
              <p>{"4. 完成此页的设置。"}</p>
              <p>{"5. 点击需要对齐的草稿。"}</p>
              <p>{"注意：此功能需要字幕和音频的排列之间没有缝隙。如果有缝隙且你碰巧开启了主轨磁吸（时间线右上角），本操作的成果会在你重新打开草稿时被摧毁。因为有磁吸，当你重新打开草稿时，所有素材就都瞬间向左紧靠填补间隙。为了解决这个问题，你可以从左侧去次要功能辅助看看解决方法。"}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
