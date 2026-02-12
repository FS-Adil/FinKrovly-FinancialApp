import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  UserOutlined, 
  TeamOutlined, 
  LogoutOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/user',
      icon: <UserOutlined />,
      label: 'Пользовательская страница',
    }
  ];

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/admin',
      icon: <TeamOutlined />,
      label: 'Админ панель',
    });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark">
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255,255,255,.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          {user?.username} ({user?.role})
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Выйти
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;