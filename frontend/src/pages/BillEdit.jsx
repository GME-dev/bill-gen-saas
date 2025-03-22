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
      console.log(`Fetching bill with ID: ${id}`);
      const data = await apiClient.get(`/bills/${id}`);
      
      if (!data) {
        toast.error('Bill not found');
        navigate('/bills');
        return;
      }
      
      console.log('Bill data received:', data);
      setBill(data);
      setBillType(data.bill_type?.toLowerCase() || 'cash');
      setIsAdvancePayment(
        data.bill_type === 'advance' || 
        data.bill_type === 'advancement'
      );
      
      // Format dates for the form
      const formValues = {
        ...data,
        bill_date: data.bill_date ? moment(data.bill_date) : null,
        estimated_delivery_date: data.estimated_delivery_date ? moment(data.estimated_delivery_date) : null,
      };
      
      form.setFieldsValue(formValues);
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error(`Failed to fetch bill details: ${error.message || 'Unknown error'}`);
      navigate('/bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchBikeModels = async () => {
    try {
      const data = await apiClient.get('/bike-models');
      console.log('Bike models received:', data);
      setBikeModels(data || []);
      
      // Set selected model if bill is loaded
      if (bill && bill.model_name) {
        const model = data?.find(m => m.model_name === bill.model_name);
        setSelectedModel(model);
      }
    } catch (error) {
      console.error('Error fetching bike models:', error);
      toast.error('Failed to fetch bike models');
      setBikeModels([]);
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
      console.log('Submitting bill update with values:', values);
      
      // Get the selected model's price if bike_price is missing
      const bikePrice = values.bike_price || (selectedModel ? selectedModel.price : 0);
      
      // Is this an e-bicycle?
      const modelString = String(values.model_name || '').trim();
      const isEbicycle = 
        selectedModel?.is_ebicycle || 
        modelString.toUpperCase().includes('COLA5') || 
        modelString.toLowerCase().includes('cola5') ||
        modelString.toUpperCase().includes('X01') || 
        modelString.toLowerCase().includes('x01');
      
      // Normalize bill type
      const normalizedBillType = billType === 'advancement' ? 'advance' : billType;
      
      // Prepare data for update
      const updateData = {
        ...values,
        bike_price: bikePrice,
        bill_type: normalizedBillType,
        is_ebicycle: isEbicycle,
        vehicle_type: isEbicycle ? 'E-Bicycle' : 'Bicycle',
        bill_date: values.bill_date ? values.bill_date.toISOString() : new Date().toISOString(),
        estimated_delivery_date: values.estimated_delivery_date ? values.estimated_delivery_date.toISOString() : null
      };

      // Calculate total amount based on bill type and model
      if (normalizedBillType === 'cash') {
        updateData.total_amount = isEbicycle 
          ? parseFloat(bikePrice) 
          : parseFloat(bikePrice) + 13000;
      } else if (normalizedBillType === 'leasing') {
        // For leasing, ensure down_payment is properly set
        const downPayment = parseFloat(values.down_payment || 0);
        updateData.total_amount = downPayment; 
        updateData.down_payment = downPayment;
      } else if (normalizedBillType === 'advance') {
        // For advance payments
        updateData.total_amount = parseFloat(bikePrice);
        const downPayment = parseFloat(values.down_payment || 0);
        updateData.down_payment = downPayment;
        updateData.balance_amount = updateData.total_amount - downPayment;
      }
      
      console.log('Sending update data:', updateData);
      const response = await apiClient.put(`/bills/${id}`, updateData);
      
      if (response) {
        toast.success('Bill updated successfully');
        navigate(`/bills/${id}`);
      } else {
        throw new Error('Failed to update bill: No response received');
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error(`Failed to update bill: ${error.message || 'Unknown error'}`);
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
              disabled={selectedModel?.is_ebicycle && value === 'leasing'}
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Leasing', value: 'leasing', disabled: selectedModel?.is_ebicycle },
                { label: 'Advance Payment', value: 'advance' }
              ]}
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
                min={1000}
                step={1000}
                formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => {
                  const parsed = value.replace(/[^\d]/g, '');
                  return parsed ? parseInt(parsed) : 1000;
                }}
              />
            </Form.Item>
          )}

          {billType === 'advance' && (
            <>
              <Form.Item
                name="down_payment"
                label="Down Payment"
                rules={[{ required: true, message: 'Please enter the down payment amount' }]}
              >
                <InputNumber
                  className="w-full"
                  min={1000}
                  step={1000}
                  formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => {
                    const parsed = value.replace(/[^\d]/g, '');
                    return parsed ? parseInt(parsed) : 1000;
                  }}
                />
              </Form.Item>
              
              <Form.Item
                name="estimated_delivery_date"
                label="Estimated Delivery Date"
                rules={[{ required: true, message: 'Please enter the estimated delivery date' }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>
            </>
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