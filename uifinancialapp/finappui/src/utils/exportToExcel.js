import * as XLSX from 'xlsx';

// Словарь для перевода полей на русский язык
const FIELD_TRANSLATIONS = {
  id: 'ID',
  productId: 'Номер Расходника',
  name: 'Наименование',
  characteristic: 'Характеристика',
  batch: 'Партия',
  measurementUnit: 'Ед. измерения',
  category: 'Категория',
  quantity: 'Количество',
  price: 'Цена',
  autoFilling: 'Авто Расчет',
  cost: 'Себестоимость',
  profit: 'Прибыль',
  profitability: 'Рентабельность',
  date: 'Дата',
  organization: 'Организация',
  organizationId: 'ID организации'
};

// Определяем порядок полей (только те, которые нужны в Excel)
// Просто комментируем ненужные поля
const FIELD_ORDER = [
  // 'id',                    // Не нужно
  'productId',
  'name',
  'characteristic',
  'batch',
  'category',         
  'measurementUnit',
  'quantity',
  'price',
  'Цена за единицу',         // Вычисляемое поле
  'autoFilling',
  'cost',
  'Себестоимость единицы',   // Вычисляемое поле
  'profit',
  'profitability',         
  // 'date',                  // Не нужно
  // 'organization',          // Не нужно
  // 'organizationId',        // Не нужно
  // 'Прибыль с единицы'      // Не нужно
];

// Функция для вычисления дополнительных полей
const calculateAdditionalFields = (item) => {
  const additionalFields = {};
  
  // Себестоимость единицы = cost / quantity
  if (item.cost != null && item.quantity != null && item.quantity !== 0) {
    additionalFields['Себестоимость единицы'] = Number((item.cost / item.quantity).toFixed(2));
  }
  
  // Цена за единицу
  if (item.price != null && item.quantity != null && item.quantity !== 0) {
    additionalFields['Цена за единицу'] = Number((item.price / item.quantity).toFixed(2));
  }
  
  // Прибыль с единицы
  if (item.profit != null && item.quantity != null && item.quantity !== 0) {
    additionalFields['Прибыль с единицы'] = Number((item.profit / item.quantity).toFixed(2));
  }
  
  return additionalFields;
};

// Функция для автоматического расчета ширины колонок
const calculateColumnWidths = (data) => {
  if (!data || data.length === 0) return [];
  
  const columnWidths = {};
  
  // Проходим по всем строкам данных
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      // Получаем значение ячейки
      let value = row[key];
      
      // Преобразуем в строку для измерения
      let strValue = '';
      
      if (value === null || value === undefined) {
        strValue = '';
      } else if (typeof value === 'number') {
        // Для чисел учитываем формат с десятичными
        strValue = value.toFixed(2);
      } else if (value instanceof Date) {
        // Для дат используем формат
        strValue = value.toLocaleDateString('ru-RU');
      } else {
        strValue = String(value);
      }
      
      // Вычисляем длину строки в символах
      // Учитываем, что русские буквы шире латинских (коэффициент ~1.5)
      let length = 0;
      for (let i = 0; i < strValue.length; i++) {
        const char = strValue[i];
        // Проверяем, является ли символ кириллицей
        if (/[а-яА-ЯёЁ]/.test(char)) {
          length += 1,5; // Русские буквы шире
        } else {
          length += 1; // Латиница, цифры, знаки
        }
      }
      
      // Добавляем небольшой отступ
      length += 2;
      
      // Сохраняем максимальную ширину для каждого столбца
      if (!columnWidths[key] || length > columnWidths[key]) {
        columnWidths[key] = Math.min(length, 50); // Максимальная ширина 50 символов
      }
    });
  });
  
  // Также учитываем ширину заголовков
  // Object.keys(columnWidths).forEach(key => {
  //   const headerLength = key.length * 1.2; // Заголовки обычно немного шире
  //   columnWidths[key] = Math.max(columnWidths[key], headerLength, 10); // Минимальная ширина 10
  //   columnWidths[key] = Math.min(columnWidths[key], 50); // Максимальная ширина 50
  // });
  
  return columnWidths;
};

// Функция для преобразования данных с сохранением порядка
const transformDataForExport = (data) => {
  if (!Array.isArray(data)) {
    data = [data];
  }
  
  return data.map(item => {
    const transformedItem = {};
    
    // Вычисляем дополнительные поля
    const additionalFields = calculateAdditionalFields(item);
    
    // Собираем только те поля, которые указаны в FIELD_ORDER
    FIELD_ORDER.forEach(fieldKey => {
      // Проверяем, это обычное поле или вычисляемое
      if (item.hasOwnProperty(fieldKey)) {
        // Обычное поле из данных
        const russianKey = FIELD_TRANSLATIONS[fieldKey] || fieldKey;
        transformedItem[russianKey] = item[fieldKey];
      } else if (additionalFields.hasOwnProperty(fieldKey)) {
        // Вычисляемое поле
        transformedItem[fieldKey] = additionalFields[fieldKey];
      }
    });
    
    return transformedItem;
  });
};

// Функция для получения названия организации
const getOrganizationName = (data) => {
  if (data?.[0]?.organization) return data[0].organization;
  if (data?.organization) return data.organization;
  return 'report';
};

// Функция для форматирования даты
const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

// Основная функция экспорта
export const exportToExcel = (data, filename = 'report') => {
  // Преобразуем данные (перевод + вычисляемые поля)
  const transformedData = transformDataForExport(data);
  
  // Получаем название организации
  const orgName = getOrganizationName(data);
  
  // Получаем текущую дату и время
  const dateTimeStr = formatDateTime(new Date());
  
  // Генерируем имя файла
  const finalFilename = `${filename}_${orgName}_${dateTimeStr}.xlsx`;
  
  // Создаем worksheet с преобразованными данными
  const worksheet = XLSX.utils.json_to_sheet(transformedData);
  
  // Автоматически рассчитываем ширину колонок на основе содержимого
  const columnWidths = calculateColumnWidths(transformedData);
  
  // Применяем ширину к колонкам
  const cols = Object.keys(transformedData[0] || {}).map(key => ({
    wch: columnWidths[key] || 15
  }));
  worksheet['!cols'] = cols;
  
  // Дополнительно: форматирование чисел (опционально)
  // Можно добавить формат для числовых колонок
  // const range = XLSX.utils.decode_range(worksheet['!ref']);
  // for (let row = range.s.r; row <= range.e.r; row++) {
  //   for (let col = range.s.c; col <= range.e.c; col++) {
  //     const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  //     if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
  //       worksheet[cellAddress].z = '# ##0.00'; // Формат числа
  //     }
  //   }
  // }
  
  // Создаем workbook и сохраняем
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
  XLSX.writeFile(workbook, finalFilename);
  
  return finalFilename;
};