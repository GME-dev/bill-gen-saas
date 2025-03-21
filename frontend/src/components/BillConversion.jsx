import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import apiClient from '../config/apiClient';
import { useNavigate } from 'react-router-dom';

const BillConversion = ({ originalBill }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Get the original bill data
      const { data: bill } = await apiClient.get(`/api/bills/${originalBill.id}`);
      
      if (!bill) {
        throw new Error('Original bill not found');
      }

      // Create new bill with updated values
      const newBillData = {
        ...bill,
        bill_type: 'cash',
        is_advance_payment: false,
        advance_amount: null,
        status: 'completed',
        original_bill_id: bill.id
      };

      // Insert new bill
      await apiClient.post('/api/bills', newBillData);

      // Update original bill status
      await apiClient.patch(`/api/bills/${bill.id}`, {
        status: 'converted'
      });

      message.success('Bill converted successfully');
      navigate('/bills');
    } catch (error) {
      console.error('Error converting bill:', error);
      message.error('Failed to convert bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onFinish={handleSubmit}>
      {/* Your form fields here */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Convert Bill
        </Button>
      </Form.Item>
    </Form>
  );
};

export default BillConversion; 