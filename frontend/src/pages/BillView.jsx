import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function BillView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBill()
  }, [id])

  const fetchBill = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/bills/${id}`)
      setBill(response.data)
      setLoading(false)
    } catch (error) {
      toast.error('Failed to fetch bill')
      console.error('Error fetching bill:', error)
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/bills/${id}/pdf`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bill-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to download PDF')
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF. Please try again.')
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`http://localhost:3000/api/bills/${id}`, { status: newStatus })
      fetchBill()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await axios.delete(`http://localhost:3000/api/bills/${id}`)
        navigate('/bills')
      } catch (error) {
        console.error('Error deleting bill:', error)
        alert('Failed to delete bill. Please try again.')
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadgeClass = (status) => {
    const baseClasses = 'px-3 py-1 text-sm font-medium rounded-full'
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Bill not found</h2>
        <p className="mt-2 text-gray-600">The bill you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/bills')}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Bills
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bill Details</h1>
        <div className="space-x-4">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Download PDF
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Bill
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Bill #{bill.id}</h2>
              <p className="text-sm text-gray-500">Created on {formatDate(bill.bill_date)}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={getStatusBadgeClass(bill.status)}>
                {bill.status}
              </span>
              <select
                value={bill.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1">{bill.customer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">NIC</p>
                <p className="mt-1">{bill.customer_nic}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="mt-1">{bill.customer_address}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="mt-1">{bill.model_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Motor Number</p>
                <p className="mt-1">{bill.motor_number}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Chassis Number</p>
                <p className="mt-1">{bill.chassis_number}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Bike Price</span>
                <span>Rs. {bill.bike_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">RMV Charge</span>
                <span>Rs. 13,000.00</span>
              </div>
              {bill.bill_type === 'leasing' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Down Payment</span>
                  <span>Rs. {bill.down_payment.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>Rs. {bill.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 