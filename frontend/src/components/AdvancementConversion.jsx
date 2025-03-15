import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../config/api';

export default function AdvancementConversion({ bill, onConversionComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    bill_type: 'cash',
    down_payment: bill?.down_payment || 0,
    total_amount: bill?.total_amount || 0
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBillTypeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      bill_type: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate fields
      if (!formData.bill_type) {
        toast.error('Please select a bill type');
        return;
      }
      
      // For leasing bills, down payment is required
      if (formData.bill_type === 'leasing' && !formData.down_payment) {
        toast.error('Down payment is required for leasing bills');
        return;
      }
      
      const response = await api.post(`/bills/${bill.id}/convert`, formData);
      
      toast.success('Bill converted successfully');
      
      // Call the callback function to update the UI
      if (onConversionComplete) {
        onConversionComplete(response.data);
      }
      
      // Navigate to the new bill
      navigate(`/bills/${response.data.id}`);
    } catch (error) {
      console.error('Error converting bill:', error);
      toast.error(error.response?.data?.message || 'Failed to convert bill');
    } finally {
      setLoading(false);
    }
  };

  if (!bill || (bill.bill_type !== 'advancement' && bill.bill_type !== 'advance') || bill.status !== 'pending') {
    return null;
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
        >
          <span className="mr-1">↻</span>
          Convert to Final Bill
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 mt-4">
          <h3 className="text-lg font-semibold mb-4">Convert Advancement to Final Bill</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Bill Type</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="bill_type"
                    value="cash"
                    checked={formData.bill_type === 'cash'}
                    onChange={handleBillTypeChange}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2">Cash Sale</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="bill_type"
                    value="leasing"
                    checked={formData.bill_type === 'leasing'}
                    onChange={handleBillTypeChange}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2">Leasing</span>
                </label>
              </div>
            </div>
            
            {formData.bill_type === 'leasing' && (
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Down Payment</label>
                <input
                  type="number"
                  name="down_payment"
                  value={formData.down_payment}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-md border-gray-300"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Previous advancement amount: Rs. {bill.down_payment?.toLocaleString() || 0}
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Total Amount</label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300"
              />
              <p className="text-sm text-gray-500 mt-1">
                Original total amount: Rs. {bill.total_amount?.toLocaleString() || 0}
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Converting...
                  </>
                ) : (
                  <>
                    <span className="mr-1">↻</span>
                    Convert Bill
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 