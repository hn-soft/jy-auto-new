import React, { useState, useEffect } from "react";
import "./App.css";
import ReplaceMaterial from "./pages/Replacement/ReplaceMaterial";
import RefillMaterial from "./pages/Replacement/RefillMaterial";
import PartitionRefillMaterial from "./pages/Replacement/PartitionRefillMaterial";
import MasterReplacementFileLevelOne2Two from "./pages/Replacement/Secfunc/MasterReplacementFileLevelOne2Two";
import RenameExtensionCase from "./pages/Replacement/Secfunc/RenameExtensionCase";
import RenameReplacedOutput from "./pages/Replacement/Secfunc/RenameReplacedOutput";
import SplitFilesByTime from "./pages/Split/SplitFilesByTime";
import SplitFilesByScene from "./pages/Split/SplitFilesByScene";
import InOutCombo from "./pages/Animation/InOutCombo";
import Keyframe from "./pages/Animation/Keyframe";
import Sticker from "./pages/Animation/Sticker";
import Effect from "./pages/Animation/Effect";
import Transition from "./pages/Animation/Transition";
import Filter from "./pages/Animation/Filter";
import Master from "./pages/Alignment/Master";
import MasterProSubTrans from "./pages/Alignment/MasterPro/MasterProSubTrans";
import CutMsAudio from "./pages/Alignment/MasterPro/CutMsAudio";
import MasterProAlign from "./pages/Alignment/MasterPro/MasterProAlign";
import SpiritAlign from "./pages/Alignment/Spirit/SpiritAlign";
import SpiritCalibrate from "./pages/Alignment/Spirit/Secfunc/SpiritCalibrate";
import ProfessionalAlign from "./pages/Alignment/Professional/ProfessionalAlign";
import ProfessionalAudioMerger from "./pages/Alignment/Professional/Secfunc/ProfessionalAudioMerger";
import ProfessionalTextGapFiller from "./pages/Alignment/Professional/Secfunc/ProfessionalTextGapFiller";
import ProfessionalTextMerger from "./pages/Alignment/Professional/Secfunc/ProfessionalTextMerger";
import ProfessionalCutAudioByBeat from "./pages/Alignment/Professional/Secfunc/ProfessionalCutAudioByBeat";
import ExportMainTrackAllClips from "./pages/Export/ExportMainTrackAllClips";
import Settings from "./pages/Settings";
import Activation from "./pages/Activation";
import VideoSoftwares from "./pages/MoreSoftwares/VideoSoftwares";
import Innovation from "./pages/MoreSoftwares/Innovation";
import {
  TranslationOutlined,
  SnippetsOutlined,
  SettingOutlined,
  PicCenterOutlined,
  PieChartOutlined,
  SplitCellsOutlined,
  MergeCellsOutlined,
  CommentOutlined,
  PlusSquareOutlined,
  CompassOutlined,
  LeftCircleOutlined,
  LeftSquareOutlined,
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  ScissorOutlined,
  ExportOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, ConfigProvider, theme, Modal } from "antd";
import zhCN from "antd/locale/zh_CN";

