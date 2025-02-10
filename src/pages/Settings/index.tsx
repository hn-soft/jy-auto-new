import React from "react";
import "./styles.css";
import { Modal, Row, Col, Radio, InputNumber, Button } from "antd";
import { PROJECT_NATION } from "../../utils/const";
import { IS_EN } from "../../utils/const";
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
  firstProjectDevX: number;
  firstProjectDevY: number;
  batchReplaceClickExportWindow: boolean;
  is3ExitWindow: boolean;
  isResultModalOpen: boolean;
  resultModalText: string;
};

const settingW = IS_EN ? "Settings" : "设置";
const projectSourceW = IS_EN ? "Project Source:" : "草稿来源：";
const successConfiguredW = IS_EN ? "Successfully configured" : "设置成功";
const saveW = IS_EN ? "Save" : "保存";
const DevW = IS_EN
  ? "Latest Project Clicking Deviation:"
  : "点击最新草稿位置偏移值：";
const ClickExportW = IS_EN
  ? "Need to click at the export window after export finishes to keep focus?"
  : "是否在导出结束后点击导出窗口以确保焦点没有偏移？";
const YesW = IS_EN ? "Yes" : "是";
const NoW = IS_EN ? "No" : "否";
const exitWayW = IS_EN ? "Using Confirmed Exit Way?" : "自动化混剪时是否采用验证式退出法？";

export default class Settings extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      projectNation: "",
      firstProjectDevX: 0,
      firstProjectDevY: 0,
      batchReplaceClickExportWindow: true,
      is3ExitWindow: false,
      isResultModalOpen: false,
      resultModalText: "",
    };
  }

  async componentDidMount() {
    const projectNation = await this.fetchIsCapCut();
    this.setState({
      projectNation,
    });
    const deviationRes = await this.fetchFirstProjectClickDeviation();
    this.setState({
      firstProjectDevX: deviationRes.x,
      firstProjectDevY: deviationRes.y,
    });
    const batchReplaceClickExportWindowRes =
      await this.fetchBatchReplaceClickExportWindow();
    this.setState({
      batchReplaceClickExportWindow: batchReplaceClickExportWindowRes,
    });
    const is3ExitWindowRes = await this.fetchIs3ExitWindow();
    this.setState({
      is3ExitWindow: is3ExitWindowRes,
    });
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

  fetchFirstProjectClickDeviation = async () => {
    // @ts-ignore
    return await window.electronAPI.getFirstProjectClickDeviation();
  };

  fetchBatchReplaceClickExportWindow = async () => {
    // @ts-ignore
    return await window.electronAPI.getBatchReplaceClickExportWindow();
  };

  fetchIs3ExitWindow = async () => {
    // @ts-ignore
    return await window.electronAPI.getIs3ExitWindow();
  };

  renderProjectSource = () => {
    return (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`${projectSourceW}`}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={async (e: RadioChangeEvent) => {
              const projectNation = e.target.value;
              // @ts-ignore
              await window.electronAPI.switchNation(
                projectNation === PROJECT_NATION.CAPCUT
              );

              this.setState({
                projectNation,
                isResultModalOpen: true,
                resultModalText: `${successConfiguredW}`,
              });
            }}
            value={this.state.projectNation}
          >
            <Radio value={PROJECT_NATION.JIANYING}>
              <span className="setting-text-span">{"剪映"}</span>
            </Radio>
            <Radio value={PROJECT_NATION.CAPCUT}>
              <span className="setting-text-span">{"CapCut(剪映国际版)"}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
  };

  renderFirstProjectClickDeviation = () => {
    return (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {`${DevW}`}
          </span>
        </Row>
        <Row className="option-row">
          <Col span={8}>
            <InputNumber
              addonBefore={"X:"}
              min={-2000}
              max={2000}
              style={{ marginRight: "10px" }}
              step={1}
              value={this.state.firstProjectDevX}
              onChange={(value: number | null) => {
                this.setState({
                  firstProjectDevX: typeof value === "number" ? value : 0,
                });
              }}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              addonBefore={"Y:"}
              min={-2000}
              max={2000}
              style={{ marginRight: "10px" }}
              step={1}
              value={this.state.firstProjectDevY}
              onChange={(value: number | null) => {
                this.setState({
                  firstProjectDevY: typeof value === "number" ? value : 0,
                });
              }}
            />
          </Col>
          <Col span={8}>
            <Button
              type="primary"
              style={{ marginRight: "10px" }}
              onClick={async () => {
                // @ts-ignore
                await window.electronAPI.setFirstProjectClickDeviation({
                  x: this.state.firstProjectDevX,
                  y: this.state.firstProjectDevY,
                });
                this.setState({
                  isResultModalOpen: true,
                  resultModalText: `${successConfiguredW}`,
                });
              }}
            >
              {`${saveW}`}
            </Button>
          </Col>
        </Row>
      </>
    );
  };

  renderBatchReplaceClickExportWindow = () => {
    return (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {ClickExportW}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={async (e: RadioChangeEvent) => {
              const selectedVal = e.target.value;
              console.log(selectedVal);
              // @ts-ignore
              await window.electronAPI.setBatchReplaceClickExportWindow(
                selectedVal
              );

              this.setState({
                batchReplaceClickExportWindow: selectedVal,
                isResultModalOpen: true,
                resultModalText: `${successConfiguredW}`,
              });
            }}
            value={this.state.batchReplaceClickExportWindow}
          >
            <Radio value={true}>
              <span className="setting-text-span">{YesW}</span>
            </Radio>
            <Radio value={false}>
              <span className="setting-text-span">{NoW}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
  };

  renderIs3ExitWindow = () => {
    return (
      <>
        <Row>
          <span className="align-master-setting-enabled-title">
            {exitWayW}
          </span>
        </Row>
        <Row className="option-row">
          <Radio.Group
            onChange={async (e: RadioChangeEvent) => {
              const selectedVal = e.target.value;
              // @ts-ignore
              await window.electronAPI.setIs3ExitWindow(selectedVal);

              this.setState({
                is3ExitWindow: selectedVal,
                isResultModalOpen: true,
                resultModalText: successConfiguredW,
              });
            }}
            value={this.state.is3ExitWindow}
          >
            <Radio value={true}>
              <span className="setting-text-span">{YesW}</span>
            </Radio>
            <Radio value={false}>
              <span className="setting-text-span">{NoW}</span>
            </Radio>
          </Radio.Group>
        </Row>
      </>
    );
  };

  handleClickModalOk = () => {
    this.setState({
      isResultModalOpen: false,
      resultModalText: "",
    });
  };

  render() {
    return (
      <div>
        <div className="align-master-setting-whole-wrapper">
          <Row>
            <span className="align-master-setting-big-title">{settingW}</span>
          </Row>
          {!IS_EN ? this.renderProjectSource() : null}
          {this.renderFirstProjectClickDeviation()}
          {this.renderBatchReplaceClickExportWindow()}
          {this.renderIs3ExitWindow()}
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
      </div>
    );
  }
}
