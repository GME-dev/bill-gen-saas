import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import api from '../config/api'

export default function BillForm() {
  const navigate = useNavigate()
  const [bikeModels, setBikeModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentModel, setCurrentModel] = useState(null)
  const [formData, setFormData] = useState({
    bill_type: 'cash',
    customer_name: '',
    customer_nic: '',
    customer_address: '',
    model_name: '',
    motor_number: '',
    chassis_number: '',
    bike_price: 0,
    down_payment: 0,
    total_amount: 0,
    balance_amount: 0,
    estimated_delivery_date: ''
  })

  // Calculate total and balance amounts when relevant fields change
  useEffect(() => {
    calculateTotalAndBalance();
  }, [formData.bike_price, formData.bill_type, formData.down_payment]);

  const calculateTotalAndBalance = () => {
    const bikePrice = parseInt(formData.bike_price) || 0;
    let total = bikePrice;
    
    // Add RMV charges for regular bikes (not e-bicycles)
    if (!currentModel?.is_ebicycle && formData.bill_type !== 'advancement') {
      const rmvCharge = 13000;
      total += rmvCharge;
    }
    
    // Calculate balance for advancement bills
    let balance = 0;
    if (formData.bill_type === 'advancement') {
      const downPayment = parseInt(formData.down_payment) || 0;
      balance = total - downPayment;
    }
    
    setFormData(prev => ({
      ...prev,
      total_amount: total,
      balance_amount: balance
    }));
  };

  useEffect(() => {
    // Fetch bike models when component mounts
    const fetchBikeModels = async () => {
      try {
        setLoading(true)
        // Filter models if bill type is leasing or advancement
        const url = (formData.bill_type === 'leasing' || formData.bill_type === 'advancement') 
          ? `/bike-models?bill_type=${formData.bill_type}`
          : '/bike-models';
          
        const response = await api.get(url)
        setBikeModels(response.data)
      } catch (error) {
        toast.error('Failed to load bike models')
        console.error('Error fetching bike models:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBikeModels()
  }, [formData.bill_type])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Special handling for model selection
    if (name === 'model_name') {
      const selectedModel = bikeModels.find(model => model.model_name === value);
      if (selectedModel) {
        setCurrentModel(selectedModel);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          bike_price: selectedModel.price
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  }

  const handleBillTypeChange = (e) => {
    const newBillType = e.target.value;
    
    // Reset model selection if switching to leasing or advancement and current model is e-bicycle
    if ((newBillType === 'leasing' || newBillType === 'advancement') && currentModel?.is_ebicycle) {
      setCurrentModel(null);
      setFormData(prev => ({
        ...prev,
        bill_type: newBillType,
        model_name: '',
        bike_price: 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        bill_type: newBillType
      }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.customer_name) {
      toast.error('Customer name is required')
      return
    }
    
    if (!formData.model_name) {
      toast.error('Bike model is required')
      return
    }
    
    // Additional validation for advancement bills
    if (formData.bill_type === 'advancement') {
      if (!formData.down_payment || formData.down_payment <= 0) {
        toast.error('Advancement amount is required')
        return
      }
      
      if (!formData.estimated_delivery_date) {
        toast.error('Estimated delivery date is required')
        return
      }
    }

    try {
      setSubmitting(true)
      
      const response = await api.post('/bills', formData)
      
      toast.success('Bill created successfully')
      navigate(`/bills/${response.data.id}`)
    } catch (error) {
      toast.error('Failed to create bill')
      console.error('Error creating bill:', error)
      setSubmitting(false)
    }
  }

  const handlePreviewPDF = async () => {
    try {
      // Similar to handleSubmit but for preview
      // ... existing preview code ...
    } catch (error) {
      toast.error('Failed to generate preview')
      console.error('Error generating preview:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Bill</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
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
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="bill_type"
                value="advancement"
                checked={formData.bill_type === 'advancement'}
                onChange={handleBillTypeChange}
                className="form-radio h-5 w-5 text-blue-600"
              />
              <span className="ml-2">Advancement</span>
            </label>
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">NIC</label>
              <input
                type="text"
                name="customer_nic"
                value={formData.customer_nic}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-2">Address</label>
              <textarea
                name="customer_address"
                value={formData.customer_address}
                onChange={handleInputChange}
                className="form-textarea w-full rounded-md border-gray-300"
                rows="2"
                required
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Vehicle Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Bike Model</label>
              <select
                name="model_name"
                value={formData.model_name}
                onChange={handleInputChange}
                className="form-select w-full rounded-md border-gray-300"
                required
              >
                <option value="">Select Bike Model</option>
                {bikeModels.map((model) => (
                  <option key={model.id} value={model.model_name}>
                    {model.model_name} - Rs. {model.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Price</label>
              <input
                type="number"
                name="bike_price"
                value={formData.bike_price}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300 bg-gray-100"
                readOnly
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Motor Number</label>
              <input
                type="text"
                name="motor_number"
                value={formData.motor_number}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Chassis Number</label>
              <input
                type="text"
                name="chassis_number"
                value={formData.chassis_number}
                onChange={handleInputChange}
                className="form-input w-full rounded-md border-gray-300"
                required
              />
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.bill_type === 'leasing' || formData.bill_type === 'advancement') && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  {formData.bill_type === 'advancement' ? 'Advancement Amount' : 'Down Payment'}
                </label>
                <input
                  type="number"
                  name="down_payment"
                  value={formData.down_payment}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-md border-gray-300"
                  required={formData.bill_type === 'leasing' || formData.bill_type === 'advancement'}
                />
              </div>
            )}
            
            {formData.bill_type === 'advancement' && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Balance Amount</label>
                  <input
                    type="number"
                    name="balance_amount"
                    value={formData.balance_amount}
                    className="form-input w-full rounded-md border-gray-300 bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Estimated Delivery Date</label>
                  <input
                    type="date"
                    name="estimated_delivery_date"
                    value={formData.estimated_delivery_date}
                    onChange={handleInputChange}
                    className="form-input w-full rounded-md border-gray-300"
                    required={formData.bill_type === 'advancement'}
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Total Amount</label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                className="form-input w-full rounded-md border-gray-300 bg-gray-100"
                readOnly
              />
              {!currentModel?.is_ebicycle && formData.bill_type !== 'advancement' && (
                <p className="text-sm text-gray-500 mt-1">Includes Rs. 13,000 RMV charges</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handlePreviewPDF}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Preview Bill
          </button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Bill'}
          </button>
        </div>
      </form>
    </div>
  )
} 