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
  const [metaData, setMetaData] = useState(null);
  
  // Состояния для модального окна прогресса
  const [progressVisible, setProgressVisible] = useState(false);
  const [processId, setProcessId] = useState(null);
  const [calculationStarted, setCalculationStarted] = useState(false);
  
  // Состояние для блокировки кнопки во время запроса
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  
  // Флаг для отслеживания, был ли уже загружен список организаций
  const organizationsLoaded = useRef(false);
  
  // Ref для отслеживания монтирования компонента
  const isMounted = useRef(true);
  
  // Ref для хранения текущего запроса
  const currentRequest = useRef(null);

  // Инициализация и очистка
  useEffect(() => {
    console.log('🔄 Компонент монтируется');
    isMounted.current = true;
    
    return () => {
      console.log('🔄 Компонент размонтируется');
      isMounted.current = false;
      if (currentRequest.current) {
        currentRequest.current.abort();
      }
    };
  }, []);

  // Загрузка организаций
  const fetchOrganizations = useCallback(async (forceRefresh = true) => {
    // Предотвращаем повторную загрузку если уже загружено и не требуется принудительное обновление
    if (organizationsLoaded.current && !forceRefresh && organizations.length > 0) {
      console.log('📋 Организации уже загружены, пропускаем запрос');
      return;
    }
    
    console.log('📥 fetchOrganizations вызван, forceRefresh:', forceRefresh);
    setOrganizationsLoading(true);
    setApiError(null);
    
    try {
      const response = await getOrganizations(forceRefresh);
      
      if (!isMounted.current) {
        console.log('⏭️ Компонент размонтирован, пропускаем обновление');
        return;
      }
      
      console.log('📦 Ответ от getOrganizations:', response);
      
      // Определяем, что пришло
      let orgs = [];
      let isMock = false;
      
      if (Array.isArray(response)) {
        orgs = response;
        console.log('📋 Получен массив организаций, длина:', orgs.length);
        if (orgs.length > 0) {
          console.log('📋 Первая организация:', orgs[0]);
        }
      } else if (response && response.data) {
        orgs = response.data;
        isMock = response.isMock || false;
        console.log('📋 Получен объект с data, длина:', orgs.length);
      } else {
        console.log('⚠️ Неизвестный формат ответа:', response);
        orgs = [];
      }
      
      // Если organizations пустой, используем mockOrganizations напрямую
      if (orgs.length === 0) {
        console.log('⚠️ Нет организаций в ответе, используем mockOrganizations');
        orgs = [...mockOrganizations];
        isMock = true;
      }
      
      console.log('🏢 Устанавливаем организации:', orgs.length, 'isMock:', isMock);
      setOrganizations(orgs);
      organizationsLoaded.current = true;
      
      // Определяем статус сервера
      const serverAvailable = getServerStatus();
      console.log('🔌 Статус сервера:', serverAvailable);
      setServerStatus(serverAvailable);
      
      if (!serverAvailable) {
        message.info('Сервер недоступен. Используются тестовые данные организаций.');
      }
      
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Ошибка при загрузке организаций:', error);
      
      // В случае ошибки используем тестовые данные
      console.log('🏢 Используем mockOrganizations из-за ошибки');
      setOrganizations([...mockOrganizations]);
      organizationsLoaded.current = true;
      setServerStatus(false);
      
      const errorMessage = 'Ошибка при загрузке организаций. Используются тестовые данные.';
      setApiError(errorMessage);
      message.warning(errorMessage);
    } finally {
      if (isMounted.current) {
        console.log('✅ Загрузка организаций завершена');
        setOrganizationsLoading(false);
      }
    }
  }, [organizations.length]);

  // Загружаем организации при монтировании
  useEffect(() => {
    // Используем setTimeout, чтобы избежать проблем с двойным монтированием в StrictMode
    const timer = setTimeout(() => {
      if (isMounted.current && !organizationsLoaded.current) {
        fetchOrganizations(true);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchOrganizations]);

  // Обработчик расчета отчета
  const handleCalculate = async () => {
    // Валидация
    if (!period || !period[0] || !period[1]) {
      message.warning('Пожалуйста, выберите период');
      return;
    }

    if (!organization) {
      message.warning('Пожалуйста, выберите организацию');
      return;
    }

    console.log('🚀 Начинаем расчет отчета:', {
      startDate: period[0].format('YYYY-MM-DD'),
      endDate: period[1].format('YYYY-MM-DD'),
      organization
    });

    // Очищаем предыдущие данные перед новым расчетом
    setData([]);
    setMetaData(null);
    setApiError(null);
    
    setIsRequestInProgress(true);
    setProgressVisible(true);
    setCalculationStarted(true);
    
    const abortController = new AbortController();
    currentRequest.current = abortController;
    
    try {
      const response = await calculateReport({
        startDate: period[0].format('YYYY-MM-DD'),
        endDate: period[1].format('YYYY-MM-DD')
      }, organization);
      
      console.log('📊 Ответ от calculateReport:', response);
      
      if (!isMounted.current) return;
      
      // Устанавливаем processId
      setProcessId(response?.processId || 'calc_' + Date.now());
      
      // Извлекаем данные
      let reportData = [];
      let reportMeta = null;
      
      if (response && response.data && Array.isArray(response.data)) {
        reportData = response.data;
        reportMeta = response.meta || null;
        console.log('📋 Данные в формате {data: [...]}, записей:', reportData.length);
      } else if (Array.isArray(response)) {
        reportData = response;
        console.log('📋 Прямой массив данных, записей:', reportData.length);
      }
      
      // Устанавливаем новые данные (полностью заменяем старые)
      setData(reportData);
      setMetaData(reportMeta);
      
      // Обновляем статус сервера
      const serverAvailable = getServerStatus();
      setServerStatus(serverAvailable);
      
      if (reportData.length === 0) {
        message.info('Нет данных за выбранный период');
      } else {
        const source = !serverAvailable ? 'тестовых данных' : 'сервера';
        message.success(`Данные загружены с ${source} (${reportData.length} записей)`);
      }
      
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'canceled') {
        console.log('🛑 Запрос отменен');
        return;
      }
      
      if (!isMounted.current) return;
      
      console.error('❌ Ошибка при расчете:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Ошибка при расчете отчета';
      setApiError(errorMessage);
      message.error(errorMessage);
      
      // При ошибке очищаем данные
      setData([]);
      setMetaData(null);
      setProcessId('error_' + Date.now());
      
    } finally {
      if (isMounted.current) {
        setIsRequestInProgress(false);
        currentRequest.current = null;
      }
    }
  };

  const handleProgressClose = (success = false) => {
    setProgressVisible(false);
    if (success) {
      message.success('Расчет успешно завершен');
    }
    setTimeout(() => {
      if (isMounted.current) {
        setProcessId(null);
        setCalculationStarted(false);
      }
    }, 300);
  };

  const handleProgressCancel = () => {
    setProgressVisible(false);
    if (currentRequest.current) {
      currentRequest.current.abort();
      currentRequest.current = null;
    }
    setTimeout(() => {
      if (isMounted.current) {
        setProcessId(null);
        setCalculationStarted(false);
      }
    }, 300);
    message.info('Расчет отменен');
  };

  const handleRetry = () => {
    console.log('🔄 Принудительное обновление организаций');
    organizationsLoaded.current = false;
    fetchOrganizations(true);
  };

  const disabledDate = (current) => {
    return current && current > dayjs().endOf('day');
  };

  const getSelectedOrganizationName = () => {
    if (!organization) return '';
    const org = organizations.find(o => o.id === organization);
    return org ? org.name : '';
  };

  const getFormattedPeriod = () => {
    if (!period || !period[0] || !period[1]) return '';
    return `${period[0].format('DD.MM.YYYY')} - ${period[1].format('DD.MM.YYYY')}`;
  };

  return (
    <>
      <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
        {/* Карточка с параметрами */}
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
            organizationsLoading ? (
              <Spin size="small" />
            ) : (
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRetry}
                size="small"
                disabled={isRequestInProgress}
              >
                Обновить список
              </Button>
            )
          }
        >
          {apiError && (
            <Alert
              message="Ошибка"
              description={apiError}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              onClose={() => setApiError(null)}
            />
          )}
          
          {!serverStatus && !apiError && (
            <Alert
              message="Информация"
              description="Вы работаете с тестовыми данными. Для работы с реальными данными убедитесь, что сервер доступен."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Выбор периода */}
            <div>
              <div style={{ marginBottom: 8 }}>Период:</div>
              <RangePicker 
                style={{ width: '100%' }}
                onChange={(dates) => setPeriod(dates)}
                format="DD.MM.YYYY"
                placeholder={['Дата начала', 'Дата окончания']}
                disabledDate={disabledDate}
                allowClear
                disabled={isRequestInProgress}
                value={period}
              />
            </div>
            
            {/* Выбор организации */}
            <div>
              <div style={{ marginBottom: 8 }}>
                Организация:
                {organizations.length === 0 && !organizationsLoading && (
                  <span style={{ marginLeft: 8, color: '#ff4d4f', fontSize: 12 }}>
                    (нет организаций)
                  </span>
                )}
                {!serverStatus && organizations.length > 0 && (
                  <span style={{ marginLeft: 8, color: '#faad14', fontSize: 12 }}>
                    (доступны тестовые организации)
                  </span>
                )}
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder={organizationsLoading ? 'Загрузка...' : 'Выберите организацию'}
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
                disabled={isRequestInProgress || organizationsLoading}
              >
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>
                    {org.name} {!serverStatus && '(тест)'}
                  </Option>
                ))}
              </Select>
              {organizations.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                  Загружено организаций: {organizations.length}
                </div>
              )}
            </div>

            {/* Кнопка расчета */}
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleCalculate}
              loading={isRequestInProgress}
              size="large"
              block
              disabled={!period || !period[0] || !period[1] || !organization || organizationsLoading}
            >
              {isRequestInProgress ? 'Расчет...' : 'Рассчитать'}
            </Button>
          </Space>
        </Card>

        {/* Результаты расчета */}
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
              <Space split="|" size={4}>
                <span>
                  <strong>Организация:</strong> {getSelectedOrganizationName()}
                </span>
                <span>
                  <strong>Период:</strong> {getFormattedPeriod()}
                </span>
                {metaData && metaData.totalRecords > 0 && (
                  <span>
                    <strong>Всего записей:</strong> {metaData.totalRecords}
                  </span>
                )}
              </Space>
            }
          >
            <DataTable 
              data={data} 
              loading={isRequestInProgress}
            />
            
            {metaData && (
              <div style={{ 
                marginTop: 16, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 0',
                borderTop: '1px solid #f0f0f0'
              }}>
                <Space size="large">
                  {metaData.totalProfit !== undefined && (
                    <span>
                      <strong>Общая прибыль:</strong>{' '}
                      {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metaData.totalProfit)}
                    </span>
                  )}
                  {/* {metaData.averageProfitability !== undefined && (
                    <span>
                      <strong>Средняя рентабельность:</strong>{' '}
                      {metaData.averageProfitability.toFixed(2)}%
                    </span>
                  )} */}
                </Space>
                <span>
                  {!serverStatus && (
                    <span style={{ color: '#faad14' }}>
                      <WarningOutlined style={{ marginRight: 8 }} />
                      Демонстрационные данные
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {!metaData && (
              <div style={{ 
                marginTop: 16, 
                display: 'flex', 
                justifyContent: 'flex-end', 
                padding: '8px 0',
                borderTop: '1px solid #f0f0f0'
              }}>
                <span>
                  Всего записей: <strong>{data.length}</strong>
                </span>
              </div>
            )}
          </Card>
        )}
      </Space>

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