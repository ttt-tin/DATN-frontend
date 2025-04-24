import React, { useState } from "react";
import {
  DashboardOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  LinkOutlined,
  DesktopOutlined,
  HistoryOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, theme } from "antd";
import {
  Route,
  Routes,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
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
import Relation from "./components/Relation.tsx";
import DataSource from "./components/DataSource.tsx";

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  onClick?: () => void,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    label,
    onClick,
    children,
  } as MenuItem;
}

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuItem[] = [
    getItem("Dashboard", "/dashboard", <DashboardOutlined />, () =>
      navigate("/dashboard")
    ),
    getItem("Explorer", "/explorer", <FolderOutlined />, () =>
      navigate("/explorer")
    ),
    getItem("Volume", "/volume", <FolderOpenOutlined />, () =>
      navigate("/volume")
    ),
    getItem(
      "Configuration",
      "integration-cleaning",
      <ToolOutlined />,
      undefined,
      [
        getItem("Mapping", "/mapping", <ToolOutlined />, () =>
          navigate("/mapping")
        ),
        getItem("Relation", "/relation", <LinkOutlined />, () =>
          navigate("/relation")
        ),
        getItem("Universal Key", "/universal-key", <FolderOpenOutlined />, () =>
          navigate("/universal-key")
        ),
        getItem("Constraints", "/constraints", <DesktopOutlined />, () =>
          navigate("/constraints")
        ),
      ]
    ),
    getItem("History", "/history", <HistoryOutlined />, () =>
      navigate("/history")
    ),
    getItem("Query Editor", "/query-editor", <DesktopOutlined />, () =>
      navigate("/query-editor")
    ),
    getItem("Data Source", "/data-source", <DatabaseOutlined />, () =>
      navigate("/data-source")
    ),
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "#e6e6e6" }}>
      {/* Top Navigation Bar */}
      <Header
        style={{
          background: "#001529",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          height: 64,
          width: "100%",
          zIndex: 1100,
          position: "fixed",
          top: 0,
          left: 0,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            cursor: "pointer",
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.3)",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
          onClick={() => navigate("/dashboard")}
        >
          BK-Health
        </div>
      </Header>

      {/* Layout under Header */}
      <Layout>
        {/* Sidebar under Header */}
        <Sider
          collapsed={collapsed}
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          width={220}
          collapsible
          style={{
            background: "#001529",
            transition: "width 0.6s ease-in-out",
            overflow: "hidden",
            position: "fixed",
            left: 0,
            top: 64,
            height: "calc(100% - 64px)",
            zIndex: 1000,
          }}
        >
          <Menu
            theme="dark"
            selectedKeys={[location.pathname]}
            mode="inline"
            items={items}
            style={{ borderRight: 0 }}
          />
        </Sider>

        {/* Main Content Area */}
        <Layout
          style={{
            marginLeft: collapsed ? 80 : 220,
            marginTop: 64,
            transition: "margin-left 0.6s ease-in-out",
            background: "#e6e6e6",
          }}
        >
          <Content
            style={{
              padding: 24,
              background: "#e6e6e6",
              color: "#000",
              minHeight: "calc(100vh - 144px)",
            }}
          >
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
              <Route path="/relation" element={<Relation />} />
              <Route path="/data-source" element={<DataSource />} />
            </Routes>
          </Content>

          <Footer
            style={{
              textAlign: "center",
              background: "#1f1f1f",
              padding: "12px 0",
              fontSize: 14,
              color: "#aaa",
            }}
          >
            © {new Date().getFullYear()} BK-Health. All Rights Reserved.
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
