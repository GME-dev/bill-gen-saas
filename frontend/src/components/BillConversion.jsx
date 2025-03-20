import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Alert, message, Card, Descriptions } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

const BillConversion = () => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      const { data, error } = await supabase
        .from('bill_summaries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        message.error('Bill not found');
        navigate('/bills');
        return;
      }

      if (!data.is_advance_payment || data.status !== 'pending') {
        message.error('This bill cannot be converted');
        navigate('/bills');
        return;
      }

      setBill(data);
      form.setFieldsValue({
        remaining_amount: data.balance_amount
      });
    } catch (error) {
      message.error('Failed to fetch bill details');
      navigate('/bills');
    }
  };

  const handleConversion = async (values) => {
    try {
      setLoading(true);

      // Create the new full bill
      const newBillData = {
        bill_number: generateBillNumber(),
        bill_type: bill.bill_type,
        customer_name: bill.customer_name,
        customer_nic: bill.customer_nic,
        customer_address: bill.customer_address,
        model_name: bill.model_name,
        motor_number: bill.motor_number,
        chassis_number: bill.chassis_number,
        bike_price: bill.bike_price,
        rmv_charge: bill.rmv_charge,
        is_cpz: bill.is_cpz,
        down_payment: bill.down_payment,
        is_advance_payment: false,
        advance_amount: bill.advance_amount,
        total_amount: bill.bill_type === 'leasing' ? bill.down_payment : (bill.bike_price + (bill.is_ebicycle ? 0 : 13000)),
        balance_amount: 0,
        status: 'completed',
        original_bill_id: bill.id
      };

      // Insert new bill
      const { error: insertError } = await supabase
        .from('bills')
        .insert([newBillData]);

      if (insertError) throw insertError;

      // Update original bill status
      const { error: updateError } = await supabase
        .from('bills')
        .update({ status: 'converted' })
        .eq('id', id);

      if (updateError) throw updateError;

      message.success('Bill converted successfully');
      navigate('/bills');
    } catch (error) {
      message.error('Failed to convert bill');
    } finally {
      setLoading(false);
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

  if (!bill) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Convert Advance Payment to Full Bill</h1>

      <Card className="mb-6">
        <Descriptions title="Original Bill Details" bordered>
          <Descriptions.Item label="Bill Number" span={3}>
            {bill.bill_number}
          </Descriptions.Item>
          <Descriptions.Item label="Customer" span={3}>
            {bill.customer_name}
          </Descriptions.Item>
          <Descriptions.Item label="Model" span={2}>
            {bill.model_name}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            {bill.bill_type.toUpperCase()}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount" span={2}>
            Rs. {bill.total_amount?.toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Advance Paid">
            Rs. {bill.advance_amount?.toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Balance" span={3}>
            Rs. {bill.balance_amount?.toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Conversion Information"
        description={`Converting this advance payment to a full ${bill.bill_type} bill. Please confirm the remaining payment amount.`}
        type="info"
        showIcon
        className="mb-6"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleConversion}
      >
        <Form.Item
          name="remaining_amount"
          label="Remaining Amount to be Paid"
        >
          <InputNumber
            className="w-full"
            formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/[^\d.]/g, '')}
            disabled
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Convert to Full Bill
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BillConversion; 