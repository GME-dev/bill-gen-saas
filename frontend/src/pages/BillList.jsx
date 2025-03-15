import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../config/api'

const BillList = () => {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      const response = await api.get('/bills')
      setBills(response.data)
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
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Advancement</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bills</h1>
        <button
          onClick={() => navigate('/bills/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create New Bill
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No bills found. Create your first bill!
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <a 
                        href={`/bills/${bill.id}`} 
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        #{bill.id}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(bill.bill_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getBillTypeBadge(bill.bill_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.model_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {parseInt(bill.total_amount).toLocaleString()}
                      {bill.bill_type === 'advancement' && (
                        <div className="text-xs text-gray-500">
                          Adv: Rs. {parseInt(bill.down_payment).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(bill.status)}`}>
                          {bill.status === 'completed' ? 'Completed' :
                           bill.status === 'converted' ? 'Converted' :
                           'Pending'}
                        </span>
                        {bill.status === 'pending' && bill.bill_type !== 'advancement' && bill.bill_type !== 'advance' && (
                          <button
                            onClick={() => handleStatusChange(bill.id, 'completed')}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            title="Mark as completed"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <a
                        href={`/bills/${bill.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDownloadPDF(bill.id, true)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(bill.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Download
                      </button>
                      {bill.status !== 'converted' && (
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default BillList 