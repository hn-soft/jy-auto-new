import React from "react";
import "./styles.css";
import { Modal, Spin } from "antd";
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
  isModalOpen: boolean;
  modalText: string;
  productCode: string;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
    isForever?: number;
    tier?: string;
    oftl?: string;
  };
  appVersion: string;
  isActivating: boolean;
  contact: string;
};

export default class Activation extends React.Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      isModalOpen: false,
      modalText: "",
      productCode: "",
      activationStatus: {
        status: "",
        gt: 0,
      },
      appVersion: "",
      isActivating: false,
      contact: "微信 yshelo 或 QQ 1479058",
    };
  }

  componentDidMount() {
    this.flushProductCode();
    this.getActivationStatus();
    this.getAppVersion();
    this.getContact();
  }

  flushProductCode = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getRendererProductCode();
    if (res.status === "error") {
      alert(`获取产品信息码失败，请尝试连接互联网。${res.data}`);
      return;
    }
    if (res.status === "success") {
      this.setState({
        productCode: res.data,
      });
    }
  };

  getActivationStatus = async () => {
    // @ts-ignore
    const res = await window.electronAPI.getActivationStatus();
    this.setState({
      activationStatus: res,
    });
  };

  getAppVersion = async () => {
    // @ts-ignore
    const appVersion = await window.electronAPI.getAppVersion();
    this.setState({
      appVersion,
    });
  };

  getContact = async () => {
    // @ts-ignore
    const contactRes = await window.electronAPI.getContact();
    this.setState({
      contact: contactRes.data,
    });
  };

  handleClickCopy = async () => {
    await navigator.clipboard.writeText(this.state.productCode);
    this.setState({
      isModalOpen: true,
      modalText: `产品信息码已经复制到您的剪切板。欢迎联系 ${this.state.contact} 获取激活码。`,
    });
  };

  handleClickActivate = async () => {
    if (this.state.isActivating) {
      return;
    }
    this.setState({
      isActivating: true,
    });
    const activationCodeInputElement = document.getElementById(
      "activation-activation-code"
    );
    // @ts-ignore
    const activationCodeInput = activationCodeInputElement.value;
    if (!activationCodeInput || !/^\d{20}$/.test(activationCodeInput)) {
      this.setState({
        isModalOpen: true,
        modalText: "你输入的不是20位数，请检查你的输入。注意不要有空格。",
        isActivating: false,
      });
      return;
    }
    // @ts-ignore
    const res = await window.electronAPI.activateProduct({
      productCode: this.state.productCode,
      activationCode: activationCodeInput,
    });
    if (res.status === "error") {
      this.setState({
        isModalOpen: true,
        modalText: `激活失败。${res.data}`,
        isActivating: false,
      });
      return;
    }
    if (res.status === "success") {
      const dataIsForever = res.dataIsForever;
      const trialingIndication = !!dataIsForever
        ? "您刚才激活的正式版永久有效，如有其他问题请联系我。"
        : `您刚才激活的正式版有效期至 ${res.data}。请注意：下次您续费时提供产品信息码时需要复制新的码，请勿重复发送本次的产品信息码。`;
      let tierIndication = "";
      const tier = res.tier;
      if (tier === "basic") {
        tierIndication =
          "您刚才激活的是限制使用次数的基础正式版，重启本软件后您可以来到激活软件页（当前页）查看实时更新的剩余可用次数。";
      } else if (tier === "standard") {
        tierIndication = "您刚才激活的是不限使用次数的正式版。";
      } else {
        // will not happen
        tierIndication = "您刚才激活的是有时效性的正式版。";
      }
      this.setState({
        isModalOpen: true,
        modalText: `激活成功。重启本软件后就是正式版了。${tierIndication}${trialingIndication}`,
        isActivating: false,
      });
      return;
    }
  };

  renderProductNameSuffix = () => {
    const { activationStatus } = this.state;
    if (activationStatus.status === "") {
      return "";
    }
    if (activationStatus.status === "trial") {
      return <strong>{"(试用版)"}</strong>;
    }
    if (activationStatus.status === "official") {
      // official time left ending str
      let oftleStr = "";
      if (activationStatus.tier === "basic") {
        oftleStr = ` - 有效期内剩余可用次数: ${activationStatus.oftl} 次`;
      }
      if (activationStatus.tier === "standard") {
        oftleStr = ` - 有效期内不限使用次数`;
      }
      return <strong>{`(正式版) - 未过期${oftleStr}`}</strong>;
    }
    if (activationStatus.status === "expired") {
      return <strong>{"(正式版) - 已过期"}</strong>;
    }
    return "";
  };

  renderInstruction = () => {
    const { activationStatus } = this.state;
    if (activationStatus.status === "") {
      return null;
    }
    const activationWay = (
      <p className="activation-top-text">
        {"激活正式版的方式：联系 "}
        {this.state.contact}
        {
          " 后在线转账并发送上方的产品信息码给我，我会把对应的激活码发送给您。您填入输入框即可完成激活。后续如果您有定制化需求，也欢迎与我联系。"
        }
      </p>
    );
    const pricing = (
      <>
        <p className="activation-top-text">
          正式版的价格分为三档供您选择：
          <br />
          1.&nbsp;
          <strong>月度正式版</strong>
          ：价格是每个月125元，付费激活后，在一个月内，您将获得本软件所有功能无限次数的使用授权。
          <br />
          2.&nbsp;
          <strong>半年度正式版</strong>
          ：价格是每半年500元（相当于减免二个月），付费激活后，在半年内，您将获得本软件所有功能无限次数的使用授权。
          <br />
          3.&nbsp;
          <strong>年度正式版</strong>
          ：价格是每年875元（相当于减免五个月），付费激活后，在一年内，您将获得本软件所有功能无限次数的使用授权。
          <br />
          <br />
          此外，如果您犹豫不决，您也可以选择付费30元开通一天的正式版，在24小时内尽情使用本软件各功能，再决定是否续费长期（两天内您决定续费的话可抵消掉30元费用）。
          <br/>
          <br/>
          您可以查看"更多软件资源-视频创作软件"获知本软件的最新版本号（页面中本软件名后面的版本号如果比当前版本号高，则说明有更新版本）。如果您使用的是正式版，下载安装新版本替换后打开就自动是激活了的正式版，且有效期不变。（作者以后开发的离线剪映中批量代替繁琐手动功能基本都会收拢在本软件的左侧目录，避免先前用户们安装多个软件的麻烦，本软件持续更新，接下来的更新方向包括沿着字幕左右侧切割视频和按固定时长切割视频导出视频，欢迎正式版用户提意见。）
        </p>
      </>
    );
    if (activationStatus.status === "trial") {
      return (
        <>
          <p className="activation-top-text">
            {"剩余试用次数："}
            <strong>{`${activationStatus.trialTimeLeft}`}</strong>。
            {
              "时间就是金钱，本软件诚挚为您节约繁琐操作的时间，就是在为您节约金钱。软件创作不易，希望得到您的支持。产品信息码在本页面上方。欢迎您激活正式版，您的支持是我继续创作的动力~"
            }
          </p>
          {pricing}
          {activationWay}
        </>
      );
    }
    if (activationStatus.status === "official") {
      return (
        <>
          <p className="activation-top-text">
            <span>{`您可以正常使用本软件直到过期。过期时间：`}</span>
            <strong>{`${new Date(activationStatus.gt * 1000).toLocaleDateString(
              "zh-CN",
              {
                timeZone: "Asia/Shanghai",
              }
            )} ${new Date(activationStatus.gt * 1000).toLocaleTimeString(
              "zh-CN",
              {
                timeZone: "Asia/Shanghai",
              }
            )}`}</strong>
            <span>
              {
                "；您也可以提前续费本软件，请注意此次产品信息码与上次不同，请重新复制产品信息码，请勿重复发送上次的码。"
              }
            </span>
          </p>
          {pricing}
          {activationWay}
        </>
      );
    }
    if (activationStatus.status === "expired") {
      return (
        <>
          <p className="activation-top-text">
            <span>{`当前激活码过期时间：`}</span>
            <strong>{`${new Date(activationStatus.gt * 1000).toLocaleDateString(
              "zh-CN",
              {
                timeZone: "Asia/Shanghai",
              }
            )} ${new Date(activationStatus.gt * 1000).toLocaleTimeString(
              "zh-CN",
              {
                timeZone: "Asia/Shanghai",
              }
            )}`}</strong>
            <span>
              {
                "。您可以填入新的激活码续费本产品，然后继续正常使用。请注意此次产品信息码与上次不同，请重新复制产品信息码，请勿重复发送上次的码。"
              }
            </span>
          </p>
          {pricing}
          {activationWay}
        </>
      );
    }
  };

  getTopTextBackgroundColor = () => {
    const { activationStatus } = this.state;
    if (activationStatus.status === "") {
      return "black";
    }
    if (activationStatus.status === "trial") {
      return "#bf0404dd";
    }
    if (activationStatus.status === "official") {
      return "#1d9128dd";
    }
    if (activationStatus.status === "expired") {
      return "#e67008dd";
    }
    return "black";
  };

  renderAppNameAndVersion = () => {
    return (
      <p className="activation-top-text">
        您正在使用的是剪映自动化大师 {" "}
        {this.renderProductNameSuffix()}
        {`，当前版本号是 `}
        <strong>{this.state.appVersion}</strong>。
      </p>
    );
  };

  render() {
    const { activationStatus } = this.state;
    if (activationStatus.isForever) {
      return (
        <div>
          <div
            className="activation-top-text-wrapper"
            style={{ backgroundColor: this.getTopTextBackgroundColor() }}
          >
            {this.renderAppNameAndVersion()}
            <p className="activation-top-text">
              您已经激活了永不过期的正式版软件，无需再次激活。
            </p>
            <p className="activation-top-text">
              您可以查看“更多软件资源”查看软件是否有更新（看版本号，若比此软件现有版本号高则说明有更新）。您可以不需要额外付费就更新本软件。您也可以看看是否有符合您需求的其他软件。
            </p>
            <p className="activation-top-text">
              {"如有问题请联系 "}
              {this.state.contact}
              {"。"}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ marginTop: 25, marginBottom: 25 }}>
          <div className="activation-input-wrapper">
            <div className="activation-code-prompt">
              <span className="activation-code-prompt-content">
                产品信息码：
              </span>
            </div>
            <input
              type="text"
              id="activation-product-code"
              value={this.state.productCode}
            />
            <div
              id="activation-product-code-copy-words"
              onClick={this.handleClickCopy}
            >
              复制
            </div>
          </div>
          <div className="activation-input-wrapper">
            <div className="activation-code-prompt">
              <span className="activation-code-prompt-content">激活码：</span>
            </div>
            <input
              type="text"
              id="activation-activation-code"
              placeholder="请输入"
            />
            <div id="activation-code-verify" onClick={this.handleClickActivate}>
              {this.state.isActivating ? (
                <Spin
                  size="small"
                  style={{ paddingLeft: 11, paddingRight: 11 }}
                />
              ) : (
                <span>激活</span>
              )}
            </div>
          </div>
        </div>
        <div
          className="activation-top-text-wrapper"
          style={{ backgroundColor: this.getTopTextBackgroundColor() }}
        >
          {this.renderAppNameAndVersion()}
          {this.renderInstruction()}
        </div>
        {this.state.isModalOpen ? (
          <Modal
            open={this.state.isModalOpen}
            onOk={() => {
              this.setState({
                isModalOpen: false,
                modalText: "",
              });
            }}
            closable={false}
            cancelButtonProps={{
              style: {
                display: "none",
              },
            }}
          >
            <p>{this.state.modalText}</p>
          </Modal>
        ) : null}
      </div>
    );
  }
}
