import React from "react";
import "./styles.css";
import { Modal, Button, Row } from "antd";
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
  isResultModalOpen: boolean;
  resultModalText: string;
  isExplanationModalOpen: boolean;
  activationStatus: {
    status: string;
    gt: number; // unix timestamp (second)
    trialTimeLeft?: number;
  };
};

export default class MasterReplacementFileLevelOne2Two extends React.Component<
  PropsType,
  StateType
> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      isResultModalOpen: false,
      resultModalText: "",
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

  handleClickModalOk = () => {
    this.setState({ isResultModalOpen: false });
    this.getActivationStatus();
  };

  handleSelectFolder = async () => {
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
      await this.changeFileLevelOne2Two({
        folderDir: res.data,
      });
    }
  };

  changeFileLevelOne2Two = async (param: { folderDir: string }) => {
    // @ts-ignore
    const res = await window.electronAPI.changeFileLevelOne2Two(param);
    if (res.status === "error") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `失败了。原因: ${res.data}`,
      });
    }
    if (res.status === "success") {
      this.setState({
        isResultModalOpen: true,
        resultModalText: `成功了。已经成功移动了${res.data.movedFileCount}个${res.data.movedFileExt}文件进入子文件夹。`,
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
        <p>{`此辅助功能（文件结构一层变两层）的使用不计入试用次数，请尽情使用。`}</p>
        <p>
          <strong>{"激活正式版的方式："}</strong>
        </p>
        <p>{`← 点击左侧菜单中的"激活软件"页面。`}</p>
      </div>
    );
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
            <span className="align-master-setting-big-title">{"文件结构一层变两层"}</span>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button
              type="primary"
              onClick={this.handleSelectFolder}
              style={{ marginRight: 13 }}
            >
              {"选择要操作的素材文件夹"}
            </Button>
          </Row>
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
                <strong>文件结构一层变两层</strong>的功能解释
              </p>
              <p>
                在主功能（按组精确）里，我们要求待替换素材存放成两层文件结构。比如：
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"爱情片素材子文件夹 -> 爱情片.mp4"}{" "}
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"↗"}
              </p>
              <p>{"父文件夹"}</p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"↘"}
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"悬疑片素材子文件夹 -> 悬疑片.mp4"}{" "}
              </p>
              <p>
                {
                  "但是，有的用户在收集素材时会把 爱情片.mp4 和 悬疑片.mp4 放在同一个文件夹里，就像这样："
                }
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"爱情片.mp4"}{" "}
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"↗"}
              </p>
              <p>{"父文件夹"}</p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"↘"}
              </p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                {"悬疑片.mp4"}{" "}
              </p>
              <p>
                {
                  "这时，为了使用主功能（图片视频素材替换），用户不得不新建两个文件夹，一个存放 爱情片.mp4，另一个存放 悬疑片.mp4，以形成两层文件夹结构。本功能就是帮你批量来完成这个操作的功能，只要一键点击，就可以让你从下面这个文件结构变成上面那个文件结构。"
                }
              </p>
              <p>
                {
                  "如果你是这种情况，你只需批量替换草稿里的一个素材，不管是一个mp4文件，还是一个png文件，只要你是只需要替换一个文件，你都可以先把 比如 爱情片.mp4 和 悬疑片.mp4 放在同一个文件夹里。"
                }
              </p>
              <p>
                {
                  "然后本功能执行完之后，每个素材文件给你放入一个新建的子文件夹里。形成两级文件夹结构，便于你使用主功能（图片视频素材替换）。"
                }
              </p>
              <p>{"注意事项："}</p>
              <p>
                {
                  "1. 本辅助功能只适用于你只需要替换草稿里的一个素材，如果说两个的话，假设有2个mp4和2个png放在一起，本功能不知道哪个mp4搭配哪个png文件呀。所以不可以这样。"
                }
              </p>
              <p>
                {
                  "2. 本辅助功能只适用于文件夹里有2个至100个素材。如果超过100个就不可以了，毕竟主功能（图片视频素材替换）只能一次批量替换100组素材，所以本功能也做出相似限制。为了防止误操作，本功能也不可针对1个文件处理，如果只有1个素材文件，请自行新建一个子文件夹，也不辛苦。"
                }
              </p>
              <p>
                {
                  "3. 这2到100个素材的格式必须相同，连大小写也需要保持一致。不可以jpg和JPG共存，如果有不同格式文件，那么本操作之后选择最多后缀的那个文件格式变两层结构。"
                }
              </p>
              <p>
                {
                  "4. 本功能新建的子文件夹名即是素材名称前缀，比如你的素材是a.png, b.png, c.png，那么执行完后，他们会被放入名为a，b，c的文件夹中。"
                }
              </p>
              <br />
              <p>{`最后，祝你使用愉快。本功能（文件结构一层变两层功能）的使用不计入使用次数扣除，请尽情使用。使用方法是直接下方选择按钮，选择对应目录，即可完成操作。`}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }
}
