// services/calculationApi.js

import axios from 'axios';

// Базовый URL для API через прокси
const API_BASE_URL = '/api/v1';

// Статусы этапов
export const STAGE_STATUS = {
  PENDING: 'pending',      // В процессе
  SUCCESS: 'success',      // Успешно
  ERROR: 'error'           // Ошибка
};

// Названия этапов
export const STAGE_NAMES = {
  GET_EXPENSES: 'Получение расходников',
  GET_INCOMES: 'Получение приходников',
  CALCULATE_COST: 'Расчет себестоимости товаров',
  CALCULATE_PRODUCTION: 'Расчет продукции по производству',
  CALCULATE_FINAL_COST: 'Расчет себестоимости продукции'
};

// Конфигурация axios
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Класс для работы с API расчета
class CalculationApi {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.processId = null;
    this.resetStages();
  }

  // Сброс этапов к начальному состоянию
  resetStages() {
    this.stages = [
      { id: 1, name: STAGE_NAMES.GET_EXPENSES, status: STAGE_STATUS.PENDING, error: null },
      { id: 2, name: STAGE_NAMES.GET_INCOMES, status: STAGE_STATUS.PENDING, error: null },
      { id: 3, name: STAGE_NAMES.CALCULATE_COST, status: STAGE_STATUS.PENDING, error: null },
      { id: 4, name: STAGE_NAMES.CALCULATE_PRODUCTION, status: STAGE_STATUS.PENDING, error: null },
      { id: 5, name: STAGE_NAMES.CALCULATE_FINAL_COST, status: STAGE_STATUS.PENDING, error: null }
    ];
  }

  // Запуск нового процесса расчета
  async startCalculation(params) {
    try {
      const response = await api.post(`${this.baseUrl}/calculation/start`, params);
      
      if (response.data) {
        this.processId = response.data.processId;
        return response.data;
      }
      throw new Error('Ошибка запуска расчета');
    } catch (error) {
      console.error('Error starting calculation:', error);
      // В демо-режиме возвращаем тестовые данные
      return this.simulateStartCalculation();
    }
  }

  // Получение статуса процесса
  async getProcessStatus(processId) {
    try {
      const response = await api.get(`${this.baseUrl}/calculation/status/${processId}`);
      
      if (response.data) {
        return response.data;
      }
      throw new Error('Ошибка получения статуса');
    } catch (error) {
      console.error('Error getting process status:', error);
      // В демо-режиме симулируем прогресс
      return this.simulateProgress(processId);
    }
  }

  // Отмена процесса - отправляем POST с статусом close
  async cancelProcess(processId) {
    try {
      const response = await api.post(`${this.baseUrl}/calculation/cancel/${processId}`, {
        status: 'close',
        processId: processId,
        timestamp: new Date().toISOString()
      });
      
      if (response.data) {
        return response.data;
      }
      return { success: true, message: 'Процесс отменен' };
    } catch (error) {
      console.error('Error canceling process:', error);
      // В случае ошибки все равно возвращаем успех для демо-режима
      return { 
        success: true, 
        message: 'Процесс отменен (демо-режим)',
        demo: true 
      };
    }
  }

  // Симуляция запуска расчета (для демо)
  simulateStartCalculation() {
    this.processId = 'demo_' + Date.now();
    this.currentStage = 0;
    
    // Сбрасываем статусы этапов
    this.resetStages();
    
    return { 
      processId: this.processId, 
      message: 'Расчет запущен (демо-режим)',
      stages: this.stages,
      demo: true
    };
  }

  // Симуляция прогресса (для демо)
  simulateProgress(processId) {
    if (!processId) return null;
    
    this.processId = processId;
    
    // Если это новый процесс (все этапы в PENDING), начинаем симуляцию
    const allPending = this.stages.every(stage => stage.status === STAGE_STATUS.PENDING);
    
    // Обновляем статусы этапов
    const updatedStages = [...this.stages];
    
    // Находим первый незавершенный этап
    const nextPendingIndex = updatedStages.findIndex(
      stage => stage.status === STAGE_STATUS.PENDING
    );
    
    if (nextPendingIndex !== -1) {
      // С вероятностью 80% успех, 20% ошибка для демо
      if (Math.random() > 0.2) {
        updatedStages[nextPendingIndex].status = STAGE_STATUS.SUCCESS;
      } else {
        updatedStages[nextPendingIndex].status = STAGE_STATUS.ERROR;
        updatedStages[nextPendingIndex].error = 'Ошибка подключения к базе данных';
      }
    }
    
    this.stages = updatedStages;
    
    // Проверяем, все ли этапы завершены
    const allCompleted = updatedStages.every(
      stage => stage.status === STAGE_STATUS.SUCCESS || stage.status === STAGE_STATUS.ERROR
    );
    
    return {
      processId: this.processId,
      stages: updatedStages,
      completed: allCompleted,
      message: allCompleted ? 'Расчет завершен' : 'Расчет продолжается',
      demo: true
    };
  }

  // Сброс состояния для нового расчета
  reset() {
    this.processId = null;
    this.resetStages();
  }
}

export const calculationApi = new CalculationApi();