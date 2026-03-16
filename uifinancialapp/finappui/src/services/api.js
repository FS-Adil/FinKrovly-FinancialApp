import axios from 'axios';
import dayjs from 'dayjs';

// Убираем API_URL, так как используем прокси
const API_TIMEOUT = parseInt(import.meta.env.REACT_APP_API_TIMEOUT || '10000', 10);
const CACHE_DURATION = parseInt(import.meta.env.REACT_APP_CACHE_DURATION || '30000', 10);

// Базовый URL для API через прокси
const API_BASE_URL = '/api/v3';

// Конфигурация axios - убираем baseURL из конфигурации, так как будем использовать полные пути
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
//   timeout: API_TIMEOUT,
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
// ВАЖНО: Создаем КОПИЮ массива, а не используем константу
export const getInitialMockOrganizations = () => [
  { id: '11111111-1111-1111-1111-111111111111', name: 'ООО "Ромашка"', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'АО "ТехноПром"', createdAt: '2024-01-02T11:30:00Z', updatedAt: '2024-01-02T11:30:00Z' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'ООО "Альянс"', createdAt: '2024-01-03T09:15:00Z', updatedAt: '2024-01-03T09:15:00Z' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'ИП Иванов', createdAt: '2024-01-04T14:20:00Z', updatedAt: '2024-01-04T14:20:00Z' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'ЗАО "СтройИнвест"', createdAt: '2024-01-05T16:45:00Z', updatedAt: '2024-01-05T16:45:00Z' },
];

