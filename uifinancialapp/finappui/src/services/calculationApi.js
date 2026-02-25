// services/calculationApi.js

// Базовый URL для API
const API_BASE_URL = 'http://localhost:3001/api';

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

// Симулируем работу сервера (для демонстрации)
const simulateServerDelay = () => new Promise(resolve => setTimeout(resolve, 1000));

// Класс для работы с API расчета
class CalculationApi {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.processId = null;
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
      const response = await fetch(`${this.baseUrl}/calculation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Ошибка запуска расчета');
      }
      
      const data = await response.json();
      this.processId = data.processId;
      return data;
    } catch (error) {
      console.error('Error starting calculation:', error);
      // В демо-режиме возвращаем тестовые данные
      return this.simulateStartCalculation();
    }
  }

  // Получение статуса процесса
  async getProcessStatus(processId) {
    try {
      const response = await fetch(`${this.baseUrl}/calculation/status/${processId}`);
      
      if (!response.ok) {
        throw new Error('Ошибка получения статуса');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting process status:', error);
      // В демо-режиме симулируем прогресс
      return this.simulateProgress();
    }
  }

  // Отмена процесса
  async cancelProcess(processId) {
    try {
      const response = await fetch(`${this.baseUrl}/calculation/cancel/${processId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка отмены процесса');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error canceling process:', error);
      return { success: true, message: 'Процесс отменен' };
    }
  }

  // Симуляция запуска расчета (для демо)
  simulateStartCalculation() {
    this.processId = 'demo_' + Date.now();
    this.currentStage = 0;
    return { 
      processId: this.processId, 
      message: 'Расчет запущен',
      stages: this.stages 
    };
  }

  // Симуляция прогресса (для демо)
  simulateProgress() {
    if (!this.processId) return null;
    
    // Обновляем статусы этапов
    const updatedStages = [...this.stages];
    const randomStage = Math.floor(Math.random() * 5);
    
    // Случайным образом обновляем статус одного из этапов
    if (Math.random() > 0.7) {
      updatedStages[randomStage].status = STAGE_STATUS.SUCCESS;
    } else if (Math.random() > 0.8) {
      updatedStages[randomStage].status = STAGE_STATUS.ERROR;
      updatedStages[randomStage].error = 'Ошибка подключения к базе данных';
    }
    
    // Проверяем, все ли этапы завершены
    const allCompleted = updatedStages.every(
      stage => stage.status === STAGE_STATUS.SUCCESS || stage.status === STAGE_STATUS.ERROR
    );
    
    return {
      processId: this.processId,
      stages: updatedStages,
      completed: allCompleted,
      message: allCompleted ? 'Расчет завершен' : 'Расчет продолжается'
    };
  }
}

export const calculationApi = new CalculationApi();