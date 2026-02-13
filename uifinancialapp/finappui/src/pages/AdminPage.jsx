import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Statistic, Row, Col, Space, Alert, Spin } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import OrganizationManager from '../components/OrganizationManager';
import { getServerStatus } from '../services/api';

const { Title } = Typography;

const AdminPage = () => {
  const [stats, setStats] = useState({
    users: 0,
    organizations: 0,
    reports: 0
  });
  const [serverStatus, setServerStatus] = useState(true);
  const [loading, setLoading] = useState(true);

  // Мемоизированные стили для статистики
  const statisticStyles = useMemo(() => ({
    users: { content: { color: '#1890ff' } },
    organizations: { content: { color: '#52c41a' } },
    reports: { content: { color: '#faad14' } }
  }), []);

  const handleOrganizationsUpdate = useCallback((count) => {
    setStats(prev => ({
      ...prev,
      organizations: count
    }));
  }, []);

  // Загрузка реальных данных с сервера
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [status, dashboardStats] = await Promise.all([
          getServerStatus(),
        //   getDashboardStats() // Предполагаем, что есть такой API метод
        ]);
        
        setServerStatus(status);
        if (dashboardStats) {
          setStats({
            users: dashboardStats.users || 0,
            organizations: dashboardStats.organizations || 0,
            reports: dashboardStats.reports || 0
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setServerStatus(false);
        // Используем тестовые данные при ошибке
        setStats({
          users: 1245,
          organizations: 0,
          reports: 3421
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" description="Загрузка данных..." />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
      <Title level={2}>Административная панель</Title>
      
      {!serverStatus && (
        <Alert
          title="Тестовый режим"
          description="Сервер недоступен. Используются тестовые данные. Изменения не будут сохранены на сервере."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          closable
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Пользователи"
              value={stats.users}
              prefix={<UserOutlined />}
              styles={statisticStyles.users}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Организации"
              value={stats.organizations}
              prefix={<TeamOutlined />}
              styles={statisticStyles.organizations}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Отчеты"
              value={stats.reports}
              prefix={<FileTextOutlined />}
              styles={statisticStyles.reports}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <OrganizationManager 
        onUpdate={handleOrganizationsUpdate}
        serverStatus={serverStatus}
      />
    </Space>
  );
};

export default AdminPage;