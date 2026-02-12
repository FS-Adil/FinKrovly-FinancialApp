import React from 'react';
import { Table, Button } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { exportToExcel } from '../../utils/exportToExcel';

const DataTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      fixed: 'left',
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      align: 'right',
      render: (value) => value.toLocaleString('ru-RU'),
    },
    {
      title: 'Стоимость',
      dataIndex: 'price',
      key: 'price',
      width: 200,
      align: 'right',
      render: (value) => `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`,
    },
    {
      title: 'Себестоимость',
      dataIndex: 'cost',
      key: 'cost',
      width: 200,
      align: 'right',
      render: (value) => `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`,
    },
    {
      title: 'Рентабельность',
      dataIndex: 'profitability',
      key: 'profitability',
      width: 150,
      align: 'right',
      render: (value) => `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    },
  ];

  const totals = data.reduce((acc, item) => {
    acc.quantity += item.quantity;
    acc.price += item.price;
    acc.cost += item.cost;
    return acc;
  }, { quantity: 0, price: 0, cost: 0 });

  const footer = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
      <span>Итого:</span>
      <span>Количество: {totals.quantity.toLocaleString('ru-RU')}</span>
      <span>Стоимость: {totals.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
      <span>Себестоимость: {totals.cost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
      <span>Ср. рентабельность: {((totals.price - totals.cost) / totals.price * 100 || 0).toFixed(2)}%</span>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="primary" 
          icon={<FileExcelOutlined />}
          onClick={() => exportToExcel(data, 'report.xlsx')}
          disabled={!data.length}
        >
          Экспорт в Excel
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1500, y: 'calc(100vh - 350px)' }}
        pagination={false}
        rowKey="id"
        footer={footer}
        size="middle"
      />
    </div>
  );
};

export default DataTable;