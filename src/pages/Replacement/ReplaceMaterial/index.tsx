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
  Progress,
  InputNumber,
  Slider,
  Divider,
  Input,
} from "antd";
import type { RadioChangeEvent } from "antd";
import {
  IS_EN,
  ATTACH_AUDIO_COUNT_LIMIT,
  CHANGE_TEXT_COUNT_LIMIT,
  ATTACH_TRANSITION_COUNT_LIMIT,
  ATTACH_CAPTION_FONT_PRESETS,
  MODIFIER_SOLUTION,
  INIT_MODIFIER,
} from "../../../utils/const";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";

const { TextArea } = Input;
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
import {ModifierType} from "../../../../electron/utils/types";

type StateType = {
  sourcePInfo: PInfoType | null;
  replaceTypesStr: string;
  preData: {
    eachCount: {
      photoCount: number;
      videoCount: number;
      ignoredVideoTrackCount: number;
    };
    extnames: { extname: string; count: number }[];
  } | null;
  parentFolderDir: string;
  childFolders: string[];
  sourceExtnameInfos:  {childFolder: string, sourceExtnamesForOneChild: {extname: string, count: number, grandchilds: string[]}[]}[];
  aspectRatioSolution: string;
  videoDefaultSpeedSolution: string;
  videoLengthDifferenceSolution: string;
  videoDecorationSolution: string;
  deleteAfterComplete: boolean;
  targetPInfos: PInfoType[];
  nonEmptyTargetPInfos: PInfoType[];
  isSelectAutoMode: boolean;
  chosenLatencyFactor: number;
  isModifierModalOpen: boolean;
  modifier: ModifierType;
  isFolderStructureModalOpen: boolean;
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

const REPLACE_ASPECT_RATIO_SOLUTION = {
  IGNORE_DIFFERENCE: 'ignore_difference',
  RAISE_ERROR: "raise_error",
};

const REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION = {
  DEFAULT_1X_SPEED: "default_1x_speed",
  SOURCE_SPEED: "source_speed",
};

const REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION = {
  LONG_CUT_SHORT_SPEED: "long_cut_short_speed",
  LONG_RIGHT_SHORT_SPEED: "long_right_short_speed",
  LONG_RANDOM_SHORT_SPEED: "long_random_short_speed",
  LONG_SPEED_SHORT_SPEED: "long_speed_short_speed",
  BREAK_TIMELINE: "break_timeline",
};

const REPLACE_VIDEO_DECORATION_SOLUTION = {
  NO_ALIGN: "no_align",
  YES_ALIGN_ATTRIBUTE_0: "yes_align_attribute_0",
};

export default class ReplaceMaterial extends React.Component<
  PropsType,
  StateType
> {
  modiTransHelper: {
    transitionInfos: {
      data: {
        category: { key: string; name: string; effects: string[] }[];
        effects: {
          effect_id: string;
          name: string;
          file_url: { uri: string };
        }[];
      };
    } | null;
    categoryKeys: string[];
    existMap: Map<string, string>;
  } = {
    transitionInfos: null,
    categoryKeys: Array(ATTACH_TRANSITION_COUNT_LIMIT).fill(""),
    existMap: new Map(),
  };

  modiTextHelper: {
    pureTextContents: string[];
    userInputs: string[];
  } = {
    pureTextContents: [],
    userInputs: Array(CHANGE_TEXT_COUNT_LIMIT).fill(""),
  };

  constructor(props: PropsType) {
    super(props);
    this.state = {
      sourcePInfo: null,
      replaceTypesStr: "",
      preData: null,
      parentFolderDir: "",
      childFolders: [],
      sourceExtnameInfos: [],
      aspectRatioSolution: "",
      videoDefaultSpeedSolution: "",
      videoLengthDifferenceSolution: "",
      videoDecorationSolution: "",
      deleteAfterComplete: false,
      targetPInfos: [],
      nonEmptyTargetPInfos: [],
      isSelectAutoMode: false,
      chosenLatencyFactor: 3,
      modifier: JSON.parse(JSON.stringify(INIT_MODIFIER)),
      isModifierModalOpen: false,
      isFolderStructureModalOpen: false,
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
    window.electronAPI.onUpdateProgressInfo(
      this.handleUpdateProgressInfo
    );
    this.getActivationStatus();
  }

  componentWillUnmount(): void {
    // @ts-ignore
    window.electronAPI.offUpdateProgressInfo(
      this.handleUpdateProgressInfo
    );
  }

  handleUpdateProgressInfo = (
    _event: any,
    param: { fraction: number; indication: string }
  ) => {
    this.setState({
      progressFraction: param.fraction,
      progressIndication: param.indication,
    })
  }

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    this.setState({
      sourcePInfo: pInfo,
      replaceTypesStr: "",
      preData: null,
      parentFolderDir: "",
      childFolders: [],
      targetPInfos: [],
      nonEmptyTargetPInfos: [],
      isSelectAutoMode: false,
      modifier: JSON.parse(JSON.stringify(INIT_MODIFIER)),
    });
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoReplaceMaterial();
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
        <p>{`试用版限制只能批量替换3段及以下图片片段，3段及以下视频片段，正式版可以替换每套草稿里的无数段图片和视频片段。`}</p>
        <p>{`试用版限制只能一次批量替换5套新素材，正式版一次可以替换至多1000套新素材。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  replaceTypesAction = async (param: {
    pInfo: PInfoType | null;
    replaceTypesStr: string;
  }) => {
    if (param.pInfo == null || param.replaceTypesStr.length === 0) {
      return;
    }
    const replaceTypes = param.replaceTypesStr.split("-");
    // @ts-ignore
    const res = await window.electronAPI.preReplaceMaterial({
      infoPath: param.pInfo.draft_json_file,
      replaceTypes,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
        replaceTypesStr: "",
        preData: null,
      });
    }
    if (res.status === "success") {
      this.setState({
        preData: res.data,
      });
    }
  };

  // 源文件是要替换掉其中的图片还是视频还是都要
  renderReplaceTypeOptions = () => {
    if (this.state.sourcePInfo == null) {
      return null;
    }
    const replaceTypesOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你希望批量替换草稿 ${this.state.sourcePInfo.draft_name} 中什么类型的素材？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                replaceTypesStr: e.target.value,
                parentFolderDir: "",
                childFolders: [],
                targetPInfos: [],
                nonEmptyTargetPInfos: [],
              });
              this.replaceTypesAction({
                pInfo: this.state.sourcePInfo,
                replaceTypesStr: e.target.value,
              });
            }}
            value={this.state.replaceTypesStr}
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
    return (
      <div className="align-master-setting-whole-wrapper">
        {replaceTypesOption}
      </div>
    );
  };

  handleSelectParentFolder = async () => {
    // @ts-ignore
    const res = await window.electronAPI.openDirectory();
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
        childFolders: [],
        targetPInfos: [],
        nonEmptyTargetPInfos: [],
      });
    }
    if (res.status === "success") {
      if (res.data.length === 0) {
        return;
      }
      this.setState({
        parentFolderDir: res.data,
        childFolders: [],
        targetPInfos: [],
        nonEmptyTargetPInfos: [],
      });
      // just for ts-ignore
      if (this.state.preData == null) {
        return;
      }
      await this.handleCheckMaterialToReplace({
        parentFolderDir: res.data,
        sourceExtnames: this.state.preData.extnames,
      });
    }
  };

  handleCheckMaterialToReplace = async (param: {
    parentFolderDir: string;
    sourceExtnames: { extname: string; count: number }[];
  }) => {
    // @ts-ignore
    const res = await window.electronAPI.checkMaterialToReplace(param);
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
        sourceExtnameInfos: [],
        childFolders: [],
        targetPInfos: [],
        nonEmptyTargetPInfos: [],
      });
    }
    if (res.status === "success") {
      this.setState({
        childFolders: res.data.childFolders,
        sourceExtnameInfos: res.data.sourceExtnameInfos,
        targetPInfos: [],
        nonEmptyTargetPInfos: [],
      });
    }
  };

  renderSourceAnalysis = () => {
    if (this.state.preData == null || this.state.sourcePInfo == null) {
      return null;
    }
    const replaceTypes = this.state.replaceTypesStr.split("-");
    let eachCountWord = `经解析，在草稿 ${this.state.sourcePInfo.draft_name} 中，`;
    for (let i = 0; i < replaceTypes.length; i++) {
      const replaceType = replaceTypes[i];
      const joinSign = i === replaceTypes.length - 1 ? "。" : "；";
      let countWordPart = "";
      if (replaceType === "photo") {
        countWordPart = `有${this.state.preData.eachCount.photoCount}个图片片段需要替换${joinSign}`;
      }
      if (replaceType === "video") {
        countWordPart = `有${this.state.preData.eachCount.videoCount}个视频片段需要替换${joinSign}`;
      }
      eachCountWord = `${eachCountWord}${countWordPart}`;
    }
    const ignoredWord =
      this.state.preData.eachCount.ignoredVideoTrackCount > 0
        ? `另外，有${this.state.preData.eachCount.ignoredVideoTrackCount}段视频轨道被忽略。`
        : "";
    const extnames = this.state.preData.extnames;
    const extWordsPrefix =
      "具体从文件扩展名的角度说来，你的任务是替换该草稿里的：";
    let extWords = "";
    let extnameTotalCount = 0;
    for (let i = 0; i < extnames.length; i++) {
      const extname = extnames[i];
      const joinSign = i === extnames.length - 1 ? "" : "；";
      extWords = `${extWords}${extname.count}个${extname.extname}文件${joinSign}`;
      extnameTotalCount = extnameTotalCount + extname.count;
    }
    extWords = `${extWords}(共${extnameTotalCount}个文件)`;
    const extWordsSentence = `${extWordsPrefix}${extWords}。请注意：如果时间线上有部分素材片段你不需要替换，你可以将其文件命名为下划线开头，比如 _123.mp4，对于下划线开头的素材，本软件会将其原封不动复制到新草稿，而不寻求替换。`;
    return (
      <>
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">
              {"参考草稿解析结论"}
            </span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">
              {eachCountWord}
              {ignoredWord}
            </span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">
              {extWordsSentence}
            </span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">
              {
                "接下来，你需要指定存储替换素材的文件夹，使得本软件能够为你做批量素材替换。"
              }
            </span>
          </Row>
          <Row>
            <span className="align-master-setting-enabled-title">{`文件结构的要求：请你在电脑中创建一个文件夹（称之为父文件夹），在这个文件夹里，你可以创建一个或多个子文件夹，然后，请你把${extWords}放在一个子文件夹里，如果你有多套素材，就放入多个子文件夹中（子文件夹数量不可超过1000，以免执行流程太久）。对应的，批量替换素材执行完毕后，你会得到一个或多个替换后的草稿（即每一个子文件夹对应一个新草稿）。`}</span>
          </Row>
          <Row>
            <div className="align-master-setting-enabled-title">
              {`然后，回到本软件此页面。`}
            </div>
          </Row>
          <Row>
            <div style={{marginTop: 13 }}>
              <span className="align-master-setting-big-title">
                {`接下来，请你在下方点击 "选中父文件夹" 按钮，告知本软件这个父文件夹在哪里。`}
              </span>
            </div>
          </Row>
        </div>
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">
              {"新素材在哪里？"}
            </span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button
              type="primary"
              onClick={this.handleSelectParentFolder}
              style={{ marginRight: 13 }}
            >
              {"选中父文件夹"}
            </Button>
            <Button
               type="default"
               onClick={() => {
                this.setState({ isFolderStructureModalOpen: true })
               }}
            >
              {"查看文件结构示意图"}
            </Button>
            {this.state.parentFolderDir.length > 0 &&
            this.state.childFolders.length === 0 ? (
              <Button
                type="default"
                onClick={() => {
                  // just for ts
                  if (this.state.preData == null) {
                    return;
                  }
                  this.handleCheckMaterialToReplace({
                    parentFolderDir: this.state.parentFolderDir,
                    sourceExtnames: this.state.preData.extnames,
                  });
                }}
              >
                {"重新检查新素材数量"}
              </Button>
            ) : null}
          </Row>
          {this.state.parentFolderDir.length > 0 ? (
            <div style={{ marginTop: 13 }}>
              <span className="align-master-setting-enabled-title">{`已选择: ${this.state.parentFolderDir}`}</span>
            </div>
          ) : null}
          {this.state.parentFolderDir.length > 0 &&
          this.state.childFolders.length === 0 ? (
            <div style={{ marginTop: 13 }}>
              <span className="align-master-setting-enabled-title">{`该父文件夹不符合要求，请重选或者修改后点击"重新检查新素材数量"按钮。`}</span>
            </div>
          ) : null}
          {this.state.parentFolderDir.length > 0 &&
          this.state.childFolders.length > 0 ? (
            <>
              <div style={{ marginTop: 13 }}>
                <span className="align-master-setting-enabled-title">{`子文件夹共${
                  this.state.childFolders.length
                }个: ${this.state.childFolders.join(", ")}。`}</span>
              </div>
              <div style={{ marginTop: 13 }}>
                <span className="align-master-setting-big-title">{`新素材选择成功。接下来，请你完成下方的设置。`}</span>
              </div>
            </>
          ) : null}
        </div>
      </>
    );
  };

  isIncludeVideo = () => {
    return this.state.replaceTypesStr.split("-").includes("video");
  };

  isSettingsFinished = () => {
    if (!this.isIncludeVideo()) {
      return this.state.aspectRatioSolution.length > 0;
    } else {
      const finishedFirstLevel =
        this.state.aspectRatioSolution.length > 0 &&
        this.state.videoDefaultSpeedSolution.length > 0 &&
        this.state.videoLengthDifferenceSolution.length > 0;
      if (
        this.state.videoLengthDifferenceSolution !==
        REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE
      ) {
        return finishedFirstLevel;
      } else {
        return (
          finishedFirstLevel && this.state.videoDecorationSolution.length > 0
        );
      }
    }
  };

  renderSettings = () => {
    if (
      this.state.parentFolderDir.length === 0 ||
      this.state.childFolders.length === 0
    ) {
      return null;
    }
    const aspectRatioChoices = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`如果文件夹里的新素材和参考草稿里的素材画幅宽高比不同，请问你希望如何处理？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                aspectRatioSolution: e.target.value,
              });
            }}
            value={this.state.aspectRatioSolution}
          >
            <Radio value={REPLACE_ASPECT_RATIO_SOLUTION.IGNORE_DIFFERENCE}>
              <span className="setting-text-span">
                {"(推荐)依然做替换"}
              </span>
            </Radio>
            <Radio value={REPLACE_ASPECT_RATIO_SOLUTION.RAISE_ERROR}>
              <span className="setting-text-span">
                {"提示框报错，并终止流程"}
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const videoDefaultSpeedChoices = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问你要在时间线上以什么样的默认速度播放新视频素材？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                videoDefaultSpeedSolution: e.target.value,
              });
            }}
            value={this.state.videoDefaultSpeedSolution}
          >
            <Radio
              value={REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION.DEFAULT_1X_SPEED}
            >
              <span className="setting-text-span">{"默认按照1倍速播放"}</span>
            </Radio>
            <Radio value={REPLACE_VIDEO_DEFAULT_SPEED_SOLUTION.SOURCE_SPEED}>
              <span className="setting-text-span">
                {"默认按照对应的旧素材在时间线上的播放倍速"}
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const videoLengthDifferenceChoices = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`新视频素材的长度可能有跟旧视频素材不同，在替换对应位置时会遇到时间线问题，请问你想要如何处理？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                videoLengthDifferenceSolution: e.target.value,
              });
            }}
            value={this.state.videoLengthDifferenceSolution}
          >
            <Radio
              value={
                REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_SPEED_SHORT_SPEED
              }
            >
              <span className="setting-text-span">
                {"新素材如果太长就加速，太短就减速，保证片段时长相同，时间线不改变"}
              </span>
            </Radio>
            <Radio
              value={
                REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_CUT_SHORT_SPEED
              }
            >
              <span className="setting-text-span">
                {
                  "新素材如果太长就裁剪掉后面的部分，太短就减速，保证片段时长相同，时间线不改变"
                }
              </span>
            </Radio>
            <Radio
              value={
                REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RIGHT_SHORT_SPEED
              }
            >
              <span className="setting-text-span">
                {
                  "新素材如果太长就裁剪掉前面的部分，太短就减速，保证片段时长相同，时间线不改变"
                }
              </span>
            </Radio>
            <Radio
              value={
                REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.LONG_RANDOM_SHORT_SPEED
              }
            >
              <span className="setting-text-span">
                {
                  "新素材如果太长就裁剪掉随机的部分，太短就减速，保证片段时长相同，时间线不改变"
                }
              </span>
            </Radio>
            <Radio
              value={REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE}
            >
              <span className="setting-text-span">
                {
                  "按指定默认速度播放完新素材，不做额外变速和裁剪，片段时长根据新素材而定，会改变时间线"
                }
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const videoDecorationSolutionChoices = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`由于上一个设置的选项会改变时间线，请问你是否需要在时间线被改变时也顺便调整原先对齐该视频素材的元素（音频、文字、滤镜、特效等）？`}
            <span
              style={{ color: "gray" }}
            >{`(比如你原来的视频是10秒，替换后变为15秒，原来可能有文字的左右两端刚好对齐视频的左右两端，如果此选项你选择"是，需要重新对齐"，那么本软件就会在替换后把文字也从10秒延伸到15秒，让文字继续对齐视频的左右两端。)`}</span>
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                videoDecorationSolution: e.target.value,
              });
            }}
            value={this.state.videoDecorationSolution}
          >
            <Radio value={REPLACE_VIDEO_DECORATION_SOLUTION.NO_ALIGN}>
              <span className="setting-text-span">
                {"否，仅改动视频轨道时间线即可"}
              </span>
            </Radio>
            <Radio value={REPLACE_VIDEO_DECORATION_SOLUTION.YES_ALIGN_ATTRIBUTE_0}>
              <span className="setting-text-span">{"是，需要重新对齐（忽略锁定的轨道上的元素）"}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const deleteAfterCompleteComp = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`自动化批量替换之后是否需要删除原素材文件？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              this.setState({
                deleteAfterComplete: e.target.value,
              });
            }}
            value={this.state.deleteAfterComplete}
          >
            <Radio value={false}>{"不需要"}</Radio>
            <Radio value={true}>{"需要"}</Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const modifierComp = (
      <Row>
        <Button
          type="primary"
          style={{ background: "green", borderColor: "green" }}
          size="large"
          onClick={() => {
            this.setState({
              isModifierModalOpen: true,
            });
          }}
        >
          {"(可选)让新草稿额外增加音频/字幕/文本变化/各种动画"}
        </Button>
      </Row>
    );
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">{"替换设置"}</span>
        </Row>
        {aspectRatioChoices}
        {this.isIncludeVideo() ? videoDefaultSpeedChoices : null}
        {this.isIncludeVideo() ? videoLengthDifferenceChoices : null}
        {this.isIncludeVideo() &&
        this.state.videoLengthDifferenceSolution ===
          REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE
          ? videoDecorationSolutionChoices
          : null}
        {deleteAfterCompleteComp}
        {modifierComp}
        {this.isSettingsFinished() ? (
          <Row style={{ paddingTop: 13 }}>
            <span className="align-master-setting-big-title">
              {`所有设置已完成。接下来，请你在剪映中手动创建${this.state.childFolders.length}个新的空白草稿，然后`}
              <strong>{`关闭草稿窗口`}</strong>
              {`，来到本软件，点击下方的蓝色按钮，再点“立即执行”；或者，你也可以点击红色按钮，让软件自动帮你创建草稿并在创建完成后批量替换、批量导出。`}
            </span>
          </Row>
        ) : (
          <Row style={{ paddingTop: 13 }}>
            <span className="align-master-setting-big-title">
              {`请先完成上述设置再进入下一步。`}
            </span>
          </Row>
        )}
      </div>
    );
  };

  handleClickFinishCreateProject = async () => {
    // @ts-ignore
    const res = await window.electronAPI.checkNewProject({
      requiredCount: this.state.childFolders.length,
      referenceProject: this.state.sourcePInfo,
      excepts: [this.state.modifier.layerConfig.refInfoPath],
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
        targetPInfos: [],
        nonEmptyTargetPInfos: [],
        isSelectAutoMode: false,
      });
    }
    if (res.status === "success") {
      this.setState({
        targetPInfos: res.data.targetPInfos,
        nonEmptyTargetPInfos: res.data.nonEmptyTargetPInfos,
        isSelectAutoMode: false,
      });
    }
  };

  handleClickWantAutoReplaceMaterial = () => {
    this.setState({
      isSelectAutoMode: true,
    });
  }

  handleClickAutoReplaceMaterial = async () => {
    if (!this.state.isSelectAutoMode) {
      // will not go here if isSelectAutoMode === false
      return;
    }
    if (this.state.sourcePInfo == null || this.state.preData == null) {
      return;
    }
    this.setState({
      isProgressModalOpen: true,
    });
    // @ts-ignore
    const res = await window.electronAPI.autoReplaceMaterial({
      sourcePInfoPath: this.state.sourcePInfo.draft_json_file,
      replaceTypesStr: this.state.replaceTypesStr,
      sourceExtnameInfos: this.state.sourceExtnameInfos,
      parentFolderDir: this.state.parentFolderDir,
      childFolders: this.state.childFolders,
      aspectRatioSolution: this.state.aspectRatioSolution,
      videoDefaultSpeedSolution: this.state.videoDefaultSpeedSolution,
      videoLengthDifferenceSolution: this.state.videoLengthDifferenceSolution,
      videoDecorationSolution: this.state.videoDecorationSolution,
      deleteAfterComplete: this.state.deleteAfterComplete,
      chosenLatencyFactor: this.state.chosenLatencyFactor,
      modifier: this.state.modifier,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0, // 避免再次出现时有从非0变成0的过渡动画效果
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0, // 避免再次出现时有从非0变成0的过渡动画效果
        resultModalText: `成功了。已经批量替换了${res.data.taskCount}个草稿。`,
        showUndoBtn: false,
      });
    }
  }

  renderFinishCreateProject = () => {
    if (
      this.state.parentFolderDir.length === 0 ||
      this.state.childFolders.length === 0 ||
      !this.isSettingsFinished()
    ) {
      return null;
    }
    const renderTargetPInfosIndication = () => {
      if (this.state.isSelectAutoMode) {
        return null;
      }
      if (this.state.targetPInfos.length === 0) {
        return null;
      }
      const handleClickCopy = async () => {
        const textArr = this.state.targetPInfos.map((pInfo, index) => {
          const draftName = pInfo.draft_name;
          const childFolder = this.state.childFolders[index];
          return `${draftName} - ${childFolder}`;
        });
        await navigator.clipboard.writeText(textArr.join(";\r\n"));
        this.setState({
          isResultModalOpen: true,
          resultModalText: `对应关系已经成功复制到剪切板。`,
        });
      };
      return (
        <>
          <Row style={{ marginTop: 13 }}>
            <span className="setting-text-span">
              {`根据检测：你的确新建了${
                this.state.targetPInfos.length
              }个草稿，草稿名称是${this.state.targetPInfos
                .map((pInfo) => pInfo.draft_name)
                .join("; ")}.`}
            </span>
          </Row>
          <Row style={{ marginTop: 13 }}>
            <span className="setting-text-span">{`当你接下来即将执行的批量替换操作完成之后，草稿和子文件夹的对应关系如下：`}</span>
          </Row>
          <Row style={{ marginTop: 13 }}>
            <div>
              {this.state.targetPInfos.map((pInfo, index) => {
                const draftName = pInfo.draft_name;
                const childFolder = this.state.childFolders[index];
                const endSign = index !== this.state.targetPInfos.length - 1 ? ';' : "";
                return <Row key={pInfo.draft_json_file}><span className="setting-text-span">{`${draftName} - ${childFolder}${endSign}`}</span></Row>;
              })}
            </div>
          </Row>
          <Row style={{ marginTop: 13 }}>
            <div>
              <Button type="default" onClick={handleClickCopy}>
                复制上述对应关系
              </Button>
            </div>
          </Row>
        </>
      );
    };
    const renderNonEmptyNote = () => {
      if (this.state.isSelectAutoMode) {
        return null;
      }
      if (this.state.nonEmptyTargetPInfos.length === 0) {
        return null;
      }
      return (
        <Row style={{ marginTop: 13 }}>
          <span className="setting-text-span" style={{ color: "gray" }}>
            {`此外，需要提醒的是：在这${
              this.state.targetPInfos.length
            }个草稿中，有${
              this.state.nonEmptyTargetPInfos.length
            }个草稿不是空白的，草稿名称是${this.state.nonEmptyTargetPInfos
              .map((pInfo) => pInfo.draft_name)
              .join(
                "; "
              )}。你可以对此提醒置之不理，继续选择上述草稿作为替换品的容身之所，此提醒不妨碍批量替换操作。`}
          </span>
        </Row>
      );
    };
    const renderOtherNote = () => {
      // auto mode没有this.state.targetPInfos也展示
      if (this.state.targetPInfos.length === 0 && !this.state.isSelectAutoMode) {
        return null;
      }
      if (this.state.videoLengthDifferenceSolution !== REPLACE_VIDEO_LENGTH_DIFFERENCE_SOLUTION.BREAK_TIMELINE) {
        return null;
      }
      return (
        <Row style={{ marginTop: 13 }}>
          <span className="setting-text-span" style={{ color: "gray" }}>
            {`注意事项: 由于你的设置会改变时间线，所以主轨道视频素材会从左到右紧密排列，不留间隙。`}
          </span>
        </Row>
      );
    }
    const renderLatencyFactor = () => {
      if (!this.state.isSelectAutoMode) {
        return null;
      }
      return (
        <Row style={{ marginTop: 13 }}>
          <span className="setting-text-span">
            {`自动化运行时的延迟度（如果你觉得你的电脑性能较好，你可以把下方的滚动条往左拉，自动化执行就会快一点，如果往右拉，就会慢一点。但拉到最左在比较老旧的电脑上可能会出问题，比如来不及加载就迅速自动化导出，电脑反应不过来。建议保持默认。）`}
          </span>
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
            min={1}
            max={10}
            onChange={(value: number) => {
              this.setState({ chosenLatencyFactor: value });
            }}
            value={this.state.chosenLatencyFactor}
            step={1}
            tooltip={{ formatter: (value: number | undefined) => {
                if (value === undefined) {
                  return "";
                }
                return `${value}`;
              }
            }}
          />
        </Row>
      );
    }
    const renderNextStepExecuteNote = () => {
      // auto mode没有this.state.targetPInfos也展示
      if (this.state.targetPInfos.length === 0 && !this.state.isSelectAutoMode) {
        return null;
      }
      return (
        <Row style={{ marginTop: 13 }}>
          <span className="align-master-setting-big-title">
            {`你已经完成了所有准备工作，请你再次确认关闭了草稿窗口（防止相互干扰），然后点击下方的"立即执行"按钮。`}
          </span>
        </Row>
      );
    }
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">
            {"替换品的容身之所"}
          </span>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Button
            type="primary"
            onClick={this.handleClickFinishCreateProject}
          >
            {`我已手动新建${this.state.childFolders.length}个草稿，并关闭了草稿窗口，我只需要批量替换草稿`}
          </Button>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Button
            type="primary"
            danger
            onClick={this.handleClickWantAutoReplaceMaterial}
          >
            {`让软件为我自动化新建${this.state.childFolders.length}个草稿，然后批量替换，且自动导出全部草稿`}
          </Button>
        </Row>
        {renderTargetPInfosIndication()}
        {renderOtherNote()}
        {renderNonEmptyNote()}
        {renderLatencyFactor()}
        {renderNextStepExecuteNote()}
      </div>
    );
  };

  handleClickExecuteReplace = async () => {
    if (this.state.sourcePInfo == null || this.state.preData == null) {
      return;
    }
    this.setState({
      isProgressModalOpen: true,
    });
    // @ts-ignore
    const res = await window.electronAPI.replaceMaterial({
      sourcePInfoPath: this.state.sourcePInfo.draft_json_file,
      replaceTypesStr: this.state.replaceTypesStr,
      sourceExtnameInfos: this.state.sourceExtnameInfos,
      parentFolderDir: this.state.parentFolderDir,
      childFolders: this.state.childFolders,
      aspectRatioSolution: this.state.aspectRatioSolution,
      videoDefaultSpeedSolution: this.state.videoDefaultSpeedSolution,
      videoLengthDifferenceSolution: this.state.videoLengthDifferenceSolution,
      videoDecorationSolution: this.state.videoDecorationSolution,
      deleteAfterComplete: this.state.deleteAfterComplete,
      targetPInfoPaths: this.state.targetPInfos.map(item => item.draft_json_file),
      modifier: this.state.modifier,
    });
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0, // 避免再次出现时有从非0变成0的过渡动画效果
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        isProgressModalOpen: false,
        progressFraction: 0, // 避免再次出现时有从非0变成0的过渡动画效果
        resultModalText: `成功了。已经批量替换了${res.data.taskCount}个草稿。`,
        showUndoBtn: true,
      });
    }
  }

  renderExecuteReplace = () => {
    if (
      this.state.parentFolderDir.length === 0 ||
      this.state.childFolders.length === 0 ||
      !this.isSettingsFinished()
    ) {
      return null;
    }
    if (!this.state.isSelectAutoMode && this.state.targetPInfos.length === 0) {
      return null;
    }
    return (
      <div className="align-master-setting-whole-wrapper">
        <Row>
          <span className="align-master-setting-big-title">
            {"离批量替换只差一次点击"}
          </span>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Button
            type="primary"
            size="large"
            danger={this.state.isSelectAutoMode}
            onClick={() => {
              if (this.state.isSelectAutoMode) {
                this.handleClickAutoReplaceMaterial();
              } else {
                this.handleClickExecuteReplace();
              }
            }}
          >
            {`立即执行${this.state.isSelectAutoMode ? "(点击后请立刻聚焦剪映窗口，放在屏幕正中央)" : ""}`}
          </Button>
        </Row>
      </div>
    );
  }

  renderModifier = () => {
    const { modifier } = this.state;
    const { audioConfig, textConfig, transitionConfig, layerConfig } = modifier;
    const audioConfigComp = (
      <>
        <Row>
          <span className="align-master-setting-big-title">
            {"1. 附加音频+字幕"}
          </span>
        </Row>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你是否需要附加音频(mp3或wav)到新建的剪映草稿中？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              audioConfig.isNeed = e.target.value;
              this.setState({
                modifier: { ...modifier },
              });
            }}
            value={audioConfig.isNeed}
          >
            <Radio value={false}>
              <span className="setting-text-span">{"不需要"}</span>
            </Radio>
            <Radio value={true}>
              <span className="setting-text-span">{"需要"}</span>
            </Radio>
          </Radio.Group>
        </Row>
        {audioConfig.isNeed ? (
          <>
            <Row>
              <span className="align-master-setting-enabled-title">
                {`你需要添加几段音频？（提示：如果要添加2段，实际用途一般是让音频1为念稿朗读，音频2为背景音乐）`}
              </span>
            </Row>
            <Row className="option-row">
              <Radio.Group
                onChange={(e: RadioChangeEvent) => {
                  audioConfig.count = e.target.value;
                  while (audioConfig.configs.length < audioConfig.count) {
                    audioConfig.configs.push({
                      audioFolder: "",
                      audioLonger: "",
                      audioShorter: "",
                      audioVolume: 100,
                      randomMode: "",
                      needAttachSRT: false,
                      configSRT: "",
                    });
                  }
                  this.setState({
                    modifier: { ...modifier },
                  });
                }}
                value={audioConfig.count}
              >
                {Array.from(Array(ATTACH_AUDIO_COUNT_LIMIT).keys()).map(
                  (count) => (
                    <Radio key={count + 1} value={count + 1}>
                      <span className="setting-text-span">{count + 1}</span>
                    </Radio>
                  )
                )}
              </Radio.Group>
            </Row>
          </>
        ) : null}
        {Array.from(Array(audioConfig.count).keys()).map((num) => {
          const options =
            audioConfig.configs[num].audioFolder.length > 0 ? (
              <>
                <Row style={{ marginTop: 5, marginBottom: 5 }}>
                  <Col>
                    <InputNumber
                      addonBefore={"音量:"}
                      addonAfter={"%"}
                      min={0}
                      max={200}
                      style={{ width: "170px" }}
                      step={1}
                      value={audioConfig.configs[num].audioVolume}
                      onChange={(value: number | null) => {
                        if (value === null) {
                          return;
                        }
                        audioConfig.configs[num].audioVolume = value;
                        this.setState({
                          modifier: { ...modifier },
                        });
                      }}
                    />
                  </Col>
                  <Col>
                    <Slider
                      style={{ width: 360, marginLeft: 15 }}
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
                      max={200}
                      onChange={(value: number) => {
                        audioConfig.configs[num].audioVolume = value;
                        this.setState({
                          modifier: { ...modifier },
                        });
                      }}
                      value={audioConfig.configs[num].audioVolume}
                      step={1}
                      tooltip={{
                        formatter: (value: number | undefined) => {
                          if (value === undefined) {
                            return "";
                          }
                          return `${value.toFixed(0)}%`;
                        },
                      }}
                    />
                  </Col>
                </Row>
                <Row>
                  <span className="align-master-setting-enabled-title">
                    {`你希望音频文件以什么样的规则被选取并添加到各个新草稿中？`}
                  </span>
                </Row>
                <Row className="option-row">
                  <Radio.Group
                    onChange={(e: RadioChangeEvent) => {
                      audioConfig.configs[num].randomMode = e.target.value;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    }}
                    value={audioConfig.configs[num].randomMode}
                  >
                    <Radio value={MODIFIER_SOLUTION.RANDOM_MODE.ORDER}>
                      <span className="setting-text-span">
                        {"按文件名顺序"}
                      </span>
                    </Radio>
                    <Radio value={MODIFIER_SOLUTION.RANDOM_MODE.PURE_RANDOM}>
                      <span className="setting-text-span">{"纯随机"}</span>
                    </Radio>
                  </Radio.Group>
                </Row>
                <Row>
                  <span className="align-master-setting-enabled-title">
                    {`如果音频${num + 1}比视频画面长，请问你想要如何处理？`}
                  </span>
                </Row>
                <Row className="option-row">
                  <Radio.Group
                    onChange={(e: RadioChangeEvent) => {
                      audioConfig.configs[num].audioLonger = e.target.value;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    }}
                    value={audioConfig.configs[num].audioLonger}
                  >
                    <Radio value={MODIFIER_SOLUTION.AUDIO_LONGER.CUT}>
                      <span className="setting-text-span">
                        {"裁剪掉音频后面的部分，使得音频和视频画面一样长"}
                      </span>
                    </Radio>
                    <Radio value={MODIFIER_SOLUTION.AUDIO_LONGER.SPEED}>
                      <span className="setting-text-span">
                        {"加速音频以缩短时长，使得音频和视频画面一样长"}
                      </span>
                    </Radio>
                  </Radio.Group>
                </Row>
                <Row>
                  <span className="align-master-setting-enabled-title">
                    {`如果音频${num + 1}比视频画面短，请问你想要如何处理？`}
                  </span>
                </Row>
                <Row className="option-row">
                  <Radio.Group
                    onChange={(e: RadioChangeEvent) => {
                      audioConfig.configs[num].audioShorter = e.target.value;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    }}
                    value={audioConfig.configs[num].audioShorter}
                  >
                    {num === 0 ? (
                      <Radio value={MODIFIER_SOLUTION.AUDIO_SHORTER.CUT_VIDEO}>
                        <span className="setting-text-span">
                          {
                            "音频保持默认速度，裁剪掉长于音频的后面的视频画面，使得音频结束时画面也结束（例子：比如你的音频是1分钟，视频画面是2分钟，该选项会把导出的2分钟视频给裁剪成1分钟，请注意，后半部分的视频画面在成品中就看不到了）"
                          }
                        </span>
                      </Radio>
                    ) : null}
                    <Radio value={MODIFIER_SOLUTION.AUDIO_SHORTER.REMAIN}>
                      <span className="setting-text-span">
                        {"音频保持默认速度，就让视频后面的部分没有该音频的声音"}
                      </span>
                    </Radio>
                    <Radio value={MODIFIER_SOLUTION.AUDIO_LONGER.SPEED}>
                      <span className="setting-text-span">
                        {"减速音频以延展时长，使得音频和视频画面一样长"}
                      </span>
                    </Radio>
                  </Radio.Group>
                </Row>
                {num === 0 ? (
                  <>
                    <Row>
                      <span className="align-master-setting-enabled-title">
                        {`是否需要把音频${
                          num + 1
                        }的SRT字幕到草稿中（如果需要，请你将SRT字幕文件放在音频${
                          num + 1
                        }所在文件夹中，并保持保持前缀一致的命名。比如abc.mp3的对应字幕文件是abc.srt）？`}
                      </span>
                    </Row>
                    <Row>
                      <span className="align-master-setting-enabled-title" style={{ color: 'gray' }}>
                        {`如果你不知道如何批量让音频文件智能识别出字幕srt文件，可询问软件作者。`}
                      </span>
                    </Row>
                    <Row className="option-row">
                      <Radio.Group
                        onChange={(e: RadioChangeEvent) => {
                          audioConfig.configs[num].needAttachSRT =
                            e.target.value;
                          this.setState({
                            modifier: { ...modifier },
                          });
                        }}
                        value={audioConfig.configs[num].needAttachSRT}
                      >
                        <Radio value={false}>
                          <span className="setting-text-span">{"不需要"}</span>
                        </Radio>
                        <Radio value={true}>
                          <span className="setting-text-span">{"需要"}</span>
                        </Radio>
                      </Radio.Group>
                    </Row>
                    {
                      audioConfig.configs[num].needAttachSRT ? (<>
                        <Row>
                          <span className="align-master-setting-enabled-title">
                            {`字幕样式`}
                          </span>
                        </Row>
                        <Select
                          value={
                            audioConfig.configs[num].configSRT.length > 0 ? JSON.parse(audioConfig.configs[num].configSRT).preset :
                            "-- 请选择字幕样式 --"
                          }
                          style={{
                            width: 300,
                            marginRight: 5,
                            marginBottom: 12,
                          }}
                          onChange={(value: string) => {
                            audioConfig.configs[num].configSRT = JSON.stringify({ preset: value })
                            this.setState({
                              modifier: { ...modifier },
                            });
                          }}
                          options={ATTACH_CAPTION_FONT_PRESETS.map((item: any) => {
                            const value = item.value;
                            const label = IS_EN ? item.label.EN : item.label.CN;
                            return {
                              value,
                              label,
                            }
                          }).concat([{ value: "Custom", label: "其它字幕样式需求联系作者" }])}
                        />
                      </>) : null
                    }
                  </>
                ) : null}
              </>
            ) : null;
          return (
            <div
              key={num}
              style={{
                marginTop: 10,
                marginBottom: 10,
                paddingTop: 10,
                borderTopColor: "gray",
                borderTopWidth: 1,
                borderTopStyle: "dashed",
              }}
            >
              <Row>
                <Button
                  key={num + 1}
                  type="primary"
                  onClick={async () => {
                    // @ts-ignore
                    const res = await window.electronAPI.openDirectory();
                    if (res.status === "error") {
                      this.setState({
                        isResultModalOpen: true,
                        resultModalText: `失败了。原因: ${res.data}`,
                      });
                    }
                    if (res.status === "success") {
                      if (res.data.length === 0) {
                        return;
                      }
                      const audioCheckRes =
                        // @ts-ignore
                        await window.electronAPI.checkAudioResources({
                          parentFolderDir: res.data,
                        });
                      if (audioCheckRes.status === "error") {
                        this.setState({
                          isResultModalOpen: true,
                          resultModalText: `失败了。原因: ${res.data}`,
                        });
                        return;
                      }
                      if (audioCheckRes.data.count === 0) {
                        this.setState({
                          isResultModalOpen: true,
                          resultModalText: `失败了。虽然你选中了音频文件夹 ${res.data}，但里面没有任何合适的音频。`,
                        });
                        return;
                      }
                      audioConfig.configs[num].audioFolder = res.data;
                      this.setState({
                        modifier: { ...modifier },
                        isResultModalOpen: true,
                        resultModalText: `成功了。你选中的音频文件夹里有${audioCheckRes.data.count}个合适的音频文件。`,
                      });
                    }
                  }}
                  style={{ marginRight: 13 }}
                >
                  {`选择音频${num + 1}的素材文件夹`}
                </Button>
              </Row>
              <Row style={{ marginBottom: 5 }}>
                <span>
                  {audioConfig.configs[num].audioFolder.length > 0
                    ? `已选择: ${audioConfig.configs[num].audioFolder}`
                    : "未选择素材文件夹，请选择↑↑↑"}
                </span>
              </Row>
              {options}
            </div>
          );
        })}
      </>
    );
    const textConfigComp = (
      <>
        <Divider />
        <Row>
          <span className="align-master-setting-big-title">
            {"2. 文本替换（不是字幕替换，字幕在附加音频时添加）"}
          </span>
        </Row>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你是否需要文本替换？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={async (e: RadioChangeEvent) => {
              textConfig.isNeed = e.target.value;
              const contentRes =
                // @ts-ignore
                await window.electronAPI.extractPureTextContents({
                  infoPath: this.state.sourcePInfo?.draft_json_file || "",
                  isExtractAll: true,
                });
              if (contentRes.status === "error") {
                this.setState({
                  isResultModalOpen: true,
                  resultModalText: `失败了。原因: ${contentRes.data}`,
                });
                return;
              }
              this.modiTextHelper.pureTextContents = contentRes.data;
              if (
                contentRes.status === "success" &&
                contentRes.data.length === 0
              ) {
                this.setState({
                  isResultModalOpen: true,
                  resultModalText: `${
                    this.state.sourcePInfo?.draft_name || ""
                  }草稿里没有任何橙色文本框`,
                });
              }
              this.setState({
                modifier: { ...modifier },
              });
            }}
            value={textConfig.isNeed}
          >
            <Radio value={false}>
              <span className="setting-text-span">{"不需要"}</span>
            </Radio>
            <Radio value={true}>
              <span className="setting-text-span">{"需要"}</span>
            </Radio>
          </Radio.Group>
        </Row>
        {textConfig.isNeed ? (
          <>
            <Row>
              <span className="align-master-setting-enabled-title">
                {`你需要修改几段文本？（提示：如果要修改2段，实际用途一般是修改主标题和副标题）`}
              </span>
            </Row>
            <Row className="option-row">
              <Radio.Group
                onChange={(e: RadioChangeEvent) => {
                  textConfig.count = e.target.value;
                  while (textConfig.configs.length < textConfig.count) {
                    textConfig.configs.push({
                      oldContent: "",
                      newContents: [],
                      randomMode: "",
                    });
                  }
                  this.setState({
                    modifier: { ...modifier },
                  });
                }}
                value={textConfig.count}
              >
                {Array.from(Array(CHANGE_TEXT_COUNT_LIMIT).keys()).map(
                  (count) => (
                    <Radio key={count + 1} value={count + 1}>
                      <span className="setting-text-span">{count + 1}</span>
                    </Radio>
                  )
                )}
              </Radio.Group>
            </Row>
          </>
        ) : null}
        {Array.from(Array(textConfig.count).keys()).map((num) => {
          if (num >= textConfig.count) {
            return null;
          }
          return (
            <div
              key={num}
              style={{
                marginTop: 10,
                marginBottom: 10,
                paddingTop: 10,
                borderTopColor: "gray",
                borderTopWidth: 1,
                borderTopStyle: "dashed",
              }}
            >
              <Row>
                <span className="align-master-setting-enabled-title">
                  {`文本${num + 1}内容替换：`}
                </span>
              </Row>
              <Select
                value={
                  textConfig.configs[num].oldContent ||
                  "-- 请选择要被替换的旧文本 --"
                }
                style={{
                  width: 600,
                  marginRight: 5,
                  marginBottom: 12,
                }}
                onChange={(value: string) => {
                  textConfig.configs[num].oldContent = value;
                  this.setState({
                    modifier: { ...modifier },
                  });
                }}
                options={this.modiTextHelper.pureTextContents.map((item) => {
                  return {
                    value: item,
                    label: item,
                  };
                })}
              />
              <Row>
                <span className="align-master-setting-enabled-title">
                  {`请将要替换${
                    num + 1
                  }的新内容输入到左下方，你可以提供不止一份新文案，新内容之间可以由井号"#"分割，也可以由空行分割（记住是空行，所以你要按两次回车，形成一段空行区隔内容）`}
                </span>
              </Row>
              <Row>
                <Col span={12}>
                  <TextArea
                    style={{ height: 300 }}
                    value={this.modiTextHelper.userInputs[num]}
                    placeholder="请输入新内容"
                    onChange={(e) => {
                      this.modiTextHelper.userInputs[num] = e.target.value;
                      const newContents = e.target.value
                        .split(/\r\n\r\n|\r\n\n|\n\r\n|\n\n|#/)
                        .filter((para) => para.trim().length > 0);
                      textConfig.configs[num].newContents = newContents;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    }}
                  ></TextArea>
                </Col>
                <Col span={12}>
                  <div
                    className="custom-paras-container"
                    style={{ height: 300 }}
                  >
                    {textConfig.configs[num].newContents.length === 0 ? (
                      <div className="custom-para-content">{"未输入内容"}</div>
                    ) : null}
                    {textConfig.configs[num].newContents.map((para, idx) => {
                      return (
                        <div className="custom-para-container" key={para}>
                          <div className="custom-para-title">{`新内容${
                            idx + 1
                          }`}</div>
                          <div className="custom-para-content">{para}</div>
                        </div>
                      );
                    })}
                  </div>
                </Col>
              </Row>
              <Row>
                <span className="align-master-setting-enabled-title">
                  {`你希望新内容以什么样的规则被选取并替换旧内容文本${
                    num + 1
                  }？`}
                </span>
              </Row>
              <Row className="option-row">
                <Radio.Group
                  onChange={(e: RadioChangeEvent) => {
                    textConfig.configs[num].randomMode = e.target.value;
                    this.setState({
                      modifier: { ...modifier },
                    });
                  }}
                  value={textConfig.configs[num].randomMode}
                >
                  <Radio value={MODIFIER_SOLUTION.RANDOM_MODE.ORDER}>
                    <span className="setting-text-span">
                      {"按顺序然后循环"}
                    </span>
                  </Radio>
                  <Radio value={MODIFIER_SOLUTION.RANDOM_MODE.PURE_RANDOM}>
                    <span className="setting-text-span">{"纯随机"}</span>
                  </Radio>
                </Radio.Group>
              </Row>
            </div>
          );
        })}
      </>
    );
    const renderTransitionEffectSelects = () => {
      const transitionInfos = this.modiTransHelper.transitionInfos;
      const curDisplayCount =
        this.state.modifier.transitionConfig.curDisplayCount;
      if (transitionInfos == undefined) {
        return null;
      }
      const indexes = [];
      for (let i = 0; i < curDisplayCount; i++) {
        indexes.push(i);
      }
      const categoryOptions = transitionInfos.data.category.map((item) => {
        return { label: item.name, value: item.key };
      });
      return (
        <>
          {indexes.map((i) => {
            const categoryKey = this.modiTransHelper.categoryKeys[i];
            const targetedCategory = transitionInfos.data.category.find(
              (item) => item.key === categoryKey
            );
            const effectIdList = targetedCategory
              ? targetedCategory.effects
              : [];
            const effectOptions = effectIdList.map((effectId) => {
              const effect = transitionInfos.data.effects.find(
                (item) => item.effect_id === effectId
              );
              // should not be undefined, just in case
              if (effect === undefined) {
                return { label: "", value: "" };
              }

              const isEffectExist =
                this.modiTransHelper.existMap.get(
                  `${effect.effect_id}#${effect.file_url.uri}`
                ) === "true";
              return {
                label: `${effect.name}${
                  isEffectExist ? "" : " (未下载不可用)"
                }`,
                value: `${effect.effect_id}#${effect.file_url.uri}`,
                disabled: !isEffectExist,
              };
            });
            return (
              <Row
                key={`effect-${i}-${categoryKey}-${this.state.modifier.transitionConfig.effectIUs[i]}`}
              >
                <Col>
                  <Select
                    value={categoryKey || "-- 选择类别 --"}
                    style={{
                      width: 138,
                      marginRight: 5,
                      marginBottom: 12,
                    }}
                    onChange={async (value: string) => {
                      this.modiTransHelper.categoryKeys[i] = value;
                      this.state.modifier.transitionConfig.effectIUs[i] = "";
                      // 提前看具体效果的存在性
                      const targetedCategory =
                        transitionInfos.data.category.find(
                          (item) => item.key === value
                        );
                      const effectIdList = targetedCategory
                        ? targetedCategory.effects
                        : [];
                      for (let j = 0; j < effectIdList.length; j++) {
                        const effect = transitionInfos.data.effects.find(
                          (item) => item.effect_id === effectIdList[j]
                        );
                        if (effect === undefined) {
                          continue;
                        }
                        const isExistRes =
                          // @ts-ignore
                          await window.electronAPI.getIsTransitionExist({
                            isCapCut:
                              this.state.modifier.transitionConfig.isCapCut,
                            effectIU: `${effect.effect_id}#${effect.file_url.uri}`,
                          });
                        this.modiTransHelper.existMap.set(
                          `${effect.effect_id}#${effect.file_url.uri}`,
                          isExistRes.data
                        );
                      }
                      this.forceUpdate();
                    }}
                    options={categoryOptions}
                  />
                </Col>
                {this.modiTransHelper.categoryKeys[i].length > 0 ? (
                  <Col>
                    <Select
                      value={
                        this.state.modifier.transitionConfig.effectIUs[i] ||
                        "-- 选择具体效果 --"
                      }
                      style={{
                        width: 160,
                        marginBottom: 12,
                      }}
                      onChange={(value: string) => {
                        this.state.modifier.transitionConfig.effectIUs[i] =
                          value;
                        this.forceUpdate();
                      }}
                      options={effectOptions}
                    />
                  </Col>
                ) : null}
              </Row>
            );
          })}
          <Row style={{ marginBottom: 10 }}>
            <Col style={{ marginRight: 10 }}>
              <Tooltip title="增加">
                <Button
                  size="small"
                  shape="circle"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (curDisplayCount < ATTACH_TRANSITION_COUNT_LIMIT) {
                      transitionConfig.curDisplayCount = curDisplayCount + 1;
                      const { modifier } = this.state;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    } else {
                      this.setState({
                        isResultModalOpen: true,
                        resultModalText: `已达最大转场效果数量${ATTACH_TRANSITION_COUNT_LIMIT}，不可以再添加更多。如有特殊需要，请付费定制。`,
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
                  icon={<MinusOutlined />}
                  onClick={() => {
                    if (curDisplayCount > 1) {
                      transitionConfig.curDisplayCount = curDisplayCount - 1;
                      const { modifier } = this.state;
                      this.setState({
                        modifier: { ...modifier },
                      });
                    } else if (curDisplayCount === 1) {
                      this.setState({
                        isResultModalOpen: true,
                        resultModalText: `至少需要选择1个转场效果`,
                      });
                    } else {
                      alert("不应该出现的转场效果数量");
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
              <div
                style={{}}
              >{`当前数量: ${this.state.modifier.transitionConfig.curDisplayCount}`}</div>
            </Col>
          </Row>
        </>
      );
    };
    const transitionConfigComp = (
      <>
        <Divider />
        <Row>
          <span className="align-master-setting-big-title">
            {"3. 附加随机转场"}
          </span>
        </Row>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你是否需要批量附加随机转场到新建的剪映草稿中？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={async (e: RadioChangeEvent) => {
              // @ts-ignore
              const isCapCutRes = await window.electronAPI.getIsCapCut();
              const isCapCut =
                isCapCutRes.status === "success" && isCapCutRes.data === "true";
              const transitionInfosRes =
                // @ts-ignore
                await window.electronAPI.loadTransitionInfos({
                  isCapCut,
                });
              if (transitionInfosRes.status === "error") {
                this.setState({
                  isResultModalOpen: true,
                  resultModalText: transitionInfosRes.data,
                });
              }
              this.modiTransHelper.transitionInfos = JSON.parse(
                transitionInfosRes.data
              );

              transitionConfig.isNeed = e.target.value;
              transitionConfig.isCapCut = isCapCut;
              this.setState({
                modifier: { ...modifier },
              });
            }}
            value={transitionConfig.isNeed}
          >
            <Radio value={false}>
              <span className="setting-text-span">{"不需要"}</span>
            </Radio>
            <Radio value={true}>
              <span className="setting-text-span">{"需要"}</span>
            </Radio>
          </Radio.Group>
        </Row>
        {transitionConfig.isNeed ? (
          <>
            <Row>
              <span className="align-master-setting-enabled-title">
                {`请选择你需要的转场动画效果（可点击"+"添加更多）`}
              </span>
            </Row>
            {renderTransitionEffectSelects()}
            <Row>
              <span className="align-master-setting-enabled-title">
                {`请设置你需要的转场时长`}
              </span>
            </Row>
            <Row>
              <Col>
                <InputNumber
                  addonBefore={"时长:"}
                  addonAfter={"s"}
                  min={0.1}
                  max={3}
                  style={{ width: "150px" }}
                  step={0.1}
                  value={transitionConfig.readableDuration}
                  onChange={(value: number | null) => {
                    transitionConfig.readableDuration =
                      typeof value === "number" ? value : 0.5;
                    this.forceUpdate();
                  }}
                />
              </Col>
              <Col>
                <Slider
                  style={{ width: 360, marginLeft: 15 }}
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
                  min={0.1}
                  max={3}
                  onChange={(value: number) => {
                    transitionConfig.readableDuration = value;
                    this.setState({
                      modifier: { ...modifier },
                    });
                  }}
                  value={transitionConfig.readableDuration}
                  step={0.1}
                  tooltip={{
                    formatter: (value: number | undefined) => {
                      if (value === undefined) {
                        return "";
                      }
                      return `${value.toFixed(1)}s`;
                    },
                  }}
                />
              </Col>
            </Row>
          </>
        ) : null}
      </>
    );
    const layerConfigComp = (
      <>
        <Divider />
        <Row>
          <span className="align-master-setting-big-title">
            {"4. 附加随机滤镜/特效/贴纸"}
          </span>
        </Row>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`你是否需要附加随机滤镜/特效/贴纸到新建的剪映草稿中？`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              layerConfig.isNeed = e.target.value;
              this.setState({
                modifier: { ...modifier },
              });
            }}
            value={layerConfig.isNeed}
          >
            <Radio value={false}>
              <span className="setting-text-span">{"不需要"}</span>
            </Radio>
            <Radio value={true}>
              <span className="setting-text-span">{"需要"}</span>
            </Radio>
          </Radio.Group>
        </Row>
        {layerConfig.isNeed ? (
          <>
            <Row>
              <span className="align-master-setting-enabled-title">
                {`请你将你想要的滤镜、特效、贴纸都添加到一个草稿里（不是替换的参考草稿，是另外的草稿），然后再下方选中这个草稿（这样本软件才能知道你想添加什么），下面的截图是样例，请准备这样的一个草稿，然后本软件会去里面提取信息（不会改动此草稿）：`}
              </span>
            </Row>
            <Row>
              {
                <img
                  style={{ width: "30%" }}
                  alt="text-gap-filler-demo"
                  src={"./illustration/attach-layer-eg-cn.png"}
                />
              }
            </Row>
            <Row>
              <SelectProject
                onSelectProject={async (pInfo: PInfoType) => {
                  layerConfig.refInfoPath = pInfo.draft_json_file;
                  layerConfig.draftName = pInfo.draft_name;
                  this.setState({
                    modifier: { ...modifier },
                  });
                }}
                renderConfirmContentComp={() => {}}
                headerFinePrint={
                  "请选择草稿（该草稿中的滤镜、特效、贴纸会被参考）"
                }
                skipConfirm
                hideProjectSourceSelect={IS_EN}
              />
            </Row>
            <Row style={{ marginBottom: 5 }}>
              <span>
                {layerConfig.refInfoPath.length > 0
                  ? `已选择草稿 ${layerConfig.draftName}`
                  : "未选择草稿，请选择↑↑↑"}
              </span>
            </Row>
          </>
        ) : null}
      </>
    );
    return (
      <div style={{ height: 450, overflowY: "scroll" }}>
        {audioConfigComp}
        {textConfigComp}
        {transitionConfigComp}
        {layerConfigComp}
      </div>
    );
  };

  render() {
    return (
      <div style={{ marginBottom: 40 }}>
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
        <SelectProject
          onSelectProject={this.handleSelectProject}
          renderConfirmContentComp={() => {}}
          headerFinePrint={"第一步：请在下方点击一个草稿作为参考草稿"}
          skipConfirm
          hideProjectSourceSelect={IS_EN}
        />
        {this.renderReplaceTypeOptions()}
        {this.renderSourceAnalysis()}
        {this.renderSettings()}
        {this.renderFinishCreateProject()}
        {this.renderExecuteReplace()}
        <div style={{ float: "right", marginBottom: 15 }}>
          {this.state.showUndoBtn ? (
            <Button onClick={this.handleClickUndo}>
              {"撤销刚才的操作"}
            </Button>
          ) : null}
        </div>
        <Modal
          open={this.state.isFolderStructureModalOpen}
          onOk={() => {
            this.setState({ isFolderStructureModalOpen: false });
          }}
          closable={false}
          cancelButtonProps={{
            style: {
              display: "none",
            },
          }}
        >
          <div>
             <p style={{ fontSize: 18 }}>
                <strong>你应该有两层文件结构，如下图所示：</strong>
              </p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"爱情片素材子文件夹 -> 爱情片.mp4 和 封面.png"} </p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"↗"}</p>
              <p>{"父文件夹"}</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"↘"}</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"悬疑片素材子文件夹 -> 悬疑片.mp4 和 封面.png"} </p>
              <br />
              <p><strong>{"请注意：这种两层文件结构的要求仅仅是针对于你当前使用的 按组精确替换素材。如果你使用的是左侧的 混剪裂变替换素材，你只需要把所有素材放入同一个文件夹里，保持最简单的单层结构即可。如果你仅仅只需要替换一个素材，那么也请使用混剪裂变替换素材，其最后一个选项选择顺序模式即可。"}</strong></p>
          </div>
        </Modal>
        {this.state.isModifierModalOpen ? (
          <Modal
            width={950}
            open={true}
            onOk={() => {
              this.setState({
                isModifierModalOpen: false,
              });
            }}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
            closable={false}
          >
            {this.renderModifier()}
          </Modal>
        ) : null}
        <Modal
          zIndex={1100}
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
              percent={parseFloat((this.state.progressFraction * 100).toFixed(1))}
              status="active"
            />
          </Modal>
        ): null}
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
                href="https://www.bilibili.com/video/BV19p421Z7bX/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {`【视频教程，是手动创建草稿的蓝色按钮，未涉及红色按钮，但有非常大的参考价值】`}
              </a>
              <p>{"该功能可以按组精确替换图片或视频素材，如果你草稿里只有一个素材需要替换，请选择左侧的混剪裂变替换素材。"}</p>
              <p>{"使用步骤:"}</p>
              <p>{"1. 选择一个草稿作为参考草稿（以此草稿为依据进行替换，生成相似的新草稿）"}</p>
              <p>{"2. 选择替换片段类型。"}</p>
              <p>{"3. 把不超过1000套素材放入各子文件夹中，然后选择这些素材的共同父文件夹（注意是两层结构）。"}</p>
              <p>{"4. 完成替换设置。"}</p>
              <p>{"5. 点击 立即执行 按钮。"}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
