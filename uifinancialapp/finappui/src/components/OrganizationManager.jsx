import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Tag, Tooltip, Badge, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { 
  getOrganizations, 
  createOrganization, 
  updateOrganization, 
  deleteOrganization, 
  getServerStatus,
  clearOrganizationsCache,
  mockOrganizations 
} from '../services/api';

const OrganizationManager = ({ onUpdate, serverStatus: externalServerStatus }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [form] = Form.useForm();
  const [serverStatus, setServerStatus] = useState(true);
  const [error, setError] = useState(null);
  const [tableWidth, setTableWidth] = useState(0);
  
  const tableContainerRef = useRef(null);
  const fetchInProgress = useRef(false);
  const initialFetchDone = useRef(false);
  const abortControllerRef = useRef(null);
  const isMounted = useRef(true);
  const strictModeCounter = useRef(0);

  // Функция для определения ширины колонок на основе данных
  const calculateColumnWidths = useCallback((data) => {
    if (!data || data.length === 0) {
      return {
        id: 280,
        name: 300,
        action: 200
      };
    }

    const ID_WIDTH = 320;
    
    const maxNameLength = Math.max(
      ...data.map(item => (item.name || 'Без названия').length),
      20
    );
    
    const NAME_WIDTH = Math.min(Math.max(maxNameLength * 8 + 48, 200), 500);
    const ACTION_WIDTH = 200;

    const totalTableWidth = tableContainerRef.current?.clientWidth || 1200;
    const availableForId = totalTableWidth - NAME_WIDTH - ACTION_WIDTH - 48;
    
    return {
      id: Math.max(ID_WIDTH, Math.min(availableForId, 380)),
      name: NAME_WIDTH,
      action: ACTION_WIDTH
    };
  }, []);

  // Мемоизируем колонки таблицы с динамической шириной
  const columns = useMemo(() => {
    const widths = calculateColumnWidths(organizations);
    
    return [
      {
      title: 'UUID',
      dataIndex: 'id',
      key: 'id',
      width: widths.id,
      ellipsis: {
        showTitle: true, // Показывать полный текст при наведении
      },
      render: (text) => {
        if (!text) return 'Нет ID';
        
        // Вариант 1: Показываем весь UUID полностью (рекомендуется)
        return (
          <Tooltip title={text} placement="topLeft">
            <span style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              wordBreak: 'break-all', // Переносит длинные строки
              whiteSpace: 'normal',
              display: 'inline-block',
              maxWidth: '100%',
              cursor: 'help'
            }}>
              {text}
            </span>
          </Tooltip>
        );

        // Вариант 2: Если нужно сокращенный вариант с возможностью копирования
        // (закомментировано, используйте при необходимости)
        /*
        const shortId = text.length > 20 
          ? `${text.substring(0, 8)}...${text.substring(text.length - 4)}`
          : text;
        
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Tooltip title={text} placement="topLeft">
              <span style={{ 
                fontFamily: 'monospace', 
                fontSize: '12px',
                cursor: 'help',
                display: 'inline-block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: widths.id - 40
              }}>
                {shortId}
              </span>
            </Tooltip>
            <Button 
              type="link" 
              size="small" 
              icon={<CopyOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(text);
                message.success('UUID скопирован');
              }}
              style={{ padding: '0 4px' }}
            />
          </Space.Compact>
        );
        */
      },
    },
      {
        title: 'Название организации',
        dataIndex: 'name',
        key: 'name',
        width: widths.name,
        sorter: (a, b) => a.name?.localeCompare(b.name || '') || 0,
        render: (text) => {
          const displayText = text || <span style={{ color: '#999' }}>Без названия</span>;
          if (text && text.length > 30) {
            return (
              <Tooltip title={text} placement="topLeft">
                <span>{text.substring(0, 30)}...</span>
              </Tooltip>
            );
          }
          return displayText;
        },
      },
      {
        title: 'Действия',
        key: 'action',
        width: widths.action,
        fixed: 'right',
        render: (_, record) => (
          <Space size="middle">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
              size="small"
              disabled={loading}
            >
              Изменить
            </Button>
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record.id)}
              size="small"
              disabled={loading}
            >
              Удалить
            </Button>
          </Space>
        ),
      },
    ];
  }, [organizations, loading, calculateColumnWidths]);

  // Отслеживаем изменение размера окна
  useEffect(() => {
    const handleResize = () => {
      if (isMounted.current) {
        setTableWidth(tableContainerRef.current?.clientWidth || 0);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Функция загрузки организаций с защитой от множественных вызовов
  const fetchOrganizations = useCallback(async (forceRefresh = false) => {
    // Защита от множественных вызовов в StrictMode
    strictModeCounter.current++;
    const callId = strictModeCounter.current;
    
    console.log(`[${callId}] Загрузка организаций...`, { forceRefresh, fetchInProgress: fetchInProgress.current });

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Создаем новый AbortController
    abortControllerRef.current = new AbortController();

    // Проверяем, не выполняется ли уже запрос
    if (fetchInProgress.current && !forceRefresh) {
      console.log(`[${callId}] Запрос уже выполняется, пропускаем...`);
      return;
    }

    fetchInProgress.current = true;
    
    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const data = await getOrganizations(forceRefresh, abortControllerRef.current.signal);
      
      // Проверяем, что компонент все еще смонтирован и это последний вызов
      if (!isMounted.current || callId !== strictModeCounter.current) {
        console.log(`[${callId}] Запрос устарел, пропускаем обновление состояния`);
        return;
      }
      
      console.log(`[${callId}] Получены данные:`, data);
      
      let organizationsData = [];
      if (Array.isArray(data)) {
        organizationsData = data;
      } else if (data?.data && Array.isArray(data.data)) {
        organizationsData = data.data;
      } else {
        throw new Error('Неверный формат данных');
      }

      setOrganizations(organizationsData);
      onUpdate?.(organizationsData.length);
      
      const currentServerStatus = getServerStatus();
      setServerStatus(currentServerStatus);
      
      if (organizationsData.length === 0 && currentServerStatus && isMounted.current) {
        message.info('Нет доступных организаций');
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`[${callId}] Запрос был отменен`);
        return;
      }
      
      // Проверяем, что компонент все еще смонтирован
      if (!isMounted.current || callId !== strictModeCounter.current) {
        return;
      }
      
      console.error(`[${callId}] Ошибка при загрузке организаций:`, error);
      setError(error.message || 'Ошибка при загрузке организаций');
      
      setOrganizations(mockOrganizations);
      onUpdate?.(mockOrganizations.length);
      setServerStatus(false);
      
      if (!forceRefresh && isMounted.current) {
        message.warning('Используются тестовые данные');
      }
    } finally {
      if (isMounted.current && callId === strictModeCounter.current) {
        setLoading(false);
      }
      fetchInProgress.current = false;
    }
  }, [onUpdate]);

  // Инициализация данных с защитой от StrictMode
  useEffect(() => {
    isMounted.current = true;
    
    // Используем флаг для StrictMode
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchOrganizations();
    }
    
    return () => {
      isMounted.current = false;
      initialFetchDone.current = false;
      fetchInProgress.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOrganizations]);

  // Синхронизация с внешним статусом сервера
  useEffect(() => {
    if (externalServerStatus !== undefined && isMounted.current) {
      setServerStatus(externalServerStatus);
    }
  }, [externalServerStatus]);

  const handleAdd = () => {
    setEditingOrg(null);
    form.resetFields();
    const newId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    form.setFieldsValue({ id: newId });
    setModalVisible(true);
    setError(null);
  };

  const handleEdit = (record) => {
    setEditingOrg(record);
    form.setFieldsValue(record);
    setModalVisible(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Удаление организации',
      content: 'Вы уверены, что хотите удалить эту организацию?',
      okText: 'Да',
      cancelText: 'Нет',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!isMounted.current) return;
        
        try {
          setLoading(true);
          await deleteOrganization(id);
          if (isMounted.current) {
            message.success('Организация успешно удалена');
          }
          fetchInProgress.current = false;
          await fetchOrganizations(true);
        } catch (error) {
          if (isMounted.current) {
            message.error(error.message || 'Ошибка при удалении организации');
          }
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!isMounted.current) return;
      setLoading(true);
      
      if (editingOrg) {
        await updateOrganization(editingOrg.id, values);
        if (isMounted.current) {
          message.success('Организация успешно обновлена');
        }
      } else {
        await createOrganization(values);
        if (isMounted.current) {
          message.success('Организация успешно создана');
        }
      }
      
      if (isMounted.current) {
        setModalVisible(false);
        form.resetFields();
        setEditingOrg(null);
      }
      
      fetchInProgress.current = false;
      await fetchOrganizations(true);
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      if (isMounted.current) {
        message.error(error.message || 'Ошибка при сохранении организации');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    clearOrganizationsCache();
    fetchInProgress.current = false;
    strictModeCounter.current++; // Сбрасываем счетчик для нового запроса
    await fetchOrganizations(true);
  };

  const serverStatusBadge = useMemo(() => {
    if (serverStatus) {
      return (
        <Tooltip title="Сервер доступен">
          <Badge status="success" text="Сервер онлайн" />
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Используются тестовые данные. Сервер недоступен.">
        <Badge status="warning" text="Тестовый режим" />
      </Tooltip>
    );
  }, [serverStatus]);

  // Сортировка организаций по длине названия
  const sortedOrganizations = useMemo(() => {
    return [...organizations].sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      return bName.length - aName.length;
    });
  }, [organizations]);

  return (
    <Card 
      title={
        <Space align="center">
          <span style={{ fontSize: '16px', fontWeight: 500 }}>Управление организациями</span>
          {serverStatusBadge}
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            Обновить ({organizations.length})
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            disabled={loading}
          >
            Добавить организацию
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      {!serverStatus && !error && (
        <Alert
          message="Тестовый режим"
          description="Сервер недоступен. Изменения будут сохранены только локально."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Tag color="blue" icon={<CheckCircleOutlined />}>
          Всего организаций: {organizations.length}
        </Tag>
        {organizations.length > 0 && (
          <Tag color="cyan" icon={<CheckCircleOutlined />}>
            Макс. длина названия: {Math.max(...organizations.map(o => (o.name || '').length), 0)} симв.
          </Tag>
        )}
        {serverStatus && (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Изменения сохраняются на сервере
          </Tag>
        )}
      </div>
      
      {organizations.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          background: '#fafafa', 
          borderRadius: 8,
          marginBottom: 16 
        }}>
          <p style={{ color: '#999', marginBottom: 16 }}>
            {serverStatus ? 'Нет доступных организаций' : 'Нет доступных организаций. Добавьте тестовые данные.'}
          </p>
          <Button 
            type="primary" 
            onClick={handleAdd} 
            icon={<PlusOutlined />}
            disabled={loading}
            size="large"
          >
            Создать первую организацию
          </Button>
        </div>
      )}
      
      <div ref={tableContainerRef} style={{ width: '100%' }}>
        <Table 
          columns={columns} 
          dataSource={sortedOrganizations} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} организаций`,
            pageSizeOptions: ['5', '10', '20', '50']
          }}
          scroll={{ x: 'max-content' }}
          size="middle"
          locale={{
            emptyText: loading ? 'Загрузка...' : 'Нет данных'
          }}
        />
      </div>

      <Modal
        title={
          <Space>
            {editingOrg ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingOrg ? 'Редактировать организацию' : 'Добавить организацию'}</span>
          </Space>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingOrg(null);
          setError(null);
        }}
        okText={editingOrg ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
        confirmLoading={loading}
        okButtonProps={{ disabled: loading }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="id"
            label="UUID"
            rules={[
              { required: true, message: 'Пожалуйста, введите UUID' },
              { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 
                message: 'Введите корректный UUID формата xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
            ]}
            tooltip="Уникальный идентификатор организации в формате UUID"
          >
            <Input 
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
              disabled={!!editingOrg}
              maxLength={36}
            />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="Название организации"
            rules={[
              { required: true, message: 'Пожалуйста, введите название организации' },
              { min: 2, message: 'Название должно содержать минимум 2 символа' },
              { max: 100, message: 'Название не должно превышать 100 символов' }
            ]}
          >
            <Input 
              placeholder="Введите название организации" 
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OrganizationManager;