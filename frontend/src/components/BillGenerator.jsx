import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, DatePicker, InputNumber, Switch, message, Modal } from 'antd';
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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
    
    if (model && model.price) {
      form.setFieldsValue({
        bike_price: model.price
      });
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

  const handlePreview = async () => {
    try {
      // Validate form first
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setPreviewLoading(true);
      
      // Get the selected model's price if bike_price is missing
      const bikePrice = values.bike_price || (selectedModel ? selectedModel.price : 0);
      
      // Safely format dates
      const formattedValues = {
        ...values,
        bike_price: bikePrice,
        bill_date: values.bill_date ? values.bill_date.toISOString() : new Date().toISOString(),
        estimated_delivery_date: values.estimated_delivery_date ? values.estimated_delivery_date.toISOString() : null,
        is_advance_payment: isAdvancePayment,
        bill_type: billType
      };
      
      // Prepare bill data with calculated fields
      const billData = {
        ...formattedValues,
        bill_number: generateBillNumber(),
        status: 'pending',
        is_ebicycle: selectedModel?.is_ebicycle || false
      };

      // Calculate total amount based on bill type and model
      if (billType === 'cash') {
        billData.total_amount = selectedModel?.is_ebicycle 
          ? parseFloat(bikePrice) 
          : parseFloat(bikePrice) + 13000;
        billData.rmv_charge = selectedModel?.is_ebicycle ? 0 : 13000;
      } else {
        billData.total_amount = parseFloat(values.down_payment || 0);
        billData.rmv_charge = 13500;
        billData.is_cpz = true;
      }

      // Handle advance payment
      if (isAdvancePayment) {
        billData.advance_amount = parseFloat(values.advance_amount || 0);
        billData.balance_amount = billData.total_amount - billData.advance_amount;
      }
      
      // Get the preview PDF
      const response = await apiClient.get(
        `/api/bills/preview/pdf?formData=${encodeURIComponent(JSON.stringify(billData))}`,
        { responseType: 'blob' }
      );
      
      // Create a blob URL for the preview
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Get the selected model's price if bike_price is missing
      const bikePrice = values.bike_price || (selectedModel ? selectedModel.price : 0);
      
      // Ensure dates are properly formatted
      const billData = {
        ...values,
        bike_price: bikePrice,
        bill_number: generateBillNumber(),
        status: 'pending',
        is_ebicycle: selectedModel?.is_ebicycle || false,
        is_advance_payment: isAdvancePayment,
        bill_type: billType,
        bill_date: values.bill_date ? values.bill_date.toISOString() : new Date().toISOString(),
        estimated_delivery_date: values.estimated_delivery_date ? values.estimated_delivery_date.toISOString() : null
      };

      // Calculate total amount based on bill type and model
      if (billType === 'cash') {
        billData.total_amount = selectedModel?.is_ebicycle 
          ? parseFloat(bikePrice) 
          : parseFloat(bikePrice) + 13000;
        billData.rmv_charge = selectedModel?.is_ebicycle ? 0 : 13000;
      } else {
        billData.total_amount = parseFloat(values.down_payment || 0);
        billData.rmv_charge = 13500;
        billData.is_cpz = true;
      }

      // Handle advance payment
      if (isAdvancePayment) {
        billData.advance_amount = parseFloat(values.advance_amount || 0);
        billData.balance_amount = billData.total_amount - billData.advance_amount;
      }

      const response = await apiClient.post('/api/bills', billData);
      
      toast.success('Bill generated successfully');
      navigate(`/bills/${response._id || response.id}`);
    } catch (error) {
      console.error('Error generating bill:', error);
      toast.error('Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Generate New Bill</h1>

      {selectedModel?.is_ebicycle && (
        <div className="bg-blue-50 p-4 mb-6 rounded border border-blue-200">
          <h3 className="text-blue-800 font-medium">E-Bicycle Selected</h3>
          <p className="text-blue-600 text-sm mt-1">This is an e-bicycle model. Only cash sales are allowed, and no RMV charges apply.</p>
        </div>
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

        <Form.Item className="flex justify-between">
          <Button type="default" onClick={handlePreview} loading={previewLoading}>
            Preview Bill
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Generate Bill
          </Button>
        </Form.Item>
      </Form>

      {/* Preview Modal */}
      <Modal
        title="Bill Preview"
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          URL.revokeObjectURL(previewUrl);
        }}
        width={800}
        footer={[
          <Button key="back" onClick={() => {
            setPreviewVisible(false);
            URL.revokeObjectURL(previewUrl);
          }}>
            Close
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            Generate Bill
          </Button>,
        ]}
      >
        <div className="h-[700px]">
          <iframe 
            src={previewUrl} 
            title="Bill Preview" 
            className="w-full h-full border-0"
          />
        </div>
      </Modal>
    </div>
  );
};

export default BillGenerator; 