// Конфигурация дочерних приложений
export const MENU_ITEMS = [
  { id: 1, name: 'Махачкала ФК', url: 'http://localhost:3001' },
  { id: 2, name: 'Махачкала НК', url: 'http://localhost:3001' },
  { id: 3, name: 'Дербент НК', url: 'http://localhost:3001' },
  { id: 4, name: 'Астрахань ФК', url: 'http://localhost:3002' },
  { id: 5, name: 'Астрахань СД', url: 'http://localhost:3002' },
  { id: 6, name: 'Пятигорск Кровля', url: 'https://monitoring.finkrovl.ru' },
  { id: 7, name: 'Пятигорск Вентиляция', url: 'http://localhost:3033' },
  { id: 8, name: 'Ростов', url: 'http://localhost:3030' },
  { id: 9, name: 'Москва', url: 'http://localhost:3031' },
];

// Разрешенные origins для postMessage
export const ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3030',
  'https://monitoring.finkrovl.ru',
];

// Типы сообщений для postMessage
export const MESSAGE_TYPES = {
  AUTH_DATA: 'AUTH_DATA',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  REQUEST_AUTH: 'REQUEST_AUTH',
  READY: 'READY',
  RESIZE: 'RESIZE',
  PARENT_READY: 'PARENT_READY',
};

// Таймауты
export const TIMEOUTS = {
  IFRAME_LOAD: 20000,      // Таймаут загрузки iframe
  READY_MESSAGE: 10000,    // Таймаут ожидания READY
  CHECK_INTERVAL: 500,     // Интервал проверки доступности
  RETRY_DELAY: 50,         // Задержка при перезагрузке
};