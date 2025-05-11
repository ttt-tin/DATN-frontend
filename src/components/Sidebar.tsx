import React, { useEffect, useState } from "react";
import {
  DashboardOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  LinkOutlined,
  DesktopOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Menu, Layout } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

const { Sider } = Layout;

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

const SidebarMenu: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [shouldShowInitialization, setShouldShowInitialization] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkHospitalDataTables = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/athena/check-empty`);
        const isEmpty = await res.json();
        setShouldShowInitialization(isEmpty);
      } catch (error) {
        console.error("Error checking hospital_data tables:", error);
      }
    };

    checkHospitalDataTables();
  }, []);

  const configChildren: MenuItem[] = [
    getItem("Mapping", "/mapping", <ToolOutlined />, () => navigate("/mapping")),
    getItem("Relation", "/relation", <LinkOutlined />, () => navigate("/relation")),
    getItem("Universal Key", "/universal-key", <FolderOpenOutlined />, () =>
      navigate("/universal-key")
    ),
    getItem("Constraints", "/constraints", <DesktopOutlined />, () => navigate("/constraints")),
  ];

  if (shouldShowInitialization) {
    configChildren.unshift(
      getItem("Initialization", "/initialization", <CloudDownloadOutlined />, () =>
        navigate("/initialization")
      )
    );
  }

  const items: MenuItem[] = [
    getItem("Dashboard", "/dashboard", <DashboardOutlined />, () => navigate("/dashboard")),
    getItem("Explorer", "/explorer", <FolderOutlined />, () => navigate("/explorer")),
    getItem("Volume", "/volume", <FolderOpenOutlined />, () => navigate("/volume")),
    getItem("Operation", "/operation", <SettingOutlined />, () => navigate("/operation")),
    getItem("Configuration", "config", <ToolOutlined />, undefined, configChildren),
    getItem("History", "/history", <HistoryOutlined />, () => navigate("/history")),
    getItem("Query Editor", "/query-editor", <DesktopOutlined />, () => navigate("/query-editor")),
    getItem("Data Source", "/data-source", <DatabaseOutlined />, () => navigate("/data-source")),
  ];

  return (
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
  );
};

export default SidebarMenu;
