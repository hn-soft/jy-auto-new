import React from "react";
import "./styles.css";
import {
  Modal,
  Button,
  Row,
  Col,
  Progress,
  Radio,
  InputNumber,
  Slider,
} from "antd";
import type { RadioChangeEvent } from "antd";
import { INIT_OBFUSCATOR, IS_EN } from "../../../utils/const";
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

import {ObfuscatorType} from "../../../../electron/utils/types";

type StateType = {
  inputFolderDir: string;
  outputFolderDir: string;
  sceneThreshold: number;
  outputStoredTogether: boolean;
  obfuscator: ObfuscatorType;
  isResultModalOpen: boolean;
  resultModalText: string;
  isProgressModalOpen: boolean;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
  progressFraction: number;
  progressIndication: string;
};

export default class SplitFilesByScene extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      inputFolderDir: "",
      outputFolderDir: "",
      sceneThreshold: 20,
      outputStoredTogether: false,
      obfuscator: INIT_OBFUSCATOR,
      isResultModalOpen: false,
      resultModalText: "",
      isProgressModalOpen: false,
      isExplanationModalOpen: false,
      activationStatus: {
        status: "",
        gt: 0,
      },
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

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  handleSelectFolder = async (folderCase: string) => {
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
      if (folderCase === "input") {
        this.setState({
          inputFolderDir: res.data,
        });
      } else if (folderCase === "output") {
        this.setState({
          outputFolderDir: res.data,
        });
      }
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
        <p>{`试用版限制每次至多可以分割3个视频文件，正式版每次可以分割无限多的视频文件。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
  };

  handleExecuteSplit = async () => {
    this.setState({
      isProgressModalOpen: true,
    });
    const {
      inputFolderDir,
      outputFolderDir,
      sceneThreshold,
      outputStoredTogether,
      obfuscator,
    } = this.state;
    // @ts-ignore
    const res = await window.electronAPI.splitFiles({
      by: "scene",
      inputFolderDir,
      outputFolderDir,
      sceneThreshold,
      outputStoredTogether,
      obfuscator,
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
        resultModalText: `成功了。已经成功分割了${res.data.inputFileCount}个视频文件，得到了共计${res.data.clipCount}个片段。你可以打开输出文件夹进行查看。`,
      });
    }
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
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">
              {"智能镜头分割视频文件(mp4或mov)的基础设置"}
            </span>
          </Row>
          <Row style={{ marginTop: 5 }}>
            <span className="align-master-setting-enabled-title">
              {`待分割的视频文件都存放在哪个文件夹？`}
            </span>
          </Row>
          <Row style={{ marginTop: 6 }}>
            <Button
              type="primary"
              onClick={() => {
                this.handleSelectFolder("input");
              }}
              style={{ marginRight: 13 }}
            >
              {`${
                this.state.inputFolderDir.length > 0 ? "修改" : "选择"
              }输入文件夹`}
            </Button>
          </Row>
          {this.state.inputFolderDir.length > 0 ? (
            <Row
              style={{ marginTop: 10 }}
            >{`已选择：${this.state.inputFolderDir}`}</Row>
          ) : null}
          <Row style={{ marginTop: 10, marginBottom: 4 }}>
            <span className="align-master-setting-enabled-title">
              {`你希望智能分割的粗糙度多大（值越小，分割越细致；值越大，分割越粗略，建议保持默认）？`}
            </span>
          </Row>
          <Row>
            <Col>
              <InputNumber
                addonBefore={"粗糙度:"}
                addonAfter={""}
                min={1}
                max={50}
                style={{ width: "130px" }}
                step={1}
                value={this.state.sceneThreshold}
                onChange={(value: number | null) => {
                  this.setState({
                    sceneThreshold: typeof value === "number" ? value : 10,
                  });
                }}
              />
            </Col>
            <Col style={{ paddingLeft: 10 }}>
              <Slider
                style={{ width: "300px"}}
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
                max={50}
                onChange={(value: number) => {
                  this.setState({ sceneThreshold: value });
                }}
                value={this.state.sceneThreshold}
                step={1}
                tooltip={{
                  formatter: (value: number | undefined) => {
                    return `${value}`;
                  },
                }}
              />
            </Col>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`视频文件分割后的切片文件需要存放在哪个文件夹？（请注意：分割运行时该文件夹内的所有内容会先被删除）`}
            </span>
          </Row>
          <Row style={{ marginTop: 6 }}>
            <Button
              type="primary"
              onClick={() => {
                this.handleSelectFolder("output");
              }}
              style={{ marginRight: 13 }}
            >
              {`${
                this.state.outputFolderDir.length > 0 ? "修改" : "选择"
              }输出文件夹`}
            </Button>
          </Row>
          {this.state.outputFolderDir.length > 0 ? (
            <Row style={{ marginTop: 10 }}>
              <p>{`已选择：${this.state.outputFolderDir}`}</p>
            </Row>
          ) : null}
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`导出的视频文件的存放规则：`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const outputStoredTogether = e.target.value;
                this.setState({ outputStoredTogether });
              }}
              value={this.state.outputStoredTogether}
            >
              <Radio value={false}>
                <span className="setting-text-span">
                  {"放在各自子文件夹里"}
                </span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"全部放在一起"}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row>
            <span
              className="align-master-setting-big-title"
              style={{ paddingTop: 25 }}
            >
              {"（可选）视频切片的多样化设置"}
            </span>
          </Row>
          <Row style={{ marginTop: 5 }}>
            <span className="align-master-setting-enabled-title">
              {`是否需要随机裁剪画面边缘，轻微放大画面10%至20%？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isNeed = e.target.value;
                const { obfuscator } = this.state;
                obfuscator.crop.isNeed = isNeed;
                this.setState({ obfuscator: { ...obfuscator } });
              }}
              value={this.state.obfuscator.crop.isNeed}
            >
              <Radio value={false}>
                <span className="setting-text-span">{"不需要"}</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"需要"}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`是否需要随机加速视频(5%-10%)？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isNeed = e.target.value;
                const { obfuscator } = this.state;
                obfuscator.speeding.isNeed = isNeed;
                this.setState({ obfuscator: { ...obfuscator } });
              }}
              value={this.state.obfuscator.speeding.isNeed}
            >
              <Radio value={false}>
                <span className="setting-text-span">{"不需要"}</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"需要"}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
                {`是否需要裁掉切片的头部和尾部各0.1s？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isNeed = e.target.value;
                const { obfuscator } = this.state;
                obfuscator.edgeThrow.isNeed = isNeed;
                this.setState({ obfuscator: { ...obfuscator } });
              }}
              value={this.state.obfuscator.edgeThrow.isNeed}
            >
              <Radio value={false}>
                <span className="setting-text-span">{"不需要"}</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"需要"}</span>
              </Radio>
            </Radio.Group>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <span className="align-master-setting-enabled-title">
              {`是否需要随机让50%的视频片段左右镜像翻转？`}
            </span>
          </Row>
          <Row className="option-row">
            <Radio.Group
              onChange={(e: RadioChangeEvent) => {
                const isNeed = e.target.value;
                const { obfuscator } = this.state;
                obfuscator.flip.isNeed = isNeed;
                this.setState({ obfuscator: { ...obfuscator } });
              }}
              value={this.state.obfuscator.flip.isNeed}
            >
              <Radio value={false}>
                <span className="setting-text-span">{"不需要"}</span>
              </Radio>
              <Radio value={true}>
                <span className="setting-text-span">{"需要"}</span>
              </Radio>
            </Radio.Group>
          </Row>
        </div>
        <div
          className="align-master-setting-whole-wrapper"
          style={{ marginBottom: 20 }}
        >
          <Button type="primary" size="large" onClick={this.handleExecuteSplit}>
            {"立即执行"}
          </Button>
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
                <strong>智能镜头分割视频文件</strong>
                的功能解释-待补充
              </p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
