import React from "react";
import { Modal, Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import "./styles.css";

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
type PropsType = {
  onSelectProject: (pInfo: PInfoType) => void;
  onPreselectProject?: (pInfo: PInfoType) => void;
  renderConfirmContentComp: (pInfo: PInfoType) => any;
  headerFinePrint: string;
  disabled?: boolean;
  hideProjectSourceSelect: boolean;
  skipConfirm?: boolean;
};

type StateType = {
  pInfoArr: PInfoType[];
  errorMsg: string | null;
  showRecent: boolean;
  selectedPInfo: PInfoType | null;
  projectNation: string;
};

const PROJECT_NATION = {
  JIANYING: "jianying",
  CAPCUT: "capcut",
};

export default class SelectProject extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      pInfoArr: [],
      errorMsg: null,
      showRecent: true,
      selectedPInfo: null,
      projectNation: "",
    };
  }

  componentDidMount(): void {
    this.loadProjectInfos();
    this.getIsCapcut();
  }

  getIsCapcut = async () => {
    // @ts-ignore
    const isCapCutRes = await window.electronAPI.getIsCapCut();
    const projectNation =
      isCapCutRes.status === "success" && isCapCutRes.data === "true"
        ? PROJECT_NATION.CAPCUT
        : PROJECT_NATION.JIANYING;
    this.setState({
      projectNation,
    });
  };

  loadProjectInfos = async () => {
    // @ts-ignore
    const projectInfos = await window.electronAPI.loadProjectInfos();
    if (projectInfos.status === "error") {
      this.setState({ errorMsg: projectInfos.data });
      return;
    }
    try {
      const storeInfos = JSON.parse(projectInfos.data);
      const pInfoArr = storeInfos.all_draft_store;
      if (!Array.isArray(pInfoArr)) {
        this.setState({
          errorMsg:
            "您没安装剪映或CapCut，或您刚安装后还没来得及新建任何草稿，所以无法使用",
        });
        return;
      }
      pInfoArr.sort((a, b) => b.tm_draft_modified - a.tm_draft_modified);
      this.setState({ pInfoArr });
    } catch (e) {
      this.setState({
        // @ts-ignore
        errorMsg: `您没安装剪映或CapCut，或您刚安装后还没来得及新建任何草稿，所以无法使用 ${e?.message}`,
      });
      return;
    }
  };

  onChangeProjectNation = async (e: RadioChangeEvent) => {
    const nation = e.target.value;
    // @ts-ignore
    await window.electronAPI.switchNation(nation === PROJECT_NATION.CAPCUT);
    this.setState({
      projectNation: nation,
    });
    this.loadProjectInfos();
  };

  render() {
    const { pInfoArr, showRecent, errorMsg, selectedPInfo } = this.state;
    if (errorMsg) {
      return <div>{errorMsg}</div>;
    }
    const targetPInfoArr = showRecent
      ? pInfoArr.slice(0, Math.min(pInfoArr.length, 4))
      : pInfoArr;
    return (
      <div>
        <div className="select-project-title-area">
          <div className="select-projects-info-title">
            本地草稿&nbsp;
            <span className="select-projects-info-title-trialing">
              &nbsp;{this.props.headerFinePrint}
            </span>
            <span
              className="select-refresh-project-infos"
              onClick={() => {
                this.loadProjectInfos();
              }}
            >
              ⟳
            </span>
          </div>
          <div
            className="select-recent-all"
            onClick={() => {
              this.setState({ showRecent: !showRecent });
            }}
          >
            {showRecent ? "展开所有" : "展示近期"}
          </div>
        </div>
        {!this.props.hideProjectSourceSelect ? (
          <div className="select-project-source-area">
            <div style={{ fontSize: 15, paddingBottom: 2, paddingRight: 20 }}>
              {"草稿来源:"}
            </div>
            {this.state.projectNation.length > 0 ? (
              <Radio.Group
                onChange={this.onChangeProjectNation}
                value={this.state.projectNation}
              >
                <Radio value={PROJECT_NATION.JIANYING}>
                  <span style={{ fontSize: 15 }}>{"剪映"}</span>
                </Radio>
                <Radio value={PROJECT_NATION.CAPCUT}>
                  <span style={{ fontSize: 15 }}>{"CapCut (剪映国际版)"}</span>
                </Radio>
              </Radio.Group>
            ) : null}
          </div>
        ) : null}
        <div className="select-project-info">
          {targetPInfoArr.map((pInfo) => {
            return (
              <div
                key={pInfo.draft_name}
                onClick={() => {
                  if (this.props.disabled) {
                    alert("你不可以使用本功能");
                    return;
                  }
                  this.setState({
                    selectedPInfo: pInfo,
                  });
                  if (this.props.onPreselectProject) {
                    this.props.onPreselectProject(pInfo);
                  }
                  if (this.props.skipConfirm) {
                    this.props.onSelectProject(pInfo);
                  }
                }}
              >
                <div className="select-project-info-name">
                  {pInfo.draft_name}
                </div>
                <div className="select-project-info-time">{`最近编辑：${new Date(
                  pInfo.tm_draft_modified / 1000
                ).toLocaleString("zh-CN")}`}</div>
              </div>
            );
          })}
        </div>
        {(!this.props.skipConfirm && selectedPInfo)? (
          <Modal
            open={true}
            onOk={() => {
              // just for typing
              if (!selectedPInfo) {
                return;
              }
              this.props.onSelectProject(selectedPInfo);
              this.setState({
                selectedPInfo: null,
              });
            }}
            onCancel={() => {
              this.setState({
                selectedPInfo: null,
              });
            }}
            closable={false}
          >
            {this.props.renderConfirmContentComp(selectedPInfo)}
          </Modal>
        ) : null}
      </div>
    );
  }
}
