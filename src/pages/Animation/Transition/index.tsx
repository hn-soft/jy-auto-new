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
  Slider,
  InputNumber,
  Radio,
} from "antd";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { RANDOM_MODE, PROJECT_NATION, SOUND_MODE } from "../../../utils/const";
import type { RadioChangeEvent } from "antd";
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
  projectNation: string;
  transitionInfos?: {
    data: {
      category: { key: string; name: string; effects: string[] }[];
      effects: { effect_id: string; name: string; file_url: { uri: string } }[];
    };
  };
  readableDuration: number;
  isMainTrackOnly: boolean;
  randomMode: string;
  curDisplayCount: number;
  soundMode: string;
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

const MAX_EFFECT_COUNT = 20;

export default class Transition extends React.Component<
  PropsType,
  StateType
> {
  categoryKeys: string[] = Array(MAX_EFFECT_COUNT).fill("");
  effectIUs: string[] = Array(MAX_EFFECT_COUNT).fill("");
  existMap: Map<string, string> = new Map();

  constructor(props: PropsType) {
    super(props);
    this.state = {
      projectNation: "",
      transitionInfos: undefined,
      readableDuration: 0.5,
      isMainTrackOnly: true,
      randomMode: RANDOM_MODE.ORDER,
      curDisplayCount: 1,
      soundMode: SOUND_MODE.NO_SOUND,
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

  async componentDidMount() {
    await this.getActivationStatus();
    const projectNation = await this.fetchIsCapCut();
    this.setState({
      projectNation,
    })
    await this.loadTransitionInfos(projectNation);
  }

  fetchIsCapCut = async () => {
    // @ts-ignore
    const isCapCutRes = await window.electronAPI.getIsCapCut();
    const projectNation =
      isCapCutRes.status === "success" && isCapCutRes.data === "true"
        ? PROJECT_NATION.CAPCUT
        : PROJECT_NATION.JIANYING;
    return projectNation;
  };

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  loadTransitionInfos = async (projectNation: string) => {
    // @ts-ignore
    const transitionInfosRes = await window.electronAPI.loadTransitionInfos({
      isCapCut: projectNation === PROJECT_NATION.CAPCUT,
    });
    if (transitionInfosRes.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: transitionInfosRes.data,
      });
    }
    const transitionInfos = JSON.parse(transitionInfosRes.data);
    this.setState({
      transitionInfos,
    });
  };

  handleSelectProject = async (pInfo: PInfoType) => {
    // @ts-ignore
    const res = await window.electronAPI.addTransitions({
      infoPath: pInfo.draft_json_file,
      isCapCut: this.getIsCapCut(),
      readableDuration: this.state.readableDuration,
      effectIdWithFileUris: this.effectIUs
        .slice(0, this.state.curDisplayCount)
        .filter((item) => item.includes("#")),
      isMainTrackOnly: this.state.isMainTrackOnly,
      randomMode: this.state.randomMode,
      soundMode: this.state.soundMode,
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
        resultModalText: `成功了。已经为${res.data.appliedTrackCount}条视频轨道批量添加了总共${res.data.crossTrackAddCount}个转场。`,
        showUndoBtn: true,
      });
    }
  };

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  renderConfirmContentComp = (pInfo: PInfoType) => {
    let randomWords = "";
    switch (this.state.randomMode) {
      case RANDOM_MODE.ORDER:
        randomWords = "按顺序循环添加";
        break;
      case RANDOM_MODE.FLATTEN_RANDOM:
        randomWords = "按均匀随机模式添加";
        break;
      case RANDOM_MODE.PURE_RANDOM:
        randomWords = "按纯随机模式添加";
        break;
    }
    return (
      <div>
        <p>{`你是否确定要给草稿 ${pInfo.draft_name} 批量添加转场？`}</p>
        <p>{`您设置了${
          this.effectIUs
            .slice(0, this.state.curDisplayCount)
            .filter((item) => item.includes("#")).length
        }种转场动画效果，转场时长为${
          this.state.readableDuration
        }s，您希望这些转场被添加到${
          this.state.isMainTrackOnly
            ? "仅主视频轨道"
            : "所有视频轨道（排除掉锁定的视频轨道）"
        }，${randomWords}，${
          this.state.soundMode === SOUND_MODE.YES_SOUND
            ? "需要添加音效"
            : "不需要添加音效"
        }。`}</p>
        <p>{"注意："}</p>
        <p>
          {
            "1. 操作后你可以点右下角撤销按钮撤销本次操作，但还是建议你在剪映中复制草稿作备份。"
          }
        </p>
        <p>{"2. 请确认剪映软件中该草稿处于关闭状态，否则会彼此相互干扰。"}</p>
        <p>{`3. 如果某一个视频片段的时长小于你设置的转场时长的2倍，即${
          this.state.readableDuration * 2
        }s，则因为太短，其左右边缘均不会添加转场。`}</p>
      </div>
    );
  };

  handleClickUndo = async () => {
    this.setState({ isUndoConfirmModalOpen: true });
  };

  handleUndo = async () => {
    // @ts-ignore
    const res = await window.electronAPI.undoAddTransitions();
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
        <p>{`试用版限制只能为不超过1分钟的草稿做操作，正式版没有此上限。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  renderTransitionEffectSelects = () => {
    const { transitionInfos, curDisplayCount } = this.state;
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
          const categoryKey = this.categoryKeys[i];
          const targetedCategory = transitionInfos.data.category.find(
            (item) => item.key === categoryKey
          );
          const effectIdList = targetedCategory ? targetedCategory.effects : [];
          const effectOptions = effectIdList.map((effectId) => {
            const effect = transitionInfos.data.effects.find(
              (item) => item.effect_id === effectId
            );
            // should not be undefined, just in case
            if (effect === undefined) {
              return { label: "", value: "" };
            }

            const isEffectExist =
              this.existMap.get(
                `${effect.effect_id}#${effect.file_url.uri}`
              ) === "true";
            return {
              label: `${effect.name}${isEffectExist ? "" : " (未下载不可用)"}`,
              value: `${effect.effect_id}#${effect.file_url.uri}`,
              disabled: !isEffectExist,
            };
          });
          return (
            <Row key={`effect-${i}-${categoryKey}-${this.effectIUs[i]}`}>
              <Col>
                <Select
                  value={categoryKey || "-- 选择类别 --"}
                  style={{
                    width: 138,
                    marginRight: 5,
                    marginBottom: 12,
                  }}
                  onChange={async (value: string) => {
                    this.categoryKeys[i] = value;
                    this.effectIUs[i] = "";
                    // 提前看具体效果的存在性
                    const targetedCategory = transitionInfos.data.category.find(
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
                          isCapCut: this.getIsCapCut(),
                          effectIU: `${effect.effect_id}#${effect.file_url.uri}`,
                        });
                      this.existMap.set(
                        `${effect.effect_id}#${effect.file_url.uri}`,
                        isExistRes.data
                      );
                    }
                    this.forceUpdate();
                  }}
                  options={categoryOptions}
                />
              </Col>
              {this.categoryKeys[i].length > 0 ? (
                <Col>
                  <Select
                    value={this.effectIUs[i] || "-- 选择具体效果 --"}
                    style={{
                      width: 160,
                      marginBottom: 12,
                    }}
                    onChange={(value: string) => {
                      this.effectIUs[i] = value;
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
                icon={<PlusOutlined  />}
                onClick={() => {
                  if (curDisplayCount < MAX_EFFECT_COUNT) {
                    this.setState({ curDisplayCount: curDisplayCount + 1 });
                  } else {
                    this.setState({
                      isResultModalOpen: true,
                      resultModalText: `已达最大转场效果数量${MAX_EFFECT_COUNT}，不可以再添加更多。如有特殊需要，请付费定制。`,
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
                icon={<MinusOutlined  />}
                onClick={() => {
                  if (curDisplayCount > 1) {
                    this.setState({ curDisplayCount: curDisplayCount - 1 });
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
            <div style={{}}>{`当前数量: ${this.state.curDisplayCount}`}</div>
          </Col>
        </Row>
      </>
    );
  };

  renderOptions = () => {
    const effectOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ paddingBottom: 10 }}
          >
            {`请选择你的${
              this.getIsCapCut() ? "CapCut" : "剪映"
            }草稿所需要的转场动画效果（可点击"+"添加更多）`}
          </span>
        </Row>
        {this.renderTransitionEffectSelects()}
      </>
    );
    const durationOption = (
      <>
        <Row>
          <span
            className="align-master-setting-enabled-title"
            style={{ paddingBottom: 10 }}
          >
            {`请设置你需要的转场时长`}
          </span>
        </Row>
        <Row>
          <InputNumber
            addonBefore={"时长:"}
            addonAfter={"s"}
            min={0.1}
            max={3}
            style={{ width: "150px" }}
            step={0.1}
            value={this.state.readableDuration}
            onChange={(value: number | null) => {
              this.setState({
                readableDuration: typeof value === "number" ? value : 0.5,
              });
            }}
          />
        </Row>
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
          min={0.1}
          max={3}
          onChange={(value: number) => {
            this.setState({ readableDuration: value });
          }}
          value={this.state.readableDuration}
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
      </>
    );
    const trackOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问转场要批量添加到哪些视频轨道?`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const isMainTrackOnly = e.target.value;
              this.setState({ isMainTrackOnly });
            }}
            value={this.state.isMainTrackOnly}
          >
            <Radio value={true}>
              <span className="setting-text-span">仅主视频轨道</span>
            </Radio>
            <Radio value={false}>
              <span className="setting-text-span">
                所有视频轨道（排除掉锁定的视频轨道）
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const randomOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问你希望你选择的转场效果以什么样的顺序添加到视频轨道上?`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const randomMode = e.target.value;
              this.setState({ randomMode });
            }}
            value={this.state.randomMode}
          >
            <Radio value={RANDOM_MODE.ORDER}>
              <span className="setting-text-span">
                按设置中的排列顺序依次添加并循环
              </span>
            </Radio>
            <Radio value={RANDOM_MODE.FLATTEN_RANDOM}>
              <span className="setting-text-span">
                均匀随机模式（随机但尽量避免相邻重复）
              </span>
            </Radio>
            <Radio value={RANDOM_MODE.PURE_RANDOM}>
              <span className="setting-text-span">
                纯随机模式（相邻可能重复）
              </span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
    const soundOption = (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`请问你是否想在转场时添加音效?`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => {
              const soundMode = e.target.value;
              this.setState({ soundMode });
            }}
            value={this.state.soundMode}
          >
            <Radio value={SOUND_MODE.NO_SOUND}>
              <span className="setting-text-span">否，不需要</span>
            </Radio>
            <Radio value={SOUND_MODE.YES_SOUND}>
              <span className="setting-text-span">
                是，需要（使用我放置在音频轨道上的音效片段，
                <span
                  style={{ color: "aqua" }}
                  onClick={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setState({
                      isResultModalOpen: true,
                      resultModalText:
                        "你可以把音频文件拖入时间线，在添加转场时会把音频文件放到动画出现的位置，如果你放入的只有一段音频片段，那么它会重复出现在每个转场位置。如果你把多段音频放在同一轨道，那么它们会被复制，依次循环出现（不是随机出现）。请注意：你需要把这些音频文件放在同一轨道。你可能会问，如果我有多段音频轨道，那么会选择哪段音频轨道上的音频来复制呢？答案是：本软件会试着智能分析，但不一定对，为了避免误判，你可以把其他无关的音频轨道给静音掉或者锁定，本软件会对所有静音的和锁定的轨道视而不见，当你只留下一条非静音非锁定的音频轨道时，那么就选它啦，确凿无误。在本操作完成后，别忘了把其他轨道恢复原状哦。",
                    });
                  }}
                >
                  点此解释
                </span>
                ）
              </span>
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
        {effectOption}
        {durationOption}
        {trackOption}
        {randomOption}
        {soundOption}
      </div>
    );
  };

  getIsCapCut = () => {
    return this.state.projectNation === PROJECT_NATION.CAPCUT;
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
        {this.state.projectNation.length > 0 ? (
          <>
            {this.renderOptions()}
            <SelectProject
              onSelectProject={this.handleSelectProject}
              renderConfirmContentComp={this.renderConfirmContentComp}
              headerFinePrint={""}
              hideProjectSourceSelect
              key={this.state.projectNation}
            />
            <div style={{ float: "right", marginBottom: 15 }}>
              {this.state.showUndoBtn ? (
                <Button onClick={this.handleClickUndo}>
                  {"撤销刚才的操作"}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
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
            <p>{"您是否要撤销刚才的操作？"}</p>
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
                <strong>{`转场功能`}</strong>
              </p>
              <p>{`本功能可以批量添加转场到时间线上的视频轨道。`}</p>
              <p>{`你可以同时设置至多20种转场效果。`}</p>
              <p>{`如果你的目标效果被标记为(未下载不可用)，你可以打开剪映草稿然后点击对应效果右下角的下箭头。然后，回到本页，那个效果就会变成可选了。你只能使用下载过的那些效果。`}</p>
              <p>
                <img
                  style={{ width: "20%" }}
                  alt="download-animation-effect"
                  src={"./illustration/download-animation-effect.png"}
                />
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
