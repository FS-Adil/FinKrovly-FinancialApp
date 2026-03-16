import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, DatePicker, Select, Button, Space, message, Alert, Spin, Badge, Tooltip, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import AssemblyCostTable from '../components/Tables/AssemblyCostTable';
import { 
  calculateAssemblyCost, 
  getOrganizations, 
  getServerStatus,
  mockOrganizations 
} from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

const AssemblyCostPage = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [data, setData] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [serverStatus, setServerStatus] = useState(true);
  const [metaData, setMetaData] = useState(null);
  
  // Состояние для блокировки кнопки во время запроса
  const [loading, setLoading] = useState(false);
  
  // Флаг для отслеживания, был ли уже загружен список организаций
  const organizationsLoaded = useRef(false);
  
  // Ref для отслеживания монтирования компонента
  const isMounted = useRef(true);
  
  // Ref для хранения текущего запроса
  const currentRequest = useRef(null);

  // Инициализация и очистка
  useEffect(() => {
    console.log('🔄 Компонент AssemblyCostPage монтируется');
    isMounted.current = true;
    
    return () => {
      console.log('🔄 Компонент AssemblyCostPage размонтируется');
      isMounted.current = false;
      if (currentRequest.current) {
        currentRequest.current.abort();
      }
    };
  }, []);

  // Загрузка организаций
  const fetchOrganizations = useCallback(async (forceRefresh = true) => {
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
      
      let orgs = [];
      let isMock = false;
      
      if (Array.isArray(response)) {
        orgs = response;
        console.log('📋 Получен массив организаций, длина:', orgs.length);
      } else if (response && response.data) {
        orgs = response.data;
        isMock = response.isMock || false;
        console.log('📋 Получен объект с data, длина:', orgs.length);
      } else {
        console.log('⚠️ Неизвестный формат ответа:', response);
        orgs = [];
      }
      
      if (orgs.length === 0) {
        console.log('⚠️ Нет организаций в ответе, используем mockOrganizations');
        orgs = [...mockOrganizations];
        isMock = true;
      }
      
      console.log('🏢 Устанавливаем организации:', orgs.length, 'isMock:', isMock);
      setOrganizations(orgs);
      organizationsLoaded.current = true;
      
      const serverAvailable = getServerStatus();
      console.log('🔌 Статус сервера:', serverAvailable);
      setServerStatus(serverAvailable);
      
      if (!serverAvailable) {
        message.info('Сервер недоступен. Используются тестовые данные организаций.');
      }
      
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Ошибка при загрузке организаций:', error);
      
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
    const timer = setTimeout(() => {
      if (isMounted.current && !organizationsLoaded.current) {
        fetchOrganizations(true);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchOrganizations]);

  // Обработчик расчета себестоимости остатков на складе
  const handleCalculate = async () => {
    if (!selectedDate) {
      message.warning('Пожалуйста, выберите дату');
      return;
    }

    if (!organization) {
      message.warning('Пожалуйста, выберите организацию');
      return;
    }

    console.log('🚀 Начинаем расчет себестоимости остатков на складе:', {
      date: selectedDate.format('YYYY-MM-DD'),
      organization
    });

    setData([]);
    setMetaData(null);
    setApiError(null);
    
    setLoading(true);
    
    const abortController = new AbortController();
    currentRequest.current = abortController;
    
    try {
      const response = await calculateAssemblyCost({
        date: selectedDate.format('YYYY-MM-DD')
      }, organization);
      
      console.log('📊 Ответ от calculateAssemblyCost:', response);
      
      if (!isMounted.current) return;
      
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
      
      setData(reportData);
      setMetaData(reportMeta);
      
      const serverAvailable = getServerStatus();
      setServerStatus(serverAvailable);
      
      if (reportData.length === 0) {
        message.info('Нет остатков на складе за выбранную дату');
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
      
      const errorMessage = error.response?.data?.message || error.message || 'Ошибка при расчете себестоимости остатков';
      setApiError(errorMessage);
      message.error(errorMessage);
      
      setData([]);
      setMetaData(null);
      
    } finally {
      if (isMounted.current) {
        setLoading(false);
        currentRequest.current = null;
      }
    }
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

  const getFormattedDate = () => {
    if (!selectedDate) return '';
    return selectedDate.format('DD.MM.YYYY');
  };

  // Расчет итогов для таблицы
  const totals = data.reduce((acc, item) => {
    acc.quantity += item.quantity || 0;
    acc.cost += item.cost || 0;
    return acc;
  }, { quantity: 0, cost: 0 });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
      {/* Карточка с параметрами */}
      <Card 
        title={
          <Space>
            <span>Расчет себестоимости остатков на складе</span>
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
              disabled={loading}
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
          {/* Выбор даты */}
          <div>
            <div style={{ marginBottom: 8 }}>Дата остатков:</div>
            <DatePicker 
              style={{ width: '100%' }}
              onChange={(date) => setSelectedDate(date)}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
              disabledDate={disabledDate}
              allowClear
              disabled={loading}
              value={selectedDate}
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
              disabled={loading || organizationsLoading}
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
            loading={loading}
            size="large"
            block
            disabled={!selectedDate || !organization || organizationsLoading}
          >
            {loading ? 'Расчет...' : 'Рассчитать остатки'}
          </Button>
        </Space>
      </Card>

      {/* Результаты расчета */}
      {data.length > 0 && (
        <Card 
          title={
            <Space>
              <span>Остатки на складе</span>
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
                <strong>Дата:</strong> {getFormattedDate()}
              </span>
              {metaData && metaData.totalRecords > 0 && (
                <span>
                  <strong>Всего позиций:</strong> {metaData.totalRecords}
                </span>
              )}
            </Space>
          }
        >
          <AssemblyCostTable 
            data={data} 
            loading={loading}
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
                {metaData.totalCost !== undefined && (
                  <span>
                    <strong>Общая себестоимость остатков:</strong>{' '}
                    {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metaData.totalCost)}
                  </span>
                )}
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
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px 0',
              borderTop: '1px solid #f0f0f0'
            }}>
              <Space size="large">
                <span>
                  <strong>Общее количество:</strong> {totals.quantity.toLocaleString('ru-RU')}
                </span>
                <span>
                  <strong>Общая себестоимость:</strong>{' '}
                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(totals.cost)}
                </span>
              </Space>
              <span>
                Всего позиций: <strong>{data.length}</strong>
              </span>
            </div>
          )}
        </Card>
      )}
    </Space>
  );
};

export default AssemblyCostPage;