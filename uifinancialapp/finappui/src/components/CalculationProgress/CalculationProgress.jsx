// components/CalculationProgress/CalculationProgress.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Space, Spin, Alert, Progress, Tag, Tooltip, message } from 'antd';
import { 
  CloseOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  LoadingOutlined,
  ClockCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { calculationApi, STAGE_STATUS, STAGE_NAMES } from '../../services/calculationApi';
import './CalculationProgress.css';

const CalculationProgress = ({ 
  visible, 
  onClose, 
  onCancel, 
  calculationParams,
  pollingInterval = 2000 // Интервал опроса сервера (в мс)
}) => {
  const [processId, setProcessId] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const pollingRef = useRef(null);

  // Инициализация этапов
  const initializeStages = useCallback(() => {
    return [
      { id: 1, name: STAGE_NAMES.GET_EXPENSES, status: STAGE_STATUS.PENDING, error: null },
      { id: 2, name: STAGE_NAMES.GET_INCOMES, status: STAGE_STATUS.PENDING, error: null },
      { id: 3, name: STAGE_NAMES.CALCULATE_COST, status: STAGE_STATUS.PENDING, error: null },
      { id: 4, name: STAGE_NAMES.CALCULATE_PRODUCTION, status: STAGE_STATUS.PENDING, error: null },
      { id: 5, name: STAGE_NAMES.CALCULATE_FINAL_COST, status: STAGE_STATUS.PENDING, error: null }
    ];
  }, []);

  // Запуск расчета
  const startCalculation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStages(initializeStages());
    
    try {
      const response = await calculationApi.startCalculation(calculationParams);
      setProcessId(response.processId);
      
      // Если в ответе уже есть этапы, используем их
      if (response.stages) {
        setStages(response.stages);
      }
      
      message.success('Расчет запущен');
    } catch (err) {
      setError('Ошибка запуска расчета: ' + err.message);
      message.error('Ошибка запуска расчета');
    } finally {
      setLoading(false);
    }
  }, [calculationParams, initializeStages]);

  // Получение статуса процесса
  const fetchProcessStatus = useCallback(async () => {
    if (!processId) return;

    try {
      const response = await calculationApi.getProcessStatus(processId);
      
      if (response && response.stages) {
        setStages(response.stages);
        
        if (response.completed) {
          setCompleted(true);
          stopPolling();
          message.success('Расчет завершен');
        }
      }
    } catch (err) {
      setError('Ошибка получения статуса: ' + err.message);
    }
  }, [processId]);

  // Остановка опроса
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Запуск опроса при появлении processId
  useEffect(() => {
    if (processId && !completed) {
      // Первый запрос сразу
      fetchProcessStatus();
      
      // Затем запускаем интервал
      pollingRef.current = setInterval(fetchProcessStatus, pollingInterval);
    }

    return () => {
      stopPolling();
    };
  }, [processId, completed, fetchProcessStatus, pollingInterval, stopPolling]);

  // Запуск расчета при открытии модального окна
  useEffect(() => {
    if (visible) {
      startCalculation();
    } else {
      // При закрытии очищаем состояние
      setProcessId(null);
      setStages([]);
      setCompleted(false);
      setError(null);
      stopPolling();
    }
  }, [visible, startCalculation, stopPolling]);

  // Обработчик отмены
  const handleCancel = async () => {
    if (processId && !completed) {
      try {
        await calculationApi.cancelProcess(processId);
        message.info('Расчет отменен');
      } catch (err) {
        console.error('Error canceling process:', err);
      }
    }
    
    stopPolling();
    
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  // Получение иконки для статуса
  const getStatusIcon = (status) => {
    switch (status) {
      case STAGE_STATUS.SUCCESS:
        return <CheckCircleOutlined className="stage-icon success" />;
      case STAGE_STATUS.ERROR:
        return <CloseCircleOutlined className="stage-icon error" />;
      case STAGE_STATUS.PENDING:
        return <LoadingOutlined className="stage-icon pending" spin />;
      default:
        return <ClockCircleOutlined className="stage-icon waiting" />;
    }
  };

  // Получение цвета статуса
  const getStatusColor = (status) => {
    switch (status) {
      case STAGE_STATUS.SUCCESS:
        return '#52c41a';
      case STAGE_STATUS.ERROR:
        return '#f5222d';
      case STAGE_STATUS.PENDING:
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  // Подсчет прогресса
  const calculateProgress = () => {
    if (!stages.length) return 0;
    
    const completedStages = stages.filter(
      stage => stage.status === STAGE_STATUS.SUCCESS || stage.status === STAGE_STATUS.ERROR
    ).length;
    
    return Math.round((completedStages / stages.length) * 100);
  };

  return (
    <Modal
      title={
        <Space>
          <span className="modal-title">Процесс расчета</span>
          {loading && <Spin size="small" />}
          {completed && (
            <Tag color="green" className="status-tag">Завершено</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button 
          key="cancel" 
          onClick={handleCancel}
          icon={<CloseOutlined />}
          danger={!completed}
          type={completed ? 'default' : 'primary'}
        >
          {completed ? 'Закрыть' : 'Отменить расчет'}
        </Button>
      ]}
      width={600}
      closable={false}
      maskClosable={false}
      className="calculation-progress-modal"
    >
      <div className="progress-container">
        {/* Общий прогресс */}
        <div className="overall-progress">
          <Progress
            type="circle"
            percent={calculateProgress()}
            format={(percent) => `${percent}%`}
            width={80}
            status={error ? 'exception' : 'active'}
          />
          <div className="progress-info">
            <h4>Общий прогресс</h4>
            <p>
              {completed 
                ? 'Расчет завершен' 
                : error 
                  ? 'Ошибка расчета' 
                  : 'Выполняется расчет...'}
            </p>
          </div>
        </div>

        {/* Ошибка если есть */}
        {error && (
          <Alert
            message="Ошибка"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="error-alert"
          />
        )}

        {/* Список этапов */}
        <div className="stages-list">
          <h4>Этапы расчета:</h4>
          {stages.map((stage, index) => (
            <div key={stage.id} className="stage-item">
              <div className="stage-header">
                <Space>
                  <span className="stage-number">{index + 1}.</span>
                  <span className="stage-name">{stage.name}</span>
                  {getStatusIcon(stage.status)}
                </Space>
                <Tag color={getStatusColor(stage.status)}>
                  {stage.status === STAGE_STATUS.SUCCESS && 'Успешно'}
                  {stage.status === STAGE_STATUS.ERROR && 'Ошибка'}
                  {stage.status === STAGE_STATUS.PENDING && 'В процессе'}
                  {!stage.status && 'Ожидание'}
                </Tag>
              </div>
              
              {/* Индикатор прогресса для текущего этапа */}
              {stage.status === STAGE_STATUS.PENDING && (
                <Progress 
                  percent={100} 
                  status="active" 
                  showInfo={false}
                  strokeColor={{
                    '0%': '#faad14',
                    '100%': '#faad14',
                  }}
                  className="stage-progress"
                />
              )}
              
              {/* Сообщение об ошибке */}
              {stage.status === STAGE_STATUS.ERROR && stage.error && (
                <Alert
                  message={stage.error}
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                  className="stage-error"
                />
              )}
            </div>
          ))}
        </div>

        {/* Информация о процессе */}
        <div className="process-info">
          <Space split="|">
            <span>
              <Tooltip title="ID процесса">
                <small>ID: {processId || 'не создан'}</small>
              </Tooltip>
            </span>
            <span>
              <small>
                Обновление каждые {pollingInterval / 1000}с
              </small>
            </span>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default CalculationProgress;