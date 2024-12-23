import React, { useState } from 'react';
import {
  DashboardOutlined,
  DesktopOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard.tsx';
import Constraints from './components/Constraints.tsx';
import History from './components/History.tsx';
import SessionDetail from './components/SessionDetail.tsx';

const { Header, Content, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  onClick?: any,
  children?: MenuItem[],
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
    getItem('Dashboard', '1', <DashboardOutlined />, () => navigate('/dashboard')),
    getItem('Constraints', '2', <DesktopOutlined />, () => navigate('/constraints')),
    getItem('History', '9', <HistoryOutlined />, () => navigate('/history')),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items} />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '0 16px' }}>
          <Routes>
            {/* Redirect from root to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/constraints" element={<Constraints />} />
            <Route path="/history" element={<History />} />
            <Route path="/session/:sessionId" element={<SessionDetail />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
