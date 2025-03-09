import React, { useState } from "react";
import {
  BarChartOutlined,
  DashboardOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  HistoryOutlined,
  ToolOutlined,
  LinkOutlined, // 👈 New icon for Relation
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, theme } from "antd";
import { Route, Routes, useNavigate, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard.tsx";
import Constraints from "./components/Constraints.tsx";
import History from "./components/History.tsx";
import SessionDetail from "./components/SessionDetail.tsx";
import QueryEditor from "./components/QueryEditor.tsx";
import Mapping from "./components/Mapping.tsx";
import Volume from "./components/Volume.tsx";
import UniversalKey from "./components/UniversalKey.tsx";
import Visualization from "./components/Visualization.tsx";
import Explorer from "./components/Explorer.tsx";
import Relation from "./components/Relation.tsx"; // 👈 Import the new Relation component

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  onClick?: () => void
): MenuItem {
  return {
    key,
    icon,
    label,
    onClick,
  } as MenuItem;
}

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuItem[] = [
    getItem("Dashboard", "/dashboard", <DashboardOutlined />, () => navigate("/dashboard")),
    getItem("Explorer", "/explorer", <FolderOutlined />, () => navigate("/explorer")),
    getItem("Constraints", "/constraints", <DesktopOutlined />, () => navigate("/constraints")),
    getItem("History", "/history", <HistoryOutlined />, () => navigate("/history")),
    getItem("Query Editor", "/query-editor", <DesktopOutlined />, () => navigate("/query-editor")),
    getItem("Mapping", "/mapping", <ToolOutlined />, () => navigate("/mapping")),
    getItem("Volume", "/volume", <FolderOpenOutlined />, () => navigate("/volume")),
    getItem("Universal Key", "/universal-key", <FolderOpenOutlined />, () => navigate("/universal-key")),
    // getItem("Visualization", "/visualization", <BarChartOutlined />, () => navigate("/visualization")),
    getItem("Relation", "/relation", <LinkOutlined />, () => navigate("/relation")), // 👈 New Relation menu item
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={items}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#001529",
            color: "#fff",
            fontSize: "24px",
            fontWeight: "bold",
            height: "64px",
          }}
        >
          BK-Health
        </Header>
        
        <Content style={{ margin: "16px", padding: "16px", background: colorBgContainer }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/constraints" element={<Constraints />} />
            <Route path="/history" element={<History />} />
            <Route path="/query-editor" element={<QueryEditor />} />
            <Route path="/session/:sessionId" element={<SessionDetail />} />
            <Route path="/mapping" element={<Mapping />} />
            <Route path="/volume" element={<Volume />} />
            <Route path="/universal-key" element={<UniversalKey />} />
            <Route path="/visualization" element={<Visualization />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/relation" element={<Relation />} /> {/* 👈 New Route */}
          </Routes>
        </Content>

        <Footer
          style={{
            textAlign: "center",
            background: "#001529",
            color: "#fff",
            padding: "10px 0",
          }}
        >
          © {new Date().getFullYear()} BK-Health. All Rights Reserved.
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;