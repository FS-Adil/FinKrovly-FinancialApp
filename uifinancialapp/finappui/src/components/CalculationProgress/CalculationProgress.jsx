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
  processId,
  pollingInterval = 1000,
  autoStart = true,
  autoCloseOnSuccess = true,
  autoCloseDelay = 1000
}) => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [allSuccessful, setAllSuccessful] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorIndex, setErrorIndex] = useState(-1);
  const pollingRef = useRef(null);
  const autoCloseTimerRef = useRef(null);

  // Сброс состояния при новом processId
  useEffect(() => {
    if (processId) {
      // Сбрасываем все состояния для нового расчета
      setStages([]);
      setCompleted(false);
      setAllSuccessful(false);
      setErrorIndex(-1);
      setError(null);
      setCancelling(false);
      stopPolling();
    }
  }, [processId]);

  // Получение статуса процесса
  const fetchProcessStatus = useCallback(async () => {
    if (!processId || cancelling) return;

    setLoading(true);
    try {
      const response = await calculationApi.getProcessStatus(processId);
      
      if (response && response.stages) {
        setStages(response.stages);
        
        // Находим индекс первого этапа с ошибкой
        const firstErrorIndex = response.stages.findIndex(
          stage => stage.status === STAGE_STATUS.ERROR
        );
        setErrorIndex(firstErrorIndex);
        
        // Проверяем, завершен ли процесс
        if (response.completed) {
          setCompleted(true);
          
          // Проверяем, все ли этапы успешны (нет ошибок)
          const allSuccess = response.stages.every(
            stage => stage.status === STAGE_STATUS.SUCCESS
          );
          setAllSuccessful(allSuccess);
          
          // Останавливаем опрос
          stopPolling();
          
          // Показываем сообщение
          if (allSuccess) {
            message.success('Расчет успешно завершен');
            
            // Автоматически закрываем модальное окно если все успешно
            if (autoCloseOnSuccess) {
              if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
              }
              
              autoCloseTimerRef.current = setTimeout(() => {
                if (onClose) {
                  onClose(true);
                  // Сбрасываем состояние calculationApi
                  calculationApi.reset();
                }
              }, autoCloseDelay);
            }
          } else {
            // Если есть ошибки, показываем предупреждение
            message.warning('Расчет завершен с ошибками');
          }
        }
      }
    } catch (err) {
      setError('Ошибка получения статуса: ' + err.message);
      console.error('Error fetching process status:', err);
    } finally {
      setLoading(false);
    }
  }, [processId, autoCloseOnSuccess, autoCloseDelay, onClose, cancelling]);

  // Остановка опроса
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  // Запуск опроса при появлении processId и visible
  useEffect(() => {
    if (visible && processId && autoStart && !completed && !cancelling) {
      // Первый запрос сразу
      fetchProcessStatus();
      
      // Затем запускаем интервал
      pollingRef.current = setInterval(fetchProcessStatus, pollingInterval);
    }

    return () => {
      stopPolling();
    };
  }, [visible, processId, autoStart, completed, cancelling, fetchProcessStatus, pollingInterval, stopPolling]);

  // Сброс состояния при скрытии
  useEffect(() => {
    if (!visible) {
      setStages([]);
      setCompleted(false);
      setAllSuccessful(false);
      setErrorIndex(-1);
      setError(null);
      setCancelling(false);
      stopPolling();
    }
  }, [visible, stopPolling]);

  // Обработчик отмены
  const handleCancel = async () => {
    if (!processId) {
      if (onCancel) onCancel();
      return;
    }

    setCancelling(true);
    setLoading(true);
    
    try {
      // Отправляем POST запрос на сервер с статусом close
      const response = await calculationApi.cancelProcess(processId);
      
      message.info(response.message || 'Расчет отменен');
      
      // Останавливаем опрос
      stopPolling();
      
      // Сбрасываем состояние calculationApi
      calculationApi.reset();
      
      // Вызываем onCancel
      if (onCancel) {
        onCancel();
      } else if (onClose) {
        onClose(false);
      }
    } catch (error) {
      console.error('Error during cancellation:', error);
      message.error('Ошибка при отмене расчета');
      setCancelling(false);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик закрытия
  const handleClose = () => {
    stopPolling();
    
    if (onClose) {
      onClose(allSuccessful);
    }
    
    // Сбрасываем состояние calculationApi
    calculationApi.reset();
  };

  // Определяем статус этапа с учетом ошибки
  const getStageStatus = (stage, index) => {
    // Если есть ошибка и текущий этап идет после этапа с ошибкой
    if (errorIndex !== -1 && index > errorIndex) {
      return 'waiting';
    }
    return stage.status;
  };

  // Получение иконки для статуса
  const getStatusIcon = (stage, index) => {
    const status = getStageStatus(stage, index);
    
    switch (status) {
      case STAGE_STATUS.SUCCESS:
        return <CheckCircleOutlined className="stage-icon success" />;
      case STAGE_STATUS.ERROR:
        return <CloseCircleOutlined className="stage-icon error" />;
      case STAGE_STATUS.PENDING:
        return <LoadingOutlined className="stage-icon pending" spin />;
      case 'waiting':
        return <ClockCircleOutlined className="stage-icon waiting" />;
      default:
        return <ClockCircleOutlined className="stage-icon waiting" />;
    }
  };

  // Получение цвета статуса
  const getStatusColor = (stage, index) => {
    const status = getStageStatus(stage, index);
    
    switch (status) {
      case STAGE_STATUS.SUCCESS:
        return '#52c41a';
      case STAGE_STATUS.ERROR:
        return '#f5222d';
      case STAGE_STATUS.PENDING:
        return '#faad14';
      case 'waiting':
        return '#d9d9d9';
      default:
        return '#d9d9d9';
    }
  };

  // Получение текста статуса
  const getStatusText = (stage, index) => {
    const status = getStageStatus(stage, index);
    
    switch (status) {
      case STAGE_STATUS.SUCCESS:
        return 'Успешно';
      case STAGE_STATUS.ERROR:
        return 'Ошибка';
      case STAGE_STATUS.PENDING:
        return 'В процессе';
      case 'waiting':
        return 'Ожидание';
      default:
        return 'Ожидание';
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

  // Определяем заголовок модального окна
  const getModalTitle = () => {
    if (cancelling) {
      return 'Отмена расчета...';
    }
    if (completed) {
      return allSuccessful ? 'Расчет успешно завершен' : 'Расчет завершен с ошибками';
    }
    if (errorIndex !== -1) {
      return 'Ошибка в процессе расчета';
    }
    return 'Процесс расчета';
  };

  // Определяем текст кнопки
  const getButtonText = () => {
    if (cancelling) {
      return 'Отмена...';
    }
    if (completed) {
      return allSuccessful ? 'Закрыть' : 'Закрыть';
    }
    return 'Отменить расчет';
  };

  // Эффект для автоматического закрытия при успешном завершении
  useEffect(() => {
    if (completed && allSuccessful && autoCloseOnSuccess && !cancelling) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      
      autoCloseTimerRef.current = setTimeout(() => {
        if (onClose) {
          onClose(true);
          calculationApi.reset();
        }
      }, autoCloseDelay);
    }
    
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [completed, allSuccessful, autoCloseOnSuccess, autoCloseDelay, onClose, cancelling]);

  return (
    <Modal
      title={
        <Space>
          <span className="modal-title">{getModalTitle()}</span>
          {loading && !cancelling && <Spin size="small" />}
          {cancelling && <Spin size="small" />}
          {completed && allSuccessful && (
            <Tag color="green" className="status-tag">Успешно</Tag>
          )}
          {(completed && !allSuccessful) || (errorIndex !== -1 && !completed) && (
            <Tag color="red" className="status-tag">Ошибка</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button 
          key="close" 
          onClick={completed ? handleClose : handleCancel}
          icon={
            cancelling ? <LoadingOutlined /> :
            (completed && allSuccessful) ? <CheckCircleOutlined /> : 
            <CloseOutlined />
          }
          type={completed && allSuccessful ? 'primary' : 'default'}
          danger={completed && !allSuccessful || errorIndex !== -1}
          disabled={cancelling}
          loading={cancelling}
        >
          {getButtonText()}
        </Button>
      ]}
      width={600}
      mask={{
        closable: !autoCloseOnSuccess || !allSuccessful
      }}
      className="calculation-progress-modal"
    >
      <div className="progress-container">
        {/* Общий прогресс */}
        <div className="overall-progress">
          <Progress
            type="circle"
            percent={cancelling ? 0 : calculateProgress()}
            format={(percent) => cancelling ? '✕' : `${percent}%`}
            width={80}
            status={
              cancelling ? 'exception' :
              error ? 'exception' : 
              (completed && !allSuccessful) || errorIndex !== -1 ? 'exception' : 
              'active'
            }
            strokeColor={
              cancelling ? '#f5222d' :
              completed && allSuccessful ? '#52c41a' : 
              (completed && !allSuccessful) || errorIndex !== -1 ? '#f5222d' : 
              '#1890ff'
            }
          />
          <div className="progress-info">
            <h4>Общий прогресс</h4>
            <p>
              {cancelling ? 'Отмена расчета...' :
                completed 
                  ? (allSuccessful ? 'Расчет успешно завершен' : 'Расчет завершен с ошибками')
                  : errorIndex !== -1
                    ? 'Обнаружена ошибка, расчет остановлен'
                    : error 
                      ? 'Ошибка расчета' 
                      : 'Выполняется расчет...'}
            </p>
            {completed && allSuccessful && autoCloseOnSuccess && !cancelling && (
              <p className="auto-close-message">
                Окно закроется автоматически через {autoCloseDelay/1000}с...
              </p>
            )}
          </div>
        </div>

        {/* Ошибка если есть */}
        {error && !cancelling && (
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
        {!cancelling && (
          <div className="stages-list">
            <h4>Этапы расчета:</h4>
            {stages.map((stage, index) => {
              const status = getStageStatus(stage, index);
              return (
                <div 
                  key={stage.id} 
                  className="stage-item"
                  data-status={status}
                >
                  <div className="stage-header">
                    <Space>
                      <span className="stage-number">{index + 1}.</span>
                      <span className="stage-name">{stage.name}</span>
                      {getStatusIcon(stage, index)}
                    </Space>
                    <Tag color={getStatusColor(stage, index)}>
                      {getStatusText(stage, index)}
                    </Tag>
                  </div>
                  
                  {/* Индикатор прогресса для текущего этапа */}
                  {stage.status === STAGE_STATUS.PENDING && errorIndex === -1 && (
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
              );
            })}
          </div>
        )}

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
                {cancelling ? 'Отмена...' :
                  completed 
                    ? 'Процесс завершен' 
                    : errorIndex !== -1
                      ? 'Ожидание действий пользователя'
                      : `Обновление каждые ${pollingInterval / 1000}с`}
              </small>
            </span>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default CalculationProgress;