import React, { useState } from "react";
import {
  DashboardOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, theme } from "antd";
import { Route, Routes, useNavigate, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard.tsx";
import Constraints from "./components/Constraints.tsx";
import History from "./components/History.tsx";
import SessionDetail from "./components/SessionDetail.tsx";
import QueryEditor from "./components/QueryEditor.tsx";
import Mapping from "./components/Mapping.tsx";
import Volume from "./components/Volume.tsx";
import UniversalKey from "./components/UniversalKey.tsx";

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  onClick?: any,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    onClick,
  } as MenuItem;
}

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();

  const items: MenuItem[] = [
    getItem("Dashboard", "1", <DashboardOutlined />, () =>
      navigate("/dashboard")
    ),
    getItem("Constraints", "2", <DesktopOutlined />, () =>
      navigate("/constraints")
    ),
    getItem("History", "3", <HistoryOutlined />, () => navigate("/history")),
    getItem("Query Editor", "4", <DesktopOutlined />, () =>
      navigate("/query-editor")
    ),
    getItem("Mapping", "5", <ToolOutlined />, () => navigate("/mapping")),
    getItem("Volume", "6", <FolderOpenOutlined />, () => navigate("/volume")),
    getItem("Universal Key", "7", <FolderOpenOutlined />, () => navigate("/universal-key")),
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          defaultSelectedKeys={["1"]}
          mode="inline"
          items={items}
        />
      </Sider>

      <Layout>
        {/* Top Navbar */}
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
        {/* Main Content */}
        <Content
          style={{
            margin: "16px",
            padding: "16px",
            background: colorBgContainer,
          }}
        >
          <Routes>
            {/* Redirect from root to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/constraints" element={<Constraints />} />
            <Route path="/history" element={<History />} />
            <Route path="/query-editor" element={<QueryEditor />} />
            <Route path="/session/:sessionId" element={<SessionDetail />} />
            <Route path="/mapping" element={<Mapping />} />
            <Route path="/volume" element={<Volume />} />
            <Route path="/universal-key" element={<UniversalKey />} />
          </Routes>
        </Content>

        {/* Footer */}
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
