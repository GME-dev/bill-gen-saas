-- Start transaction
BEGIN;

-- Create bill_type ENUM if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type') THEN
        CREATE TYPE bill_type AS ENUM ('CASH', 'LEASE', 'ADVANCE_CASH', 'ADVANCE_LEASE');
    END IF;
END $$;

-- Drop existing tables if they exist (comment these out if you want to preserve existing data)
-- DROP TABLE IF EXISTS bills CASCADE;
-- DROP TABLE IF EXISTS bike_models CASCADE;

-- Create or update bike_models table
CREATE TABLE IF NOT EXISTS bike_models (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    motor_number_prefix TEXT,
    chassis_number_prefix TEXT,
    is_ebicycle BOOLEAN DEFAULT FALSE,
    can_be_leased BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create or update bills table with all constraints
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_type bill_type NOT NULL,
    customer_name TEXT NOT NULL,
    customer_nic TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    model_name TEXT NOT NULL,
    motor_number TEXT NOT NULL,
    chassis_number TEXT NOT NULL,
    bike_price DECIMAL(10,2) NOT NULL,
    rmv_charge DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2),
    advance_amount DECIMAL(10,2),
    bill_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    balance_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'converted')),
    original_bill_id INTEGER REFERENCES bills(id),
    converted_bill_id INTEGER REFERENCES bills(id),
    estimated_delivery_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_name) REFERENCES bike_models(name),
    -- Ensure e-bicycles can't have lease bills
    CONSTRAINT valid_lease_bill CHECK (
        (bill_type NOT IN ('LEASE', 'ADVANCE_LEASE')) OR 
        (SELECT can_be_leased FROM bike_models WHERE name = model_name)
    ),
    -- Ensure RMV charges are correct based on bill type
    CONSTRAINT valid_rmv_charge CHECK (
        (rmv_charge = 0 AND (SELECT is_ebicycle FROM bike_models WHERE name = model_name)) OR
        (rmv_charge = 13000 AND bill_type = 'CASH') OR
        (rmv_charge = 13500 AND bill_type = 'LEASE') OR
        (rmv_charge = 13000 AND bill_type = 'ADVANCE_CASH') OR
        (rmv_charge = 13500 AND bill_type = 'ADVANCE_LEASE')
    ),
    -- Ensure balance calculation is correct
    CONSTRAINT valid_balance CHECK (
        (bill_type = 'CASH' AND balance_amount = total_amount - COALESCE(advance_amount, 0)) OR
        (bill_type = 'LEASE' AND balance_amount = down_payment - COALESCE(advance_amount, 0)) OR
        (bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') AND balance_amount IS NOT NULL) OR
        (bill_type IN ('CASH', 'LEASE') AND advance_amount IS NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_customer_nic ON bills(customer_nic);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON bills(bill_type);

-- Insert or update bike models
INSERT INTO bike_models (name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle, can_be_leased)
VALUES 
    ('TMR-G18', 499500.00, 'G18', 'G18', FALSE, TRUE),
    ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE, TRUE),
    ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE, TRUE),
    ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE, TRUE),
    ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE, TRUE),
    ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE, TRUE),
    ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE, FALSE),
    ('TMR-X01', 219500.00, 'X01', 'X01', TRUE, FALSE)
ON CONFLICT (name) 
DO UPDATE SET 
    price = EXCLUDED.price,
    motor_number_prefix = EXCLUDED.motor_number_prefix,
    chassis_number_prefix = EXCLUDED.chassis_number_prefix,
    is_ebicycle = EXCLUDED.is_ebicycle,
    can_be_leased = EXCLUDED.can_be_leased;

-- Create bill_summary view for easier calculations
CREATE OR REPLACE VIEW bill_summary AS
SELECT 
    b.*,
    CASE 
        WHEN b.bill_type = 'CASH' THEN b.bike_price + b.rmv_charge
        WHEN b.bill_type = 'LEASE' THEN b.down_payment
        WHEN b.bill_type = 'ADVANCE_CASH' THEN b.bike_price + b.rmv_charge
        WHEN b.bill_type = 'ADVANCE_LEASE' THEN b.down_payment
    END as payable_amount,
    CASE 
        WHEN b.bill_type = 'ADVANCE_CASH' THEN b.advance_amount
        WHEN b.bill_type = 'ADVANCE_LEASE' THEN b.advance_amount
        ELSE NULL
    END as paid_advance,
    bm.is_ebicycle,
    bm.can_be_leased
FROM bills b
JOIN bike_models bm ON b.model_name = bm.name;

-- Add helpful comments
COMMENT ON TABLE bills IS 'Stores all bill records for scooter sales and leases';
COMMENT ON TABLE bike_models IS 'Stores available bike models and their details';
COMMENT ON COLUMN bills.bill_type IS 'Type of bill: CASH, LEASE, ADVANCE_CASH, or ADVANCE_LEASE';
COMMENT ON COLUMN bills.rmv_charge IS 'RMV charge: 0 for e-bicycles, 13000 for cash sales, 13500 for leasing';
COMMENT ON COLUMN bills.converted_bill_id IS 'Reference to the final bill when an advance payment is converted';
COMMENT ON COLUMN bike_models.can_be_leased IS 'Whether the bike model can be sold through leasing (false for e-bicycles)';

-- Create a function to help with bill conversion
CREATE OR REPLACE FUNCTION convert_advance_to_final_bill(
    advance_bill_id INTEGER,
    final_bill_type bill_type,
    down_payment DECIMAL(10,2) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    advance_bill bills;
    new_bill_id INTEGER;
BEGIN
    -- Get the advance bill
    SELECT * INTO advance_bill FROM bills WHERE id = advance_bill_id;
    
    -- Validate the bill can be converted
    IF advance_bill.status != 'pending' THEN
        RAISE EXCEPTION 'Bill % is not in pending status', advance_bill_id;
    END IF;
    
    IF NOT advance_bill.bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') THEN
        RAISE EXCEPTION 'Bill % is not an advance payment bill', advance_bill_id;
    END IF;
    
    -- Insert the new bill
    INSERT INTO bills (
        bill_type,
        customer_name,
        customer_nic,
        customer_address,
        model_name,
        motor_number,
        chassis_number,
        bike_price,
        rmv_charge,
        down_payment,
        bill_date,
        total_amount,
        balance_amount,
        original_bill_id
    ) VALUES (
        final_bill_type,
        advance_bill.customer_name,
        advance_bill.customer_nic,
        advance_bill.customer_address,
        advance_bill.model_name,
        advance_bill.motor_number,
        advance_bill.chassis_number,
        advance_bill.bike_price,
        CASE 
            WHEN final_bill_type = 'LEASE' THEN 13500
            ELSE 13000
        END,
        CASE 
            WHEN final_bill_type = 'LEASE' THEN down_payment
            ELSE NULL
        END,
        CURRENT_DATE,
        CASE 
            WHEN final_bill_type = 'LEASE' THEN down_payment
            ELSE advance_bill.bike_price + 13000
        END,
        CASE 
            WHEN final_bill_type = 'LEASE' THEN down_payment - advance_bill.advance_amount
            ELSE advance_bill.bike_price + 13000 - advance_bill.advance_amount
        END,
        advance_bill_id
    ) RETURNING id INTO new_bill_id;
    
    -- Update the advance bill status
    UPDATE bills 
    SET status = 'converted',
        converted_bill_id = new_bill_id
    WHERE id = advance_bill_id;
    
    RETURN new_bill_id;
END;
$$ LANGUAGE plpgsql;

COMMIT; 