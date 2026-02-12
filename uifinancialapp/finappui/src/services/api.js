import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_TIMEOUT = parseInt(import.meta.env.REACT_APP_API_TIMEOUT || '5000', 10);
const CACHE_DURATION = parseInt(import.meta.env.REACT_APP_CACHE_DURATION || '30000', 10);

// Конфигурация axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT,
});

// Интерцептор для логирования запросов
api.interceptors.request.use(request => {
  console.log(`🚀 [${request.method.toUpperCase()}] ${request.url}`, request.data || '');
  return request;
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  response => {
    console.log(`✅ [${response.config.method.toUpperCase()}] ${response.config.url}`, response.status);
    return response;
  },
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Таймаут запроса');
    } else if (error.response) {
      console.error(`❌ [${error.config?.method?.toUpperCase()}] ${error.config?.url}`, error.response.status);
    } else if (error.request) {
      console.error('📡 Сервер не отвечает');
    } else {
      console.error('🔧 Ошибка настройки запроса', error.message);
    }
    return Promise.reject(error);
  }
);

// =============== ТЕСТОВЫЕ ДАННЫЕ ===============
export const mockOrganizations = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'ООО "Ромашка"', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'АО "ТехноПром"', createdAt: '2024-01-02T11:30:00Z', updatedAt: '2024-01-02T11:30:00Z' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'ООО "Альянс"', createdAt: '2024-01-03T09:15:00Z', updatedAt: '2024-01-03T09:15:00Z' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'ИП Иванов', createdAt: '2024-01-04T14:20:00Z', updatedAt: '2024-01-04T14:20:00Z' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'ЗАО "СтройИнвест"', createdAt: '2024-01-05T16:45:00Z', updatedAt: '2024-01-05T16:45:00Z' },
];

// Категории товаров для тестовых данных
const PRODUCT_CATEGORIES = [
  'Электроника', 'Одежда', 'Продукты', 'Мебель', 'Канцелярия',
  'Автозапчасти', 'Косметика', 'Книги', 'Игрушки', 'Спорттовары'
];

// =============== КЭШИРОВАНИЕ ===============
let cache = {
  organizations: {
    data: null,
    timestamp: 0,
    duration: CACHE_DURATION
  }
};

const isCacheValid = (cacheKey) => {
  const cacheItem = cache[cacheKey];
  return cacheItem?.data && (Date.now() - cacheItem.timestamp) < cacheItem.duration;
};

const setCache = (cacheKey, data) => {
  cache[cacheKey] = {
    data,
    timestamp: Date.now(),
    duration: CACHE_DURATION
  };
};

const clearCache = (cacheKey) => {
  if (cacheKey) {
    cache[cacheKey] = { data: null, timestamp: 0, duration: CACHE_DURATION };
  } else {
    cache = Object.keys(cache).reduce((acc, key) => {
      acc[key] = { data: null, timestamp: 0, duration: CACHE_DURATION };
      return acc;
    }, {});
  }
  console.log('🧹 Кэш очищен:', cacheKey || 'весь');
};

// =============== ФЛАГИ СОСТОЯНИЯ ===============
let serverStatus = {
  available: true,
  lastCheck: 0,
  checkInterval: 60000 // 1 минута
};

// =============== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===============
const generateUUID = () => {
  return crypto.randomUUID?.() || 
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

const generateMockReportData = (startDate, endDate, organizationId) => {
  const org = mockOrganizations.find(o => o.id === organizationId) || { 
    id: organizationId, 
    name: 'Тестовая организация' 
  };
  
  const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day');
  const recordCount = Math.max(50, Math.min(1000, Math.floor(Math.random() * 500) + 500));
  
  return Array.from({ length: recordCount }, (_, i) => {
    const date = dayjs(startDate)
      .add(Math.floor(Math.random() * (daysDiff + 1)), 'day')
      .format('YYYY-MM-DD');
    
    return {
      id: `${organizationId}-${i + 1}-${Date.now()}`,
      productId: `PRD-${(i + 1).toString().padStart(6, '0')}`,
      name: `Товар ${i + 1}`,
      category: PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)],
      quantity: Math.floor(Math.random() * 1000) + 1,
      price: parseFloat((Math.random() * 10000 + 100).toFixed(2)),
      cost: parseFloat((Math.random() * 8000 + 50).toFixed(2)),
      profit: 0, // будет вычислено
      profitability: 0, // будет вычислено
      date,
      organization: org.name,
      organizationId: org.id,
    };
  }).map(item => {
    // Вычисляем прибыль и рентабельность
    item.profit = parseFloat((item.price - item.cost).toFixed(2));
    item.profitability = parseFloat(((item.profit / item.cost) * 100).toFixed(2));
    return item;
  });
};

// =============== ОСНОВНЫЕ ФУНКЦИИ API ===============

/**
 * Получить список организаций
 * @param {boolean} forceRefresh - игнорировать кэш
 * @param {AbortSignal} signal - сигнал для отмены запроса
 */
