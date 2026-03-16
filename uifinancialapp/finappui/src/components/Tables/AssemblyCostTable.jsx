import React from 'react';
import { Table, Button } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { exportToExcel } from '../../utils/exportToExcel';

const AssemblyCostTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      fixed: 'left',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Характеристика',
      dataIndex: 'characteristic',
      key: 'characteristic',
      width: 150,
      fixed: 'left',
    },
    {
      title: 'Партия',
      dataIndex: 'batch',
      key: 'batch',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (value) => value?.toLocaleString('ru-RU') || '0',
    },
    {
      title: 'Себестоимость',
      dataIndex: 'cost',
      key: 'cost',
      width: 200,
      align: 'right',
      sorter: (a, b) => a.cost - b.cost,
      render: (value) => {
        if (value === undefined || value === null) return '0,00 ₽';
        return `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
      },
    },
  ];

  // Расчет итогов для подвала таблицы
  const totals = data.reduce((acc, item) => {
    acc.quantity += item.quantity || 0;
    acc.cost += item.cost || 0;
    return acc;
  }, { quantity: 0, cost: 0 });

  const footer = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
      <span>Итого по всем позициям:</span>
      <span>Количество: {totals.quantity.toLocaleString('ru-RU')}</span>
      <span>Себестоимость: {totals.cost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="primary" 
          icon={<FileExcelOutlined />}
          onClick={() => exportToExcel(data, 'assembly-cost.xlsx')}
          disabled={!data.length}
        >
          Экспорт в Excel
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200, y: 'calc(100vh - 400px)' }}
        pagination={false}
        rowKey="id"
        footer={footer}
        size="middle"
        bordered
      />
    </div>
  );
};

export default AssemblyCostTable;