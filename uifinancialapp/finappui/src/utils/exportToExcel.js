import * as XLSX from 'xlsx';

export const exportToExcel = (data, filename = null) => {
  // Получаем название организации (если есть)
  const orgName = data?.[0]?.organization || data?.organization || 'report';
  
  // Получаем текущую дату и время
  const now = new Date();
  
  // Формат: ГГГГ-ММ-ДД_ЧЧ-ММ-СС
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const dateTimeStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  
  // Генерируем имя файла
  const finalFilename = filename || `${orgName}_${dateTimeStr}.xlsx`;
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
  XLSX.writeFile(workbook, finalFilename);
};