export const getOrganizations = async (forceRefresh = false, signal = null) => {
  // Проверяем кэш
  if (!forceRefresh && isCacheValid('organizations')) {
    console.log('📦 Возвращаем кэшированные данные организаций');
    return cache.organizations.data;
  }

  try {
    const response = await api.get('/get', { signal });
    serverStatus.available = true;
    serverStatus.lastCheck = Date.now();
    
    const data = response.data;
    setCache('organizations', data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    
    console.warn('⚠️ API недоступен, возвращаем тестовые данные организаций');
    serverStatus.available = false;
    serverStatus.lastCheck = Date.now();
    
    setCache('organizations', mockOrganizations);
    return mockOrganizations;
  }
};

/**
 * Получить организацию по ID
 * @param {string} id - UUID организации
 */
export const getOrganizationById = async (id) => {
  // Проверяем кэш
  if (isCacheValid('organizations')) {
    const org = cache.organizations.data.find(o => o.id === id);
    if (org) return org;
  }
  
  try {
    const response = await api.get(`/get/${id}`);
    serverStatus.available = true;
    serverStatus.lastCheck = Date.now();
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, ищем в тестовых данных');
    serverStatus.available = false;
    serverStatus.lastCheck = Date.now();
    
    const mockOrg = mockOrganizations.find(org => org.id === id);
    if (mockOrg) {
      return mockOrg;
    }
    throw new Error(`Организация с ID ${id} не найдена`);
  }
};

/**
 * Создать новую организацию
 * @param {Object} organization - данные организации
 */
export const createOrganization = async (organization) => {
  const newOrg = {
    ...organization,
    id: organization.id || generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await api.post('/create', newOrg);
    serverStatus.available = true;
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем создание организации');
    serverStatus.available = false;
    
    // Проверяем уникальность ID
    if (mockOrganizations.some(org => org.id === newOrg.id)) {
      throw new Error('Организация с таким UUID уже существует');
    }
    
    mockOrganizations.push(newOrg);
    clearCache('organizations');
    return newOrg;
  }
};

/**
 * Обновить организацию
 * @param {string} id - UUID организации
 * @param {Object} updatedData - обновленные данные
 */
export const updateOrganization = async (id, updatedData) => {
  try {
    const response = await api.put(`/update/${id}`, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
    serverStatus.available = true;
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем обновление организации');
    serverStatus.available = false;
    
    const index = mockOrganizations.findIndex(org => org.id === id);
    if (index === -1) {
      throw new Error('Организация не найдена');
    }
    
    mockOrganizations[index] = {
      ...mockOrganizations[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    clearCache('organizations');
    return mockOrganizations[index];
  }
};

/**
 * Удалить организацию
 * @param {string} id - UUID организации
 */
export const deleteOrganization = async (id) => {
  try {
    const response = await api.delete(`/delete/${id}`);
    serverStatus.available = true;
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем удаление организации');
    serverStatus.available = false;
    
    const index = mockOrganizations.findIndex(org => org.id === id);
    if (index === -1) {
      throw new Error('Организация не найдена');
    }
    
    mockOrganizations.splice(index, 1);
    clearCache('organizations');
    return { success: true, id, deletedAt: new Date().toISOString() };
  }
};

/**
 * Рассчитать отчет
 * @param {Object} period - период { startDate, endDate }
 * @param {string} organizationId - UUID организации
 */
export const calculateReport = async (period, organizationId) => {
  const { startDate, endDate } = period;
  
  // Валидация дат
  if (!startDate || !endDate) {
    throw new Error('Не указан период отчета');
  }
  
  if (dayjs(endDate).isBefore(dayjs(startDate))) {
    throw new Error('Дата окончания периода не может быть раньше даты начала');
  }

  try {
    const response = await api.post('/calculate', {
      startDate: dayjs(startDate).format('YYYY-MM-DD'),
      endDate: dayjs(endDate).format('YYYY-MM-DD'),
      organizationId
    });
    serverStatus.available = true;
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, генерируем тестовые данные отчета');
    serverStatus.available = false;
    
    const mockData = generateMockReportData(startDate, endDate, organizationId);
    const org = mockOrganizations.find(o => o.id === organizationId) || { name: 'Тестовая организация' };
    
    // Добавляем метаданные к отчету
    return {
      data: mockData,
      meta: {
        organizationId,
        organizationName: org.name,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        totalRecords: mockData.length,
        totalProfit: mockData.reduce((sum, item) => sum + item.profit, 0),
        averageProfitability: mockData.reduce((sum, item) => sum + item.profitability, 0) / mockData.length
      }
    };
  }
};

/**
 * Получить статус сервера
 */
export const getServerStatus = () => {
  return serverStatus.available;
};

/**
 * Проверить соединение с сервером
 */
export const checkServerConnection = async () => {
  try {
    await api.get('/health', { timeout: 2000 });
    serverStatus.available = true;
    serverStatus.lastCheck = Date.now();
    return true;
  } catch (error) {
    serverStatus.available = false;
    serverStatus.lastCheck = Date.now();
    return false;
  }
};

/**
 * Очистить кэш организаций
 */
export const clearOrganizationsCache = () => {
  clearCache('organizations');
};

// =============== ЭКСПОРТ УТИЛИТ ===============
export const apiUtils = {
  generateUUID,
  isCacheValid,
  clearAllCache: clearCache,
  checkServerConnection,
  getServerStatus: () => ({ ...serverStatus })
};

export default {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  calculateReport,
  getServerStatus,
  clearOrganizationsCache,
  mockOrganizations,
  apiUtils
};