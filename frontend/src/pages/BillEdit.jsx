import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, DatePicker, InputNumber, Switch, message, Spin, Card } from 'antd';
import moment from 'moment';
import apiClient from '../config/apiClient';
import toast from 'react-hot-toast';

const { Option } = Select;

const BillEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [bill, setBill] = useState(null);
  const [bikeModels, setBikeModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [billType, setBillType] = useState('');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    fetchBill();
    fetchBikeModels();
  }, [id]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/bills/${id}`);
      
      if (!data) {
        toast.error('Bill not found');
        navigate('/bills');
        return;
      }
      
      setBill(data);
      setBillType(data.bill_type?.toLowerCase() || 'cash');
      setIsAdvancePayment(data.is_advance_payment || false);
      
      // Format dates for the form
      const formValues = {
        ...data,
        bill_date: data.bill_date ? moment(data.bill_date) : null,
        estimated_delivery_date: data.estimated_delivery_date ? moment(data.estimated_delivery_date) : null,
      };
      
      form.setFieldsValue(formValues);
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBikeModels = async () => {
    try {
      const data = await apiClient.get('/api/bike-models');
      setBikeModels(data);
      
      // Set selected model if bill is loaded
      if (bill && bill.model_name) {
        const model = data.find(m => m.model_name === bill.model_name);
        setSelectedModel(model);
      }
    } catch (error) {
      console.error('Error fetching bike models:', error);
      message.error('Failed to fetch bike models');
    }
  };

  const handleModelChange = (value) => {
    const model = bikeModels.find(m => m.model_name === value);
    setSelectedModel(model);
    
    if (model && model.price) {
      form.setFieldsValue({
        bike_price: model.price
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Get the selected model's price if bike_price is missing
      const bikePrice = values.bike_price || (selectedModel ? selectedModel.price : 0);
      
      // Prepare data for update
      const updateData = {
        ...values,
        bike_price: bikePrice,
        bill_type: billType.toUpperCase(),
        is_advance_payment: isAdvancePayment,
        is_ebicycle: selectedModel?.is_ebicycle || false,
        bill_date: values.bill_date ? values.bill_date.toISOString() : new Date().toISOString(),
        estimated_delivery_date: values.estimated_delivery_date ? values.estimated_delivery_date.toISOString() : null
      };

      // Calculate total amount based on bill type and model
      if (billType === 'cash') {
        updateData.total_amount = selectedModel?.is_ebicycle 
          ? parseFloat(bikePrice) 
          : parseFloat(bikePrice) + 13000;
        updateData.rmv_charge = selectedModel?.is_ebicycle ? 0 : 13000;
      } else {
        updateData.total_amount = parseFloat(values.down_payment || 0);
        updateData.rmv_charge = 13500;
        updateData.is_cpz = true;
      }

      // Handle advance payment
      if (isAdvancePayment) {
        updateData.advance_amount = parseFloat(values.advance_amount || 0);
        updateData.balance_amount = updateData.total_amount - updateData.advance_amount;
      }

      await apiClient.put(`/api/bills/${id}`, updateData);
      
      toast.success('Bill updated successfully');
      navigate(`/bills/${id}`);
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Failed to update bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <p>Bill not found</p>
        <Button 
          type="primary"
          onClick={() => navigate('/bills')}
          className="mt-4"
        >
          Return to Bills
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card title="Edit Bill" className="mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="model_name"
            label="Bike Model"
            rules={[{ required: true, message: 'Please select a bike model' }]}
          >
            <Select
              onChange={handleModelChange}
              placeholder="Select bike model"
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
              rules={[{ required: true, message: 'Please enter the down payment amount' }]}
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
              rules={[{ required: true, message: 'Please enter the advance amount' }]}
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
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="customer_nic"
            label="Customer NIC"
            rules={[{ required: true, message: 'Please enter customer NIC' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="customer_address"
            label="Customer Address"
            rules={[{ required: true, message: 'Please enter customer address' }]}
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="motor_number"
            label="Motor Number"
            rules={[{ required: true, message: 'Please enter motor number' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="chassis_number"
            label="Chassis Number"
            rules={[{ required: true, message: 'Please enter chassis number' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="bill_date"
            label="Bill Date"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          {isAdvancePayment && (
            <Form.Item
              name="estimated_delivery_date"
              label="Estimated Delivery Date"
            >
              <DatePicker className="w-full" />
            </Form.Item>
          )}

          <Form.Item className="flex justify-end">
            <Button 
              type="default" 
              onClick={() => navigate(`/bills/${id}`)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Update Bill
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BillEdit; 