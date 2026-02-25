// UserPage.jsx (фрагмент с добавлением модального окна)

import React, { useState, useEffect, useCallback } from 'react';
import { Card, DatePicker, Select, Button, Space, message, Alert, Spin, Badge, Tooltip, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import DataTable from '../components/Tables/DataTable';
import CalculationProgress from '../components/CalculationProgress/CalculationProgress';
import { 
  calculateReport, 
  getOrganizations, 
  getServerStatus,
  mockOrganizations 
} from '../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const UserPage = () => {
  const [period, setPeriod] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [serverStatus, setServerStatus] = useState(true);
  
  // Состояние для модального окна прогресса
  const [progressVisible, setProgressVisible] = useState(false);
  const [calculationParams, setCalculationParams] = useState(null);

  const fetchOrganizations = useCallback(async () => {
    // ... существующий код ...
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCalculate = async () => {
    if (!period || !period[0] || !period[1]) {
      message.warning('Пожалуйста, выберите период');
      return;
    }

    if (!organization) {
      message.warning('Пожалуйста, выберите организацию');
      return;
    }

    // Сохраняем параметры для расчета
    setCalculationParams({
      startDate: period[0].format('YYYY-MM-DD'),
      endDate: period[1].format('YYYY-MM-DD'),
      organizationId: organization,
      organizationName: getSelectedOrganizationName()
    });

    // Открываем модальное окно с прогрессом
    setProgressVisible(true);
  };

  // Обработчик завершения/отмены расчета
  const handleCalculationComplete = async (canceled = false) => {
    setProgressVisible(false);
    
    if (!canceled) {
      // Если расчет не отменен, выполняем фактический запрос на сервер
      setLoading(true);
      try {
        const response = await calculateReport({
          startDate: period[0].format('YYYY-MM-DD'),
          endDate: period[1].format('YYYY-MM-DD')
        }, organization);
        
        const reportData = Array.isArray(response) ? response : response.data || [];
        setData(reportData);
        
        if (reportData.length === 0) {
          message.info('Нет данных за выбранный период');
        } else {
          const source = getServerStatus() ? 'сервера' : 'тестовых данных';
          message.success(`Данные успешно загружены с ${source} (${reportData.length} записей)`);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Ошибка при расчете отчета';
        message.error(errorMessage);
        setApiError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRetry = () => {
    fetchOrganizations();
  };

  const disabledDate = (current) => {
    return current && current > dayjs().endOf('day');
  };

  const getSelectedOrganizationName = () => {
    if (!organization) return '';
    const org = organizations.find(o => o.id === organization);
    return org ? org.name : '';
  };

  return (
    <>
      <Space orientation="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
        {/* Существующий код карточки параметров */}
        <Card 
          title={
            <Space>
              <span>Параметры расчета</span>
              {!serverStatus && (
                <Tooltip title="Сервер недоступен. Используются тестовые данные.">
                  <Badge status="warning" text="Тестовый режим" />
                </Tooltip>
              )}
            </Space>
          }
          extra={
            organizationsLoading ? <Spin size="small" /> : 
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRetry}
              size="small"
            >
              Обновить список
            </Button>
          }
        >
          {apiError && !serverStatus && (
            <Alert
              title="Режим тестовых данных"
              description="Сервер недоступен. Используются демонстрационные данные. Изменения не будут сохранены."
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              closable
              style={{ marginBottom: 16 }}
              onClose={() => setApiError(null)}
            />
          )}
          
          {!serverStatus && (
            <Alert
              title="Информация"
              description="Вы работаете с тестовыми данными. Для работы с реальными данными убедитесь, что сервер доступен по адресу http://192.168.0.248"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <div style={{ marginBottom: 8 }}>Период:</div>
              <RangePicker 
                style={{ width: '100%' }}
                onChange={(dates) => setPeriod(dates)}
                format="DD.MM.YYYY"
                placeholder={['Дата начала', 'Дата окончания']}
                disabledDate={disabledDate}
                allowClear
              />
            </div>
            
            <div>
              <div style={{ marginBottom: 8 }}>
                Организация:
                {!serverStatus && (
                  <span style={{ marginLeft: 8, color: '#faad14', fontSize: 12 }}>
                    (доступны тестовые организации)
                  </span>
                )}
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите организацию"
                onChange={(value) => setOrganization(value)}
                loading={organizationsLoading}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                notFoundContent={organizationsLoading ? <Spin size="small" /> : 'Нет организаций'}
                allowClear
                value={organization}
              >
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>
                    {org.name} {!serverStatus && '(тест)'}
                  </Option>
                ))}
              </Select>
            </div>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleCalculate}
              loading={loading}
              size="large"
              block
              disabled={!period || !period[0] || !period[1] || !organization || organizationsLoading}
            >
              {loading ? 'Расчет...' : 'Рассчитать'}
            </Button>
          </Space>
        </Card>

        {/* Существующий код карточки результатов */}
        {data.length > 0 && (
          <Card 
            title={
              <Space>
                <span>Результаты расчета</span>
                {!serverStatus && (
                  <Tag color="warning">Тестовые данные</Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <span>Организация: <strong>{getSelectedOrganizationName()}</strong></span>
                <span>Период: <strong>{period ? `${period[0].format('DD.MM.YYYY')} - ${period[1].format('DD.MM.YYYY')}` : ''}</strong></span>
              </Space>
            }
          >
            <DataTable 
              data={data} 
              loading={loading} 
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {!serverStatus && (
                  <span style={{ color: '#faad14' }}>
                    <WarningOutlined /> Данные сгенерированы автоматически для демонстрации
                  </span>
                )}
              </span>
              <span>
                Всего записей: <strong>{data.length}</strong>
              </span>
            </div>
          </Card>
        )}
      </Space>

      {/* Модальное окно прогресса расчета */}
      <CalculationProgress
        visible={progressVisible}
        onClose={() => handleCalculationComplete(true)}
        onCancel={() => handleCalculationComplete(true)}
        calculationParams={calculationParams}
        pollingInterval={2000}
      />
    </>
  );
};

export default UserPage;