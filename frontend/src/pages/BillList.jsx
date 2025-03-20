import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../config/api'
import { Table, Tag, Button, Space } from 'antd'
import { supabase } from '../config/supabaseClient'

const BillList = () => {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bill_summaries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBills(data)
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast.error('Failed to load bills')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (billId, preview = false) => {
    try {
      const response = await api.get(
        `/bills/${billId}/pdf${preview ? '?preview=true' : ''}`,
        { responseType: 'blob' }
      )
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      
      if (preview) {
        // Open PDF in new tab for preview
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      } else {
        // Download PDF
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bill-${billId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) {
      return
    }

    try {
      await api.delete(`/bills/${billId}`)
      toast.success('Bill deleted successfully')
      fetchBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'converted':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (billId, newStatus) => {
    try {
      await api.patch(`/bills/${billId}`, { status: newStatus })
      fetchBills()
      toast.success(`Bill status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getBillTypeBadge = (type) => {
    switch (type) {
      case 'cash':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Cash</span>;
      case 'leasing':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Leasing</span>;
      case 'advancement':
      case 'advance':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">Advancement</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const getBillTypeTag = (record) => {
    if (record.is_advance_payment) {
      return <Tag color="orange">{`Advance ${record.bill_type}`}</Tag>;
    }
    return <Tag color={record.bill_type === 'cash' ? 'green' : 'blue'}>
      {record.bill_type.toUpperCase()}
    </Tag>;
  };

  const columns = [
    {
      title: 'Bill Number',
      dataIndex: 'bill_number',
      key: 'bill_number',
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
      render: (text, record) => (
        <Space>
          {text}
          {record.is_ebicycle && <Tag color="purple">E-Bicycle</Tag>}
        </Space>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      render: (_, record) => getBillTypeTag(record),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => {
        if (record.bill_type === 'leasing') {
          return `Rs. ${record.down_payment?.toLocaleString()}`;
        }
        return `Rs. ${record.total_amount?.toLocaleString()}`;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'pending' ? 'orange' :
          status === 'completed' ? 'green' :
          status === 'converted' ? 'blue' : 'default'
        }>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'bill_date',
      key: 'bill_date',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => navigate(`/bills/${record.id}`)}>
            View
          </Button>
          {record.is_advance_payment && record.status === 'pending' && (
            <Button onClick={() => navigate(`/bills/${record.id}/convert`)}>
              Convert
            </Button>
          )}
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
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Bills</h1>
        <Button type="primary" onClick={() => navigate('/bills/new')}>
          Generate New Bill
        </Button>
      </div>
      
      <Table
        columns={columns}
        dataSource={bills}
        rowKey="id"
        loading={loading}
      />
    </div>
  )
}

export default BillList 