// Создаем изменяемый массив для мок-данных
let mockOrganizations = [...getInitialMockOrganizations()];

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
  // ВАЖНО: Создаем глубокую копию данных перед кэшированием
  cache[cacheKey] = {
    data: JSON.parse(JSON.stringify(data)),
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
      characteristic: `Характеристика ${i + 1}`,
      batch: `Партия ${i + 1}`,
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

/**
 * Сбросить мок-данные к исходному состоянию (для тестирования)
 */
export const resetMockOrganizations = () => {
  mockOrganizations = [...getInitialMockOrganizations()];
  clearCache('organizations');
  console.log('🔄 Мок-данные сброшены к исходному состоянию');
};

// =============== ОСНОВНЫЕ ФУНКЦИИ API ===============

/**
 * Получить список организаций
 * @param {boolean} forceRefresh - игнорировать кэш
 * @param {AbortSignal} signal - сигнал для отмены запроса
 */
export const getOrganizations = async (forceRefresh = false, signal = null) => {
  console.log('📥 getOrganizations вызван, forceRefresh:', forceRefresh);
  
  // Проверяем кэш
  if (!forceRefresh && isCacheValid('organizations')) {
    console.log('📦 Возвращаем кэшированные данные организаций');
    // ВАЖНО: Возвращаем копию данных из кэша
    return JSON.parse(JSON.stringify(cache.organizations.data));
  }

  try {
    // Используем полный путь через прокси
    const response = await api.get(`${API_BASE_URL}/organizations`, { signal });
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
    
    // ВАЖНО: Возвращаем КОПИЮ актуальных мок-данных
    const dataToReturn = JSON.parse(JSON.stringify(mockOrganizations));
    setCache('organizations', dataToReturn);
    return dataToReturn;
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
    if (org) return JSON.parse(JSON.stringify(org));
  }
  
  try {
    const response = await api.get(`${API_BASE_URL}/organizations/${id}`);
    serverStatus.available = true;
    serverStatus.lastCheck = Date.now();
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, ищем в тестовых данных');
    serverStatus.available = false;
    serverStatus.lastCheck = Date.now();
    
    const mockOrg = mockOrganizations.find(org => org.id === id);
    if (mockOrg) {
      return JSON.parse(JSON.stringify(mockOrg));
    }
    throw new Error(`Организация с ID ${id} не найдена`);
  }
};

/**
 * Создать новую организацию
 * @param {Object} organization - данные организации
 */
export const createOrganization = async (organization) => {
  console.log('➕ Создание организации:', organization);
  
  const newOrg = {
    ...organization,
    id: organization.id || generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await api.post(`${API_BASE_URL}/organizations`, newOrg);
    serverStatus.available = true;
    // ВАЖНО: Очищаем кэш после успешного создания
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем создание организации');
    serverStatus.available = false;
    
    // Проверяем уникальность ID
    if (mockOrganizations.some(org => org.id === newOrg.id)) {
      throw new Error('Организация с таким UUID уже существует');
    }
    
    // ВАЖНО: Добавляем в массив мок-данных
    mockOrganizations.push(newOrg);
    console.log('✅ Организация добавлена в мок-данные. Всего:', mockOrganizations.length);
    
    // ВАЖНО: Очищаем кэш, чтобы при следующем запросе получить актуальные данные
    clearCache('organizations');
    
    return JSON.parse(JSON.stringify(newOrg));
  }
};

/**
 * Обновить организацию
 * @param {string} id - UUID организации
 * @param {Object} updatedData - обновленные данные
 */
export const updateOrganization = async (id, updatedData) => {
  console.log('✏️ Обновление организации:', id, updatedData);
  
  try {
    const response = await api.put(`${API_BASE_URL}/organizations/${id}`, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
    serverStatus.available = true;
    // ВАЖНО: Очищаем кэш после успешного обновления
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем обновление организации');
    serverStatus.available = false;
    
    const index = mockOrganizations.findIndex(org => org.id === id);
    if (index === -1) {
      throw new Error('Организация не найдена');
    }
    
    // ВАЖНО: Обновляем данные в массиве
    mockOrganizations[index] = {
      ...mockOrganizations[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Организация обновлена в мок-данных');
    
    // ВАЖНО: Очищаем кэш, чтобы при следующем запросе получить актуальные данные
    clearCache('organizations');
    
    return JSON.parse(JSON.stringify(mockOrganizations[index]));
  }
};

/**
 * Удалить организацию
 * @param {string} id - UUID организации
 */
export const deleteOrganization = async (id) => {
  console.log('🗑️ Удаление организации:', id);
  
  try {
    const response = await api.delete(`${API_BASE_URL}/organizations/${id}`);
    serverStatus.available = true;
    // ВАЖНО: Очищаем кэш после успешного удаления
    clearCache('organizations');
    return response.data;
  } catch (error) {
    console.warn('⚠️ API недоступен, имитируем удаление организации');
    serverStatus.available = false;
    
    const index = mockOrganizations.findIndex(org => org.id === id);
    if (index === -1) {
      throw new Error('Организация не найдена');
    }
    
    // ВАЖНО: Удаляем из массива
    mockOrganizations.splice(index, 1);
    console.log('✅ Организация удалена из мок-данных. Осталось:', mockOrganizations.length);
    
    // ВАЖНО: Очищаем кэш, чтобы при следующем запросе получить актуальные данные
    clearCache('organizations');
    
    return { success: true, id, deletedAt: new Date().toISOString() };
  }
};

/**
 * ПРЕОБРАЗОВАТЕЛЬ ДАННЫХ - только преобразование, без генерации
 * @param {Array} serverData - данные с сервера (поля: Наименование, Количество, Стоимость, Себестоимость)
 * @param {string} startDate - дата начала в формате YYYY-MM-DD
 * @param {string} endDate - дата окончания в формате YYYY-MM-DD
 * @param {string} organizationId - ID организации
 * @returns {Array} - преобразованные данные в формате generateMockReportData
 */
const transformServerData = (serverData, startDate, endDate, organizationId, orgName) => {
  // Если нет данных с сервера, возвращаем пустой массив
  if (!serverData || !Array.isArray(serverData) || serverData.length === 0) {
    console.warn('Нет данных с сервера для преобразования');
    return [];
  }

  // Константы для категорий (как в оригинале)
  const PRODUCT_CATEGORIES = [
    'Металлопродукция',
  ];

  // Название организации (можно получить с сервера или использовать заглушку)
  const organizationName = `${orgName} ${organizationId}`;

  // Преобразуем каждый элемент с сервера
  return serverData.map((item, index) => {
    // Проверяем наличие всех необходимых полей
    const refKey = item['refKey']
    const number = item['number']
    const name = item['name'];
    const characteristic = item['characteristic'];
    const batch = item['batch'];
    const quantity = item['quantity'];
    const price = item['price'];
    const cost = item['cost'];

    // Если критически важные поля отсутствуют, пропускаем элемент
    if (!name || isNaN(quantity) || isNaN(price) || isNaN(cost)) {
      console.warn('Пропущен элемент с некорректными данными:', item);
      return null;
    }

    // Вычисляем прибыль и рентабельность
    const profit = parseFloat((price - cost).toFixed(2));
    const profitability = cost > 0 
      ? parseFloat(((profit / cost) * 100).toFixed(2))
      : 0;

    // Генерируем ID и productId (как в оригинале)
    // const id = `${organizationId}-${index + 1}-${Date.now()}`;
    // const productId = `PRD-${(index + 1).toString().padStart(6, '0')}`;
    const id = refKey;
    const productId = number;

    // Определяем категорию на основе названия товара
    const category = PRODUCT_CATEGORIES[0];

    // Возвращаем объект в формате generateMockReportData
    return {
      id,
      productId,
      name,
      characteristic,
      batch,
      category,
      quantity,
      price,
      cost,
      profit,
      profitability,
      date: generateRandomDate(startDate, endDate), // дата генерируется случайно
      organization: organizationName,
      organizationId,
    };
  }).filter(item => item !== null); // Удаляем некорректные элементы
};

/**
 * Генерирует случайную дату в заданном диапазоне
 * @param {string} startDate - начальная дата
 * @param {string} endDate - конечная дата
 * @returns {string} - дата в формате YYYY-MM-DD
 */
const generateRandomDate = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const daysDiff = end.diff(start, 'day');
  
  return start
    .add(Math.floor(Math.random() * (daysDiff + 1)), 'day')
    .format('YYYY-MM-DD');
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
    const response = await api.post(`${API_BASE_URL}/cost-price/assembly`, {
      startDate: dayjs(startDate).format('YYYY-MM-DD') + 'T00:00:00',
      endDate: dayjs(endDate).format('YYYY-MM-DD') + 'T23:59:59',
      organizationId
    });
    serverStatus.available = true;

    const org = mockOrganizations.find(o => o.id === organizationId) || { name: 'Тестовая организация' };
    const transformedData = transformServerData(
      response.data, 
      startDate, 
      endDate, 
      organizationId,
      org.name
    );

    return {
      data: transformedData,
      meta: {
        organizationId,
        organizationName: org.name,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        totalRecords: transformedData.length,
        totalProfit: transformedData.reduce((sum, item) => sum + item.profit, 0),
        averageProfitability: transformedData.reduce((sum, item) => sum + item.profitability, 0) / transformedData.length
      }
    };
  } catch (error) {
    console.warn('⚠️ API недоступен, генерируем тестовые данные отчета{}', error);
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
    console.info('Получить статус сервера {}', serverStatus.available);
  return serverStatus.available;
};

/**
 * Проверить соединение с сервером
 */
export const checkServerConnection = async () => {
  try {
    await api.get(`${API_BASE_URL}/health`, { timeout: 2000 });
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
  console.log('🧹 Принудительная очистка кэша организаций');
  clearCache('organizations');
};

// =============== ЭКСПОРТ УТИЛИТ ===============
export const apiUtils = {
  generateUUID,
  isCacheValid,
  clearAllCache: clearCache,
  checkServerConnection,
  getServerStatus: () => ({ ...serverStatus }),
  resetMockOrganizations,
  getMockOrganizations: () => JSON.parse(JSON.stringify(mockOrganizations))
};

// ВАЖНО: Экспортируем актуальные мок-данные как функцию, а не как константу
export { mockOrganizations };

export default {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  calculateReport,
  getServerStatus,
  clearOrganizationsCache,
  resetMockOrganizations,
  apiUtils
};


/**
 * ПРЕОБРАЗОВАТЕЛЬ ДАННЫХ - исправленная версия
 * @param {Array} serverData - данные с сервера
 * @param {string} date - дата
 * @param {string} organizationId - ID организации
 * @param {string} orgName - название организации
 * @returns {Array} - преобразованные данные
 */
const transformServerDataInventory = (serverData, date, organizationId, orgName) => {
  // Если нет данных с сервера, возвращаем пустой массив
  if (!serverData || !Array.isArray(serverData) || serverData.length === 0) {
    console.warn('Нет данных с сервера для преобразования');
    return [];
  }

  console.log('🔄 Преобразование данных сервера:', serverData);

  // Преобразуем каждый элемент с сервера
  return serverData.map((item, index) => {
    // Проверяем наличие всех необходимых полей
    // Используем различные возможные названия полей, которые могут прийти с сервера
    const name = item['name'] || item['Наименование'] || item['наименование'] || '';
    const characteristic = item['characteristic'] || item['Характеристика'] || item['характеристика'] || '';
    const batch = item['batch'] || item['Партия'] || item['партия'] || '';
    const quantity = item['quantity'] || item['Количество'] || item['количество'] || 0;
    const cost = item['cost'] || item['Себестоимость'] || item['себестоимость'] || item['price'] || 0;
    
    // Генерируем ID, если его нет
    const id = item['id'] || item['refKey'] || item['ref_key'] || `${organizationId}-${index + 1}-${Date.now()}`;
    const productId = item['productId'] || item['number'] || item['Номер'] || `PRD-${(index + 1).toString().padStart(6, '0')}`;

    // Возвращаем объект в нужном формате даже с некорректными данными
    return {
      id,
      productId,
      name: String(name || 'Без названия'),
      characteristic: String(characteristic || ''),
      batch: String(batch || ''),
      quantity: Number(quantity) || 0,
      cost: Number(cost) || 0,
      date: date,
      organization: orgName,
      organizationId,
    };
  }).filter(item => item !== null); // Удаляем null элементы (если вдруг появятся)
};

/**
 * Рассчитать себестоимость остатков на складе
 * @param {Object} params - параметры { date }
 * @param {string} organizationId - UUID организации
 */
export const calculateAssemblyCost = async (params, organizationId) => {
  const { date } = params;
  
  if (!date) {
    throw new Error('Не указана дата остатков');
  }

  try {
    console.log('📤 Отправка запроса на сервер:', {
      url: `${API_BASE_URL}/inventory/balance-cost`,
      data: {
        date: dayjs(date).format('YYYY-MM-DD') + 'T23:59:59',
        organizationId
      }
    });

    const response = await api.post(`${API_BASE_URL}/inventory/balance-cost`, {
      date: dayjs(date).format('YYYY-MM-DD') + 'T23:59:59',
      organizationId
    });
    
    serverStatus.available = true;
    
    console.log('📦 Ответ от сервера:', response.data);

    const org = mockOrganizations.find(o => o.id === organizationId) || { 
      name: 'Тестовая организация' 
    };
    
    // Преобразуем данные с сервера
    let transformedData = [];
    
    if (response.data && Array.isArray(response.data)) {
      transformedData = transformServerDataInventory(
        response.data, 
        date, 
        organizationId,
        org.name
      );
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      transformedData = transformServerDataInventory(
        response.data.data, 
        date, 
        organizationId,
        org.name
      );
    } else if (Array.isArray(response.data)) {
      transformedData = transformServerDataInventory(
        response.data, 
        date, 
        organizationId,
        org.name
      );
    }

    console.log('✅ Преобразованные данные:', transformedData.length, 'записей');

    return {
      data: transformedData,
      meta: {
        organizationId,
        organizationName: org.name,
        date,
        generatedAt: new Date().toISOString(),
        totalRecords: transformedData.length,
        totalCost: transformedData.reduce((sum, item) => sum + (item.cost || 0), 0)
      },
      processId: `inventory_cost_${Date.now()}`
    };
  } catch (error) {
    console.warn('⚠️ API недоступен, генерируем тестовые данные остатков', error);
    serverStatus.available = false;
    
    const mockData = generateMockBalanceData(date, organizationId);
    const org = mockOrganizations.find(o => o.id === organizationId) || { 
      name: 'Тестовая организация' 
    };
    
    return {
      data: mockData,
      meta: {
        organizationId,
        organizationName: org.name,
        date,
        generatedAt: new Date().toISOString(),
        totalRecords: mockData.length,
        totalCost: mockData.reduce((sum, item) => sum + item.cost, 0)
      },
      processId: `inventory_cost_mock_${Date.now()}`
    };
  }
};

/**
 * Генерация тестовых данных для остатков на складе
 */
const generateMockBalanceData = (date, organizationId) => {
  const org = mockOrganizations.find(o => o.id === organizationId) || { 
    id: organizationId, 
    name: 'Тестовая организация' 
  };
  
  const PRODUCT_CATEGORIES = [
    'Электроника', 'Одежда', 'Продукты', 'Мебель', 'Канцелярия',
    'Автозапчасти', 'Косметика', 'Книги', 'Игрушки', 'Спорттовары'
  ];

  const recordCount = Math.floor(Math.random() * 100) + 50;
  
  return Array.from({ length: recordCount }, (_, i) => ({
    id: `${organizationId}-balance-${i + 1}-${Date.now()}`,
    productId: `PRD-${(i + 1).toString().padStart(6, '0')}`,
    name: `Товар ${i + 1}`,
    characteristic: `Характеристика ${Math.floor(Math.random() * 10) + 1}`,
    batch: `Партия ${Math.floor(Math.random() * 20) + 1}`,
    category: PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)],
    quantity: Math.floor(Math.random() * 500) + 1,
    cost: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
    date,
    organization: org.name,
    organizationId: org.id,
  }));
};