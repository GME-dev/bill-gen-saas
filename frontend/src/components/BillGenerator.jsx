import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, DatePicker, InputNumber, Switch, message } from 'antd';
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
      console.error('Error fetching bike models:', error);
      message.error('Failed to fetch bike models');
    }
  };

  const handleModelChange = (value) => {
    const model = bikeModels.find(m => m.model_name === value);
    setSelectedModel(model);
    form.setFieldsValue({
      bike_price: model?.price || 0
    });
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

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      const billData = {
        ...values,
        bill_number: generateBillNumber(),
        status: 'pending',
        is_ebicycle: selectedModel?.is_ebicycle || false,
        bill_date: values.bill_date ? values.bill_date.toISOString() : new Date().toISOString(),
        estimated_delivery_date: values.estimated_delivery_date ? values.estimated_delivery_date.toISOString() : null
      };

      // Calculate total amount based on bill type and model
      if (values.bill_type === 'cash') {
        billData.total_amount = selectedModel.is_ebicycle 
          ? values.bike_price 
          : values.bike_price + 13000;
      } else {
        billData.total_amount = values.down_payment;
        billData.rmv_charge = 13500;
        billData.is_cpz = true;
      }

      // Handle advance payment
      if (values.is_advance_payment) {
        billData.balance_amount = billData.total_amount - values.advance_amount;
      }

      await apiClient.post('/api/bills', billData);
      
      message.success('Bill generated successfully');
      navigate('/bills');
    } catch (error) {
      console.error('Error generating bill:', error);
      message.error('Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Generate New Bill</h1>

      {selectedModel?.is_ebicycle && (
        <message.info
          message="E-Bicycle Selected"
          description="This is an e-bicycle model. Only cash sales are allowed, and no RMV charges apply."
          className="mb-6"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          bill_type: 'cash',
          is_advance_payment: false,
          bill_date: null,
          estimated_delivery_date: null
        }}
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
          <Button type="primary" htmlType="submit" loading={loading}>
            Generate Bill
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BillGenerator; 