import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Badge, Descriptions, Card, Popconfirm, message, Alert, Tag, Modal } from 'antd';
import { DownloadOutlined, DeleteOutlined, EditOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import apiClient from '../config/apiClient';
import AdvancementConversion from '../components/AdvancementConversion';

const BillView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBill(id);
    }
  }, [id]);

  const fetchBill = async (billId) => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/bills/${billId}`);
      
      // Ensure the bill has an id property (MongoDB uses _id)
      if (data && data._id) {
        data.id = data._id;
      }
      
      setBill(data);
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'processing',
      completed: 'success',
      cancelled: 'error',
      converted: 'warning'
    };
    return statusMap[status?.toLowerCase()] || 'default';
  };

  const handleDeleteBill = async () => {
    try {
      await apiClient.delete(`/api/bills/${id}`);
      toast.success('Bill deleted successfully');
      navigate('/bills');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  const handlePreviewPDF = async () => {
    try {
      setPreviewLoading(true);
      const response = await apiClient.get(`/api/bills/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to preview PDF');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/api/bills/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleConvertToLeasing = async () => {
    try {
      await apiClient.put(`/api/bills/${id}/convert-to-leasing`);
      toast.success('Bill converted to leasing successfully');
      fetchBill(id);
    } catch (error) {
      console.error('Error converting bill:', error);
      toast.error('Failed to convert bill');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiClient.put(`/api/bills/${id}/status`, { status: newStatus });
      toast.success(`Bill marked as ${newStatus}`);
      fetchBill(id);
    } catch (error) {
      console.error('Error updating bill status:', error);
      toast.error('Failed to update bill status');
    }
  };

  const getBillTypeTag = (type) => {
    if (!type) return <Tag color="default">Unknown</Tag>;
    
    const typeMap = {
      cash: { color: 'green', text: 'Cash' },
      leasing: { color: 'blue', text: 'Leasing' },
      advance: { color: 'orange', text: 'Advance Payment' },
      advancement: { color: 'orange', text: 'Advance Payment' }
    };
    
    const typeInfo = typeMap[type.toLowerCase()] || { color: 'default', text: type };
    return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
  };

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return 'Rs. 0';
    return `Rs. ${Number(amount).toLocaleString()}`;
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
        <Alert
          message="Bill not found"
          description="The requested bill could not be found. It may have been deleted or the ID is incorrect."
          type="error"
          showIcon
        />
        <Button 
          type="primary" 
          onClick={() => navigate('/bills')}
          className="mt-4"
        >
          Return to Bill List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Bill #{bill._id || bill.id}</h1>
          <div className="flex items-center mt-2">
            {getBillTypeTag(bill.bill_type)}
            <Badge 
              status={getStatusBadgeClass(bill.status)} 
              text={bill.status} 
              className="ml-2"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            icon={<EyeOutlined />}
            onClick={handlePreviewPDF}
            loading={previewLoading}
          >
            Preview
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
          <Button 
            icon={<PrinterOutlined />} 
            onClick={() => {
              handlePreviewPDF().then(() => {
                setTimeout(() => {
                  const printFrame = document.getElementById('pdf-preview-frame');
                  if (printFrame) {
                    printFrame.contentWindow.print();
                  }
                }, 1000);
              });
            }}
          >
            Print
          </Button>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/bills/${id}/edit`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this bill?"
            onConfirm={handleDeleteBill}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Bill Details" className="mb-6">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Bill Number">{bill._id || bill.id}</Descriptions.Item>
            <Descriptions.Item label="Bill Date">{formatDate(bill.bill_date)}</Descriptions.Item>
            <Descriptions.Item label="Bill Type">{bill.bill_type}</Descriptions.Item>
            <Descriptions.Item label="Status">{bill.status}</Descriptions.Item>
            {bill.is_advance_payment && (
              <Descriptions.Item label="Estimated Delivery Date">
                {formatDate(bill.estimated_delivery_date)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="Customer Information" className="mb-6">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Name">{bill.customer_name}</Descriptions.Item>
            <Descriptions.Item label="NIC">{bill.customer_nic}</Descriptions.Item>
            <Descriptions.Item label="Address">{bill.customer_address}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Vehicle Information" className="mb-6">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Model">{bill.model_name}</Descriptions.Item>
            <Descriptions.Item label="Type">{bill.is_ebicycle ? 'E-Bicycle' : 'Regular Bicycle'}</Descriptions.Item>
            <Descriptions.Item label="Motor Number">{bill.motor_number}</Descriptions.Item>
            <Descriptions.Item label="Chassis Number">{bill.chassis_number}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Payment Information" className="mb-6">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Bike Price">{formatAmount(bill.bike_price)}</Descriptions.Item>
            <Descriptions.Item label="RMV Charge">{formatAmount(bill.rmv_charge)}</Descriptions.Item>
            <Descriptions.Item label="Total Amount">{formatAmount(bill.total_amount)}</Descriptions.Item>
            {bill.is_advance_payment && (
              <>
                <Descriptions.Item label="Advance Amount">{formatAmount(bill.advance_amount)}</Descriptions.Item>
                <Descriptions.Item label="Balance Amount">{formatAmount(bill.balance_amount)}</Descriptions.Item>
              </>
            )}
            {bill.bill_type === 'leasing' && (
              <Descriptions.Item label="Down Payment">{formatAmount(bill.down_payment)}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>

      <div className="mt-6 flex space-x-4">
        {bill.status !== 'completed' && (
          <Button
            type="primary"
            onClick={() => handleStatusChange('completed')}
          >
            Mark as Completed
          </Button>
        )}
        
        {bill.status !== 'cancelled' && (
          <Button
            danger
            onClick={() => handleStatusChange('cancelled')}
          >
            Mark as Cancelled
          </Button>
        )}
        
        {bill.bill_type === 'cash' && bill.status !== 'converted' && !bill.is_ebicycle && (
          <Popconfirm
            title="Convert this cash bill to leasing?"
            onConfirm={handleConvertToLeasing}
            okText="Yes"
            cancelText="No"
          >
            <Button>
              Convert to Leasing
            </Button>
          </Popconfirm>
        )}
      </div>

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
          <Button 
            key="print" 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={() => {
              const printFrame = document.getElementById('pdf-preview-frame');
              if (printFrame) {
                printFrame.contentWindow.print();
              }
            }}
          >
            Print
          </Button>,
        ]}
      >
        <div className="h-[700px]">
          <iframe 
            id="pdf-preview-frame"
            src={previewUrl} 
            title="Bill Preview" 
            className="w-full h-full border-0"
          />
        </div>
      </Modal>
    </div>
  );
};

export default BillView; 