const { Content, Sider } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem("对齐类", "Alignment", <PicCenterOutlined  />, [
    getItem("对齐精灵", "Spirit", <PlusSquareOutlined  />, [
      getItem(
        "语音与固定字幕对齐",
        "SpiritAlign",
        <MergeCellsOutlined  />
      ),
      getItem(
        "次要功能辅助",
        "SpiritSecfunc",
        <PlusSquareOutlined  />,
        [
          getItem(
            "字幕面向固定语音校准",
            "SpiritCalibrate",
            <CompassOutlined  />
          ),
        ]
      ),
    ]),
    getItem(
      "对齐大师(非Pro;不动视频)",
      "Master",
      <PlusSquareOutlined  />
    ),
    getItem(
      "对齐大师Pro",
      "MasterPro",
      <PlusSquareOutlined  />,
      [
        getItem(
          "1. (不存在的)字幕翻译",
          "MasterProSubTrans",
          <TranslationOutlined  />
        ),
        getItem(
          "2. 提取字幕+分割长音频",
          "CutMsAudio",
          <SplitCellsOutlined  />
        ),
        getItem(
          "3. 语音字幕画面共同对齐",
          "MasterProAlign",
          <PicCenterOutlined  />
        ),
      ],
    ),
    getItem("对齐能手", "Professional", <PlusSquareOutlined  />, [
      getItem(
        "对齐图片（或视频）与字幕（或音频）",
        "ProfessionalAlign",
        <MergeCellsOutlined  />
      ),
      getItem(
        "次要功能辅助",
        "ProfessionalSecfunc",
        <PlusSquareOutlined  />,
        [
          getItem(
            "填补字幕间隙",
            "ProfessionalTextGapFiller",
            <MergeCellsOutlined  />
          ),
          getItem(
            "字幕向左紧靠",
            "ProfessionalTextMerger",
            <LeftSquareOutlined  />
          ),
          getItem(
            "音频向左紧靠",
            "ProfessionalAudioMerger",
            <LeftCircleOutlined  />
          ),
          getItem(
            "沿着节拍切割音频",
            "ProfessionalCutAudioByBeat",
            <ScissorOutlined  />
          )
        ]
      ),
    ]),
  ]),
  getItem("批量动画", "Animation", <SplitCellsOutlined  />, [
    getItem("关键帧动画", "Keyframe", <SplitCellsOutlined  />),
    getItem("出入场组合动画", "InOutCombo", <SplitCellsOutlined  />),
    getItem("贴纸", "Sticker", <SplitCellsOutlined  />),
    getItem("特效", "Effect", <SplitCellsOutlined  />),
    getItem("转场", "Transition", <SplitCellsOutlined  />),
    getItem("滤镜", "Filter", <SplitCellsOutlined  />),
  ]),
  getItem("批量替换", "Replacement", <SplitCellsOutlined  />, [
    getItem("按组精确替换素材", "ReplaceMaterial", <PicCenterOutlined  />),
    getItem("混剪裂变替换素材", "RefillMaterial", <SnippetsOutlined  />),
    getItem("分区混剪裂变替换素材", "PartitionRefillMaterial", <SnippetsOutlined  />),    
    getItem("次要功能辅助", "MasterReplacementSecfunc", <PlusSquareOutlined  />, [
      // getItem("文件结构一层变两层", "MasterReplacementFileLevelOne2Two", <SnippetsOutlined  /> ),
      getItem("素材后缀大小写改变", "RenameExtensionCase", <SnippetsOutlined  />),
      getItem("重命名导出的视频", "RenameReplacedOutput",  <SnippetsOutlined  />),
    ]),
  ]),
  getItem("批量分割", "Split", <ScissorOutlined  />, [
    getItem("多文件操作", "SplitFiles", <SnippetsOutlined  />, [
      getItem("按固定时长分割", "SplitFilesByTime", <ScissorOutlined  />),
      getItem("智能镜头分割", "SplitFilesByScene", <ScissorOutlined  />),
    ]),
  ]),
  getItem("批量导出", "Export", <ExportOutlined  />, [
    getItem("主轨道所有片段导出", "ExportMainTrackAllClips",  <PaperClipOutlined  />),
  ]),
  getItem("软件设置", "Settings", <SettingOutlined  />),
  getItem("激活软件", "Activation", <CommentOutlined  />),
  getItem("更多软件资源", "MoreSoftwares", <PieChartOutlined  />, [
    getItem("视频创作软件", "VideoSoftwares", <VideoCameraOutlined  />),
    getItem("其它创新想法", "Innovation", <VideoCameraAddOutlined  />),
  ]),
];

