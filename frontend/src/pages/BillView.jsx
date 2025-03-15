import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import api from '../config/api'
import AdvancementConversion from '../components/AdvancementConversion'

export default function BillView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    fetchBill()
  }, [id])

  const fetchBill = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/bills/${id}`)
      setBill(response.data)
    } catch (error) {
      toast.error('Failed to fetch bill')
      console.error('Error fetching bill:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewPDF = async () => {
    try {
      const response = await api.get(
        `/bills/${id}/pdf?preview=true`,
        { responseType: 'blob' }
      );
      
      // Create blob URL and open in new window
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to preview PDF');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      const response = await api.get(
        `/bills/${id}/pdf`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bill-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintBill = async () => {
    try {
      setPrinting(true);
      const response = await api.get(
        `/bills/${id}/pdf`,
        { responseType: 'blob' }
      );
      
      // Create blob URL and open print dialog
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      printWindow.onload = function() {
        printWindow.print();
      };
    } catch (error) {
      console.error('Error printing bill:', error);
      toast.error('Failed to print bill');
    } finally {
      setPrinting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      console.log(`Updating bill ${id} status to ${newStatus}`);
      const response = await api.patch(`/bills/${id}`, { status: newStatus });
      console.log('Status update response:', response.data);
      fetchBill();
      toast.success(`Bill status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      try {
        await api.delete(`/bills/${id}`)
        navigate('/bills')
        toast.success('Bill deleted successfully')
      } catch (error) {
        console.error('Error deleting bill:', error)
        toast.error('Failed to delete bill');
      }
    }
  }

  // Handle bill conversion completion
  const handleConversionComplete = () => {
    toast.success('Bill converted successfully')
    fetchBill() // Refresh bill data
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
      case 'converted':
        return `${baseClasses} bg-blue-100 text-blue-800`
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
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/bills')}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
          >
            <span className="mr-1">←</span>
            Back to List
          </button>
        </div>
      </div>

      {/* Bill Details Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Bill #{bill.id}</h2>
          <div className="flex items-center gap-3">
            <span className={getStatusBadgeClass(bill.status)}>
              {bill.status === 'completed' ? 'Completed' :
              bill.status === 'converted' ? 'Converted' :
              'Pending'}
            </span>
            
            {bill.status === 'pending' && bill.bill_type !== 'advancement' && bill.bill_type !== 'advance' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-3 py-1 text-sm font-medium bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
              >
                <span className="mr-1">✓</span>
                Mark as Completed
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 pb-2 border-b">Customer Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{bill.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-600">NIC:</span>
                <span className="ml-2 font-medium">{bill.customer_nic}</span>
              </div>
              <div>
                <span className="text-gray-600">Address:</span>
                <span className="ml-2 font-medium">{bill.customer_address}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3 pb-2 border-b">Vehicle Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium">{bill.model_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Motor Number:</span>
                <span className="ml-2 font-medium">{bill.motor_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Chassis Number:</span>
                <span className="ml-2 font-medium">{bill.chassis_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Price:</span>
                <span className="ml-2 font-medium">Rs. {parseInt(bill.bike_price).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3 pb-2 border-b">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Bill Type:</span>
                <span className="ml-2 font-medium capitalize">{bill.bill_type}</span>
              </div>
              <div>
                <span className="text-gray-600">Bill Date:</span>
                <span className="ml-2 font-medium">{new Date(bill.bill_date).toLocaleDateString()}</span>
              </div>
              
              {bill.bill_type === 'leasing' && (
                <div>
                  <span className="text-gray-600">Down Payment:</span>
                  <span className="ml-2 font-medium">Rs. {parseInt(bill.down_payment).toLocaleString()}</span>
                </div>
              )}

              {(bill.bill_type === 'advancement' || bill.bill_type === 'advance') && (
                <>
                  <div>
                    <span className="text-gray-600">Advancement Amount:</span>
                    <span className="ml-2 font-medium">Rs. {parseInt(bill.down_payment).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="ml-2 font-medium">Rs. {parseInt(bill.balance_amount).toLocaleString()}</span>
                  </div>
                  {bill.estimated_delivery_date && (
                    <div>
                      <span className="text-gray-600">Estimated Delivery:</span>
                      <span className="ml-2 font-medium">{new Date(bill.estimated_delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-lg">
                <span className="text-gray-800 font-medium">Total Amount:</span>
                <span className="ml-2 font-bold">Rs. {parseInt(bill.total_amount).toLocaleString()}</span>
              </div>
              
              {bill.original_bill_id && (
                <div>
                  <span className="text-gray-600">Converted from Bill:</span>
                  <a 
                    href={`/bills/${bill.original_bill_id}`}
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    #{bill.original_bill_id}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advancement Bill Conversion */}
        {(bill.bill_type === 'advancement' || bill.bill_type === 'advance') && bill.status === 'pending' && (
          <AdvancementConversion bill={bill} onConversionComplete={handleConversionComplete} />
        )}

        {/* Bill Actions */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            <span className="mr-1">↓</span>
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          
          <button
            onClick={handlePrintBill}
            disabled={printing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
          >
            <span className="mr-1">🖨️</span>
            {printing ? 'Printing...' : 'Print Bill'}
          </button>
          
          {bill.status !== 'converted' && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
            >
              <span className="mr-1">🗑️</span>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 