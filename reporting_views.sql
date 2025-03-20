-- Monthly sales report view
CREATE OR REPLACE VIEW monthly_sales_report AS
SELECT 
    DATE_TRUNC('month', b.bill_date) as month,
    bm.is_ebicycle,
    b.bill_type,
    COUNT(*) as total_bills,
    SUM(b.bike_price) as total_bike_value,
    SUM(b.rmv_charge) as total_rmv_charges,
    SUM(
        CASE 
            WHEN b.bill_type IN ('LEASE', 'ADVANCE_LEASE') THEN b.down_payment
            ELSE b.total_amount
        END
    ) as total_collected_amount,
    SUM(
        CASE 
            WHEN b.bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') THEN b.advance_amount
            ELSE 0
        END
    ) as total_advance_payments
FROM bills b
JOIN bike_models bm ON b.model_name = bm.name
WHERE b.status != 'converted'  -- Exclude converted advance bills to avoid double counting
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- Customer payment tracking view
CREATE OR REPLACE VIEW customer_payments AS
SELECT 
    b.customer_nic,
    b.customer_name,
    COUNT(DISTINCT b.id) as total_bills,
    SUM(
        CASE 
            WHEN b.bill_type IN ('LEASE', 'ADVANCE_LEASE') THEN b.down_payment
            ELSE b.total_amount
        END
    ) as total_payable,
    SUM(
        CASE 
            WHEN b.bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') THEN b.advance_amount
            ELSE 0
        END
    ) as total_paid,
    SUM(
        CASE 
            WHEN b.status = 'pending' AND b.bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') 
            THEN b.balance_amount
            ELSE 0
        END
    ) as pending_balance
FROM bills b
GROUP BY 1, 2
ORDER BY 3 DESC;

-- Bike model performance view
CREATE OR REPLACE VIEW bike_model_performance AS
SELECT 
    bm.name as model_name,
    bm.is_ebicycle,
    bm.price as current_price,
    COUNT(b.id) as total_sales,
    COUNT(CASE WHEN b.bill_type = 'CASH' THEN 1 END) as cash_sales,
    COUNT(CASE WHEN b.bill_type = 'LEASE' THEN 1 END) as lease_sales,
    COUNT(CASE WHEN b.bill_type LIKE 'ADVANCE_%' THEN 1 END) as advance_bookings,
    SUM(b.bike_price) as total_bike_value,
    SUM(b.rmv_charge) as total_rmv_charges,
    SUM(
        CASE 
            WHEN b.bill_type IN ('LEASE', 'ADVANCE_LEASE') THEN b.down_payment
            ELSE b.total_amount
        END
    ) as total_revenue
FROM bike_models bm
LEFT JOIN bills b ON bm.name = b.model_name AND b.status != 'converted'
GROUP BY 1, 2, 3
ORDER BY 4 DESC; 