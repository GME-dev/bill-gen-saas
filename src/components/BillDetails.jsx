const calculateTotalWithRMV = (bill) => {
  const rmvCharge = bill.bill_type === 'LEASE' ? 13500 : 13000;
  return parseFloat(bill.bike_price) + rmvCharge;
};

<div className="payment-info">
  <h3>Payment Information</h3>
  <div>
    <p>Bill Type: {bill.bill_type}</p>
    <p>Bike Price: Rs. {formatNumber(bill.bike_price)}</p>
    <p>RMV Charge: Rs. {formatNumber(bill.bill_type === 'LEASE' ? 13500 : 13000)}</p>
    <p>Total Amount: Rs. {formatNumber(calculateTotalWithRMV(bill))}</p>
  </div>
</div> 