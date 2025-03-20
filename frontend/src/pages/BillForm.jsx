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
    let rmvCharge = 0;
    
    console.log('CALCULATE TOTAL DEBUG:');
    console.log('- Bike price:', bikePrice);
    console.log('- Current model:', currentModel ? JSON.stringify(currentModel) : 'null');
    console.log('- Model name:', formData.model_name);
    console.log('- Bill type:', formData.bill_type);
    
    // Add RMV charges based on bill type and bike type
    const modelNameUpper = (formData.model_name || '').toUpperCase();
    const isCola5 = modelNameUpper.includes('COLA5');
    const isX01 = modelNameUpper.includes('X01');
    const isEBicycle = isCola5 || isX01 || (currentModel && currentModel.is_ebicycle);
    
    if (!isEBicycle && formData.bill_type !== 'advancement') {
      // Add RMV charges for non-e-bicycles
      if (formData.bill_type === 'cash') {
        rmvCharge = 13000; // Cash bill RMV charge
      } else if (formData.bill_type === 'leasing') {
        rmvCharge = 13500; // Leasing bill RMV charge
      }
      total += rmvCharge;
    }
    
    console.log('- Is E-Bicycle:', isEBicycle);
    console.log('- RMV Charge:', rmvCharge);
    console.log('- Final total amount:', total);
    
    // Calculate balance for advancement bills
    let balance = 0;
    if (formData.bill_type === 'advancement') {
      const downPayment = parseInt(formData.down_payment) || 0;
      balance = total - downPayment;
    }
    
    setFormData(prev => ({
      ...prev,
      total_amount: total,
      balance_amount: balance,
      rmv_charge: rmvCharge
    }));
  };

  useEffect(() => {
    // Fetch bike models when component mounts
    const fetchBikeModels = async () => {
      try {
        setLoading(true)
        // Filter models only if bill type is leasing
        const url = formData.bill_type === 'leasing'
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
        console.log('SELECTED MODEL DEBUG INFO:');
        console.log('- Model name:', selectedModel.model_name);
        console.log('- is_ebicycle flag value:', selectedModel.is_ebicycle);
        console.log('- is_ebicycle type:', typeof selectedModel.is_ebicycle);
        console.log('- Full model object:', JSON.stringify(selectedModel));
        
        setCurrentModel(selectedModel);
        
        // COLA5 DEBUG OVERRIDE - Force e-bicycle status for any COLA5 model
        if (selectedModel.model_name.toUpperCase().includes('COLA5') && !selectedModel.is_ebicycle) {
          console.log('⚠️ CRITICAL: COLA5 model found with is_ebicycle=false, applying EMERGENCY OVERRIDE');
          const correctedModel = {...selectedModel, is_ebicycle: true};
          setCurrentModel(correctedModel);
        }
        
        setFormData(prev => ({
          ...prev,
          [name]: value,
          bike_price: selectedModel.price
        }));
        
        // Force a recalculation of total amount
        setTimeout(() => {
          calculateTotalAndBalance();
        }, 100);
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
    
    // Reset model selection if switching to leasing and current model is e-bicycle
    if (newBillType === 'leasing' && currentModel?.is_ebicycle) {
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
    e.preventDefault();
    
    try {
      setLoading(true);
      setSubmitting(true);
      
      // Validate fields
      if (!formData.bill_type) {
        toast.error('Please select a bill type');
        setSubmitting(false);
        setLoading(false);
        return;
      }
      
      // Create a copy of the form data
      const submitData = { ...formData };
      
      // Convert 'advancement' to 'advance' for server submission (DB character limit)
      if (submitData.bill_type === 'advancement') {
        submitData.bill_type = 'advance';
      }
      
      // Validate that chassis and motor numbers are provided
      if (!submitData.chassis_number || !submitData.motor_number) {
        toast.error('Please provide both chassis and motor numbers');
        setSubmitting(false);
        setLoading(false);
        return;
      }
      
      // Create the bill
      const response = await api.post('/bills', submitData);
      console.log('Bill created successfully:', response.data);
      toast.success('Bill created successfully');
      
      // Navigate to the bill view page
      navigate(`/bills/${response.data.id}`);
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error(error.response?.data?.error || 'Failed to save bill');
      setSubmitting(false);
      setLoading(false);
    }
  };

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
              <div>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  className="form-input w-full rounded-md border-gray-300 bg-gray-100"
                  readOnly
                />
                {/* Show RMV charges for non-e-bicycles and non-advancement bills */}
                {currentModel && 
                 !currentModel.is_ebicycle && 
                 !(formData.model_name || '').toUpperCase().includes('COLA5') && 
                 !(formData.model_name || '').toUpperCase().includes('X01') && 
                 formData.bill_type !== 'advancement' && formData.rmv_charge > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600">Breakdown:</div>
                    <div className="flex justify-between text-gray-500">
                      <span>Bike Price:</span>
                      <span>Rs. {formData.bike_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>RMV Charges:</span>
                      <span>Rs. {formData.rmv_charge.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
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