function App() {
  const defaultSelectedKey = "Keyframe";
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenuItemKey, setSelectedMenuItemKey] =
    useState<string>(defaultSelectedKey);
  const [noticeinfo, setNoticeinfo] = useState<string | null>(null);
  const [noticeinfohtml, setNoticeinfohtml] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    // @ts-ignore
    window.electronAPI.onPushNoticeInfo(handlePushNoticeInfo);
    return () => {
      // @ts-ignore
      window.electronAPI.offPushNoticeInfo(handlePushNoticeInfo);
    };
  }, []);

  useEffect(() => {
    // @ts-ignore
    window.electronAPI.onPushDebugLog(handlePushDebugLog);
    return () => {
      // @ts-ignore
      window.electronAPI.offPushDebugLog(handlePushDebugLog);
    };
  }, []);

  const renderContent = () => {
    switch (selectedMenuItemKey) {
      case "ReplaceMaterial":
        return <ReplaceMaterial />;
      case "RefillMaterial":
        return <RefillMaterial />;
      case "PartitionRefillMaterial":
        return <PartitionRefillMaterial />;
      case "MasterReplacementFileLevelOne2Two":
        return <MasterReplacementFileLevelOne2Two />;
      case "RenameExtensionCase":
        return <RenameExtensionCase />;
      case "RenameReplacedOutput":
        return <RenameReplacedOutput />;
      case "Master":
        return <Master />;
      case "MasterProSubTrans":
        return <MasterProSubTrans />;
      case "CutMsAudio":
        return <CutMsAudio />;
      case "MasterProAlign":
        return <MasterProAlign />;
      case "SpiritAlign":
        return <SpiritAlign />;
      case "SpiritCalibrate":
        return <SpiritCalibrate />;
      case "ProfessionalAlign":
        return <ProfessionalAlign />;
      case "ProfessionalAudioMerger":
        return <ProfessionalAudioMerger />;
      case "ProfessionalTextGapFiller":
        return <ProfessionalTextGapFiller />;
      case "ProfessionalTextMerger":
        return <ProfessionalTextMerger />;
      case "ProfessionalCutAudioByBeat":
        return <ProfessionalCutAudioByBeat />;
      case "Keyframe":
        return <Keyframe />;
      case "InOutCombo":
        return <InOutCombo />;
      case "Sticker":
        return <Sticker />;
      case "Effect":
        return <Effect />;
      case "Transition":
        return <Transition />;
      case "Filter":
        return <Filter />;
      case "SplitFilesByTime":
        return <SplitFilesByTime />;
      case "SplitFilesByScene":
        return <SplitFilesByScene />;
      case "ExportMainTrackAllClips":
        return <ExportMainTrackAllClips />;
      case "Settings":
        return <Settings />;
      case "Activation":
        return <Activation />;
      case "VideoSoftwares":
        return <VideoSoftwares />;
      case "Innovation":
        return <Innovation />;
    }
    return null;
  };

  const handlePushNoticeInfo = (
    _event: any,
    param: { noticeinfo: string; noticeinfohtml: string }
  ) => {
    setNoticeinfo(param.noticeinfo);
    setNoticeinfohtml(param.noticeinfohtml);
  };
  const handleNotShowInfoAndClose = async () => {
    // @ts-ignore
    await window.electronAPI.notShowNoticeInfoAgain(noticeinfo);
    setNoticeinfo(null);
    setNoticeinfohtml(undefined);
  };

  const handlePushDebugLog = (_event: any, logContent: string) => {
    console.log(`${new Date().toLocaleTimeString()}:${logContent}`);
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
      locale={zhCN}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={"29vw"}
          style={{
            backgroundImage: "url(./illustration/siderbg.jpg)",
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <div className="demo-logo-vertical" />
          <Menu
            theme="dark"
            defaultSelectedKeys={[defaultSelectedKey]}
            mode="inline"
            items={items}
            onSelect={(e) => {
              setSelectedMenuItemKey(e.key);
            }}
            style={{ backgroundColor: "#33333330" }}
          />
        </Sider>
        <Layout>
          <Content
            style={{
              backgroundImage: "url(./illustration/contentbg.jpg)",
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
            }}
          >
            <div style={{ margin: "0 16px" }}>{renderContent()}</div>
          </Content>
        </Layout>
        {noticeinfo && noticeinfohtml ? (
          <Modal
            open={true}
            onOk={() => {
              setNoticeinfo(null);
              setNoticeinfohtml(undefined);
            }}
            closable={false}
            cancelText={"不再提示"}
            okText={"关闭"}
            onCancel={handleNotShowInfoAndClose}
          >
            <div dangerouslySetInnerHTML={{ __html: noticeinfohtml }} />
          </Modal>
        ) : null}
      </Layout>
    </ConfigProvider>
  );
}

export default App;
