import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [serverStatus, setServerStatus] = useState(true);
  
  // Состояния для модального окна прогресса
  const [progressVisible, setProgressVisible] = useState(false);
  const [processId, setProcessId] = useState(null);
  const [calculationStarted, setCalculationStarted] = useState(false);
  
  // Новое состояние для блокировки кнопки во время запроса
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  
  // Ref для отслеживания монтирования компонента
  const isMounted = useRef(true);
  
  // Ref для хранения текущего запроса (для возможности отмены)
  const currentRequest = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Отменяем запрос при размонтировании
      if (currentRequest.current) {
        currentRequest.current.abort();
      }
    };
  }, []);

  const fetchOrganizations = useCallback(async () => {
    setOrganizationsLoading(true);
    setApiError(null);
    try {
      const response = await getOrganizations();
      if (!isMounted.current) return;
      
      const orgs = Array.isArray(response) ? response : response.data || [];
      setOrganizations(orgs);
      setServerStatus(getServerStatus());
      
      if (!getServerStatus()) {
        message.info('Используются тестовые данные организаций');
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      const errorMessage = 'Ошибка при загрузке организаций. Используются тестовые данные.';
      message.warning(errorMessage);
      setApiError(errorMessage);
      setOrganizations(mockOrganizations);
      setServerStatus(false);
      console.error('Fetch organizations error:', error);
    } finally {
      if (isMounted.current) {
        setOrganizationsLoading(false);
      }
    }
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

    // Блокируем кнопку ДО начала запроса
    setIsRequestInProgress(true);
    setApiError(null);
    
    // Открываем модальное окно
    setProgressVisible(true);
    setCalculationStarted(true);
    
    // Создаем AbortController для возможности отмены запроса
    const abortController = new AbortController();
    currentRequest.current = abortController;
    
    try {
      // Выполняем запрос на расчет
      const response = await calculateReport({
        startDate: period[0].format('YYYY-MM-DD'),
        endDate: period[1].format('YYYY-MM-DD')
      }, organization, { signal: abortController.signal });
      
      // Проверяем, не размонтирован ли компонент
      if (!isMounted.current) return;
      
      // Если сервер вернул ID процесса, сохраняем его
      if (response.processId) {
        setProcessId(response.processId);
      } else {
        setProcessId('demo_' + Date.now());
      }
      
      // Сохраняем данные
      const reportData = Array.isArray(response) ? response : response.data || [];
      setData(reportData);
      
      if (reportData.length === 0) {
        message.info('Нет данных за выбранный период');
      } else {
        const source = getServerStatus() ? 'сервера' : 'тестовых данных';
        message.success(`Данные успешно загружены с ${source} (${reportData.length} записей)`);
        setServerStatus(getServerStatus());
      }
      
    } catch (error) {
      // Игнорируем ошибки отмененного запроса
      if (error.name === 'AbortError' || error.message === 'canceled') {
        console.log('Запрос был отменен');
        return;
      }
      
      if (!isMounted.current) return;
      
      const errorMessage = error.response?.data?.message || 'Ошибка при расчете отчета';
      message.error(errorMessage);
      setApiError(errorMessage);
      console.error('Calculate report error:', error);
      
      // Генерируем демо processId для модального окна
      setProcessId('demo_error_' + Date.now());
    } finally {
      // Разблокируем кнопку ТОЛЬКО после получения ответа
      if (isMounted.current) {
        setIsRequestInProgress(false);
        currentRequest.current = null;
      }
    }
  };

  // Обработчик закрытия модального окна
  const handleProgressClose = (success = false) => {
    setProgressVisible(false);
    
    if (success) {
      message.success('Все этапы расчета успешно выполнены');
    }
    
    // Сбрасываем processId после закрытия
    setTimeout(() => {
      if (isMounted.current) {
        setProcessId(null);
        setCalculationStarted(false);
      }
    }, 300);
  };

  // Обработчик отмены расчета пользователем
  const handleProgressCancel = () => {
    setProgressVisible(false);
    
    // Отменяем текущий запрос, если он еще выполняется
    if (currentRequest.current) {
      currentRequest.current.abort();
      currentRequest.current = null;
    }
    
    // НЕ сбрасываем isRequestInProgress здесь!
    // Запрос все еще может выполняться в фоне
    
    setTimeout(() => {
      if (isMounted.current) {
        setProcessId(null);
        setCalculationStarted(false);
      }
    }, 300);
    
    message.info('Модальное окно закрыто, расчет продолжается в фоне');
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
              disabled={isRequestInProgress} // Блокируем во время запроса
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
                disabled={isRequestInProgress} // Блокируем во время запроса
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
                disabled={isRequestInProgress} // Блокируем во время запроса
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
              loading={isRequestInProgress} // Используем для индикации загрузки
              size="large"
              block
              disabled={!period || !period[0] || !period[1] || !organization || organizationsLoading || isRequestInProgress}
            >
              {isRequestInProgress ? 'Расчет...' : 'Рассчитать'}
            </Button>
          </Space>
        </Card>

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
              loading={isRequestInProgress} // Индикатор загрузки таблицы
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
        onClose={handleProgressClose}
        onCancel={handleProgressCancel}
        processId={processId}
        pollingInterval={2000}
        autoStart={calculationStarted}
        autoCloseOnSuccess={true}
        autoCloseDelay={1500}
      />
    </>
  );
};

export default UserPage;