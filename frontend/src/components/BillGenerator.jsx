import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Alert, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../config/apiClient';
import toast from 'react-hot-toast';

const { Option } = Select;

const BillGenerator = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [bikeModels, setBikeModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [billType, setBillType] = useState('cash');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBikeModels();
  }, []);

  const fetchBikeModels = async () => {
    try {
      const data = await apiClient.get('/api/bike-models');
      setBikeModels(data);
    } catch (error) {
      toast.error('Failed to fetch bike models');
      console.error('Error fetching bike models:', error);
    }
  };

  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BILL-${year}${month}${day}-${random}`;
  };

  const calculateTotalAmount = (values) => {
    const model = bikeModels.find(m => m.model_name === values.model_name);
    if (!model) return 0;

    const bikePrice = parseFloat(model.price);
    
    // For e-bicycles, the price is already the final price
    if (model.is_ebicycle) {
      return bikePrice;
    }

    // For leasing, total amount is just the down payment
    if (billType === 'leasing') {
      return values.down_payment || 0;
    }

    // For regular bikes with cash payment, add RMV charge
    return bikePrice + 13000;
  };

  const handleModelChange = (modelName) => {
    const model = bikeModels.find(m => m.model_name === modelName);
    setSelectedModel(model);
    
    // Reset bill type to cash if e-bicycle is selected
    if (model?.is_ebicycle) {
      setBillType('cash');
      form.setFieldsValue({ bill_type: 'cash' });
    }

    // Set the bike price
    form.setFieldsValue({ bike_price: model?.price });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const model = bikeModels.find(m => m.model_name === values.model_name);
      const totalAmount = calculateTotalAmount(values);
      
      const billData = {
        bill_number: generateBillNumber(),
        bill_type: billType,
        is_advance_payment: isAdvancePayment,
        total_amount: totalAmount,
        bike_price: model.price,
        rmv_charge: model.is_ebicycle ? 0 : (billType === 'leasing' ? 13500 : 13000),
        is_cpz: billType === 'leasing',
        payment_type: billType,
        customer_name: values.customer_name,
        customer_nic: values.customer_nic,
        customer_address: values.customer_address,
        model_name: values.model_name,
        motor_number: values.motor_number,
        chassis_number: values.chassis_number,
        down_payment: values.down_payment,
        advance_amount: values.advance_amount,
        balance_amount: isAdvancePayment ? 
          (billType === 'leasing' ? 
            values.down_payment - values.advance_amount : 
            totalAmount - values.advance_amount) :
          0,
        status: 'pending'
      };

      await apiClient.post('/api/bills', {
        ...billData,
        bill_date: values.bill_date.toISOString(),
        estimated_delivery_date: values.estimated_delivery_date?.toISOString()
      });

      toast.success('Bill generated successfully');
      navigate('/bills');
    } catch (error) {
      toast.error('Failed to generate bill');
      console.error('Error generating bill:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Generate New Bill</h1>

      {selectedModel?.is_ebicycle && (
        <Alert
          message="E-Bicycle Selected"
          description="This is an e-bicycle model. Only cash sales are allowed, and no RMV charges apply."
          type="info"
          showIcon
          className="mb-6"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="model_name"
          label="Bike Model"
          rules={[{ required: true }]}
        >
          <Select
            onChange={handleModelChange}
            options={bikeModels.map(model => ({
              label: `${model.model_name} - Rs. ${model.price.toLocaleString()}`,
              value: model.model_name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="bill_type"
          label="Bill Type"
        >
          <Select
            value={billType}
            onChange={(value) => setBillType(value)}
            disabled={selectedModel?.is_ebicycle}
            options={[
              { label: 'Cash', value: 'cash' },
              { label: 'Leasing', value: 'leasing', disabled: selectedModel?.is_ebicycle }
            ]}
          />
        </Form.Item>

        <Form.Item label="Advance Payment">
          <Switch
            checked={isAdvancePayment}
            onChange={setIsAdvancePayment}
          />
        </Form.Item>

        {billType === 'leasing' && (
          <Form.Item
            name="down_payment"
            label="Down Payment"
            rules={[{ required: true }]}
          >
            <InputNumber
              className="w-full"
              formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/[^\d.]/g, '')}
            />
          </Form.Item>
        )}

        {isAdvancePayment && (
          <Form.Item
            name="advance_amount"
            label="Advance Amount"
            rules={[{ required: true }]}
          >
            <InputNumber
              className="w-full"
              formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/[^\d.]/g, '')}
            />
          </Form.Item>
        )}

        <Form.Item
          name="customer_name"
          label="Customer Name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="customer_nic"
          label="Customer NIC"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="customer_address"
          label="Customer Address"
          rules={[{ required: true }]}
        >
          <Input.TextArea />
        </Form.Item>

        <Form.Item
          name="motor_number"
          label="Motor Number"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="chassis_number"
          label="Chassis Number"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Generate Bill
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BillGenerator; 