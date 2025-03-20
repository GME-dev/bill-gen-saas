import React, { useEffect, useState } from 'react';

const calculateTotalAmount = (bikePrice, billType) => {
  const rmvCharge = billType === 'LEASE' ? 13500 : 13000;
  return parseFloat(bikePrice) + rmvCharge;
};

const BillForm = () => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [billType, setBillType] = useState('LEASE');
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (selectedModel) {
      const total = calculateTotalAmount(selectedModel.price, billType);
      setTotalAmount(total);
    }
  }, [selectedModel, billType]);

  return (
    <div>
      {/* Render your form components here */}
    </div>
  );
};

export default BillForm; 