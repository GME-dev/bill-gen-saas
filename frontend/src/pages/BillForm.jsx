import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function BillForm() {
  const navigate = useNavigate()
  const [bikeModels, setBikeModels] = useState([])
  const [loading, setLoading] = useState(false)
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
    total_amount: 0
  })

  useEffect(() => {
    // Fetch bike models when component mounts
    const fetchBikeModels = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/bike-models')
        setBikeModels(response.data)
      } catch (error) {
        console.error('Error fetching bike models:', error)
        toast.error('Failed to load bike models')
      }
    }
    fetchBikeModels()
  }, [])

  // Calculate total amount whenever bike price or bill type changes
  useEffect(() => {
    const total = formData.bike_price + 13000 // Add RMV charge
    setFormData(prev => ({
      ...prev,
      total_amount: total
    }))
  }, [formData.bike_price, formData.bill_type])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let updatedValue = value

    // Handle numeric fields
    if (name === 'bike_price' || name === 'down_payment') {
      updatedValue = parseFloat(value) || 0
    }

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }))

    // Auto-update bike price when model is selected
    if (name === 'model_name') {
      const selectedModel = bikeModels.find(model => model.model_name === value)
      if (selectedModel) {
        setFormData(prev => ({
          ...prev,
          model_name: selectedModel.model_name,
          bike_price: selectedModel.price,
          motor_number: selectedModel.motor_number_prefix ? `${selectedModel.motor_number_prefix}-` : '',
          chassis_number: selectedModel.chassis_number_prefix ? `${selectedModel.chassis_number_prefix}-` : ''
        }))
      }
    }

    // Reset down payment when switching to cash sale
    if (name === 'bill_type' && value === 'cash') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        down_payment: 0
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate form data
      if (!formData.customer_name || !formData.customer_nic || !formData.customer_address) {
        toast.error('Please fill in all customer information')
        return
      }

      if (!formData.model_name || !formData.motor_number || !formData.chassis_number || !formData.bike_price) {
        toast.error('Please fill in all vehicle information')
        return
      }

      if (formData.bill_type === 'leasing' && !formData.down_payment) {
        toast.error('Please enter down payment for leasing sale')
        return
      }

      const response = await axios.post('http://localhost:3000/api/bills', {
        ...formData,
        total_amount: formData.bike_price + 13000 // Add RMV charge
      })
      
      if (response.data && response.data.id) {
        toast.success('Bill created successfully')
        navigate('/bills')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error creating bill:', error)
      toast.error(error.response?.data?.error || 'Failed to create bill')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Bill</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Type Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Bill Type</label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="bill_type"
                value="cash"
                checked={formData.bill_type === 'cash'}
                onChange={handleInputChange}
                className="form-radio"
              />
              <span className="ml-2">Cash Sale</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="bill_type"
                value="leasing"
                checked={formData.bill_type === 'leasing'}
                onChange={handleInputChange}
                className="form-radio"
              />
              <span className="ml-2">Leasing Sale</span>
            </label>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">NIC</label>
              <input
                type="text"
                name="customer_nic"
                value={formData.customer_nic}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="customer_address"
              value={formData.customer_address}
              onChange={handleInputChange}
              required
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <select
                name="model_name"
                value={formData.model_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Model</option>
                {bikeModels.map(model => (
                  <option key={model.id} value={model.model_name}>
                    {model.model_name} - Rs. {model.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Motor Number</label>
              <input
                type="text"
                name="motor_number"
                value={formData.motor_number}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Chassis Number</label>
            <input
              type="text"
              name="chassis_number"
              value={formData.chassis_number}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold mb-4">Payment Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bike Price (Rs.)</label>
              <input
                type="number"
                name="bike_price"
                value={formData.bike_price}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
              />
            </div>
            
            {formData.bill_type === 'leasing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Down Payment (Rs.)</label>
                <input
                  type="number"
                  name="down_payment"
                  value={formData.down_payment}
                  onChange={handleInputChange}
                  required
                  min="0"
                  max={formData.total_amount}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">RMV Charge:</span>
              <span className="font-medium">Rs. 13,000.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-900 font-medium">Total Amount:</span>
              <span className="text-lg font-bold">Rs. {formData.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/bills')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? 'Creating...' : 'Create Bill'}
          </button>
        </div>
      </form>
    </div>
  )
} 