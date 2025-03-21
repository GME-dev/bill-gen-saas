import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiClient from '../config/apiClient'
import { Table, Tag, Button, Space, Popconfirm, message, Spin, Input, Badge } from 'antd'
import { PlusOutlined, SearchOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons'

const BillList = () => {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get('/api/bills')
      
      if (!Array.isArray(data)) {
        console.error('Invalid response format from API:', data)
        toast.error('Failed to fetch bills: Invalid response format')
        setBills([])
        return
      }
      
      // Transform the data for compatibility
      const transformedBills = data.map(bill => ({
        ...bill,
        id: bill._id || bill.id,
        key: bill._id || bill.id || Math.random().toString()
      }))
      
      setBills(transformedBills)
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast.error(`Failed to fetch bills: ${error.message || 'Server error'}`)
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewPDF = async (billId) => {
    try {
      const blob = await apiClient.get(`/api/bills/${billId}/pdf?preview=true`);
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to preview PDF');
    }
  }

  const handleDownloadPDF = async (billId) => {
    try {
      const blob = await apiClient.get(`/api/bills/${billId}/pdf`);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill-${billId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  }

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) {
      return
    }

    try {
      setLoading(true)
      await apiClient.delete(`/api/bills/${billId}`)
      toast.success('Bill deleted successfully')
      fetchBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error(`Failed to delete bill: ${error.message || 'Server error'}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'processing',
      completed: 'success',
      cancelled: 'error',
      converted: 'warning'
    };
    return statusMap[status?.toLowerCase()] || 'default';
  }

  const handleStatusChange = async (billId, newStatus) => {
    try {
      await apiClient.put(`/api/bills/${billId}/status`, { status: newStatus });
      toast.success(`Bill marked as ${newStatus}`);
      fetchBills();
    } catch (error) {
      console.error('Error updating bill status:', error);
      toast.error('Failed to update bill status');
    }
  }

  const handleExportToExcel = async () => {
    try {
      const response = await apiClient.get('/api/bills/export/excel', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bills-Export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Bills exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting bills:', error);
      toast.error('Failed to export bills');
    }
  };

  const getBillTypeBadge = (type) => {
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
    const numericAmount = parseFloat(amount);
    return isNaN(numericAmount) ? 'Rs. 0' : `Rs. ${numericAmount.toLocaleString()}`;
  };

  const filterBills = (bill) => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    return (
      (bill.customer_name && bill.customer_name.toLowerCase().includes(searchLower)) ||
      (bill.customer_nic && bill.customer_nic.toLowerCase().includes(searchLower)) ||
      (bill.model_name && bill.model_name.toLowerCase().includes(searchLower)) ||
      (bill._id && bill._id.toLowerCase().includes(searchLower))
    );
  };

  const getBillTypeTag = (record) => {
    if (record.is_advance_payment) {
      return <Tag color="orange">{`Advance ${record.bill_type}`}</Tag>;
    }
    return <Tag color={record.bill_type?.toLowerCase() === 'cash' ? 'green' : 'blue'}>
      {record.bill_type?.toUpperCase() || 'CASH'}
    </Tag>;
  };

  const columns = [
    {
      title: 'Bill #',
      dataIndex: '_id',
      key: '_id',
      render: (id) => (
        <Link to={`/bills/${id}`} className="text-blue-600 hover:underline">
          {id.substring(0, 8)}
        </Link>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Model',
      dataIndex: 'model_name',
      key: 'model_name',
    },
    {
      title: 'Type',
      dataIndex: 'bill_type',
      key: 'bill_type',
      render: (type) => getBillTypeBadge(type),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatAmount(amount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={getStatusBadgeClass(status)} text={status} />
      ),
    },
    {
      title: 'Date',
      dataIndex: 'bill_date',
      key: 'bill_date',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewPDF(record._id)}
            title="Preview"
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadPDF(record._id)}
            title="Download"
          />
          <Popconfirm
            title="Are you sure you want to delete this bill?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Bills</h1>
        <div className="flex space-x-3">
          <Input
            placeholder="Search bills..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            className="w-64"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/bills/new')}
          >
            Generate Bill
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportToExcel}
          >
            Export
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowKey="_id"
          dataSource={bills.filter(filterBills)}
          columns={columns}
          pagination={{ pageSize: 10 }}
          className="bg-white rounded-lg shadow"
          onRow={(record) => ({
            onClick: () => navigate(`/bills/${record._id}`),
            style: { cursor: 'pointer' }
          })}
        />
      )}
    </div>
  )
}

export default BillList 