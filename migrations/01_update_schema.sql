-- Alter bike_models table to add missing columns and constraints
ALTER TABLE bike_models 
ADD COLUMN IF NOT EXISTS motor_number_prefix TEXT,
ADD COLUMN IF NOT EXISTS chassis_number_prefix TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS can_be_leased BOOLEAN DEFAULT TRUE;

-- Update existing records with their prefixes and leasing constraints
UPDATE bike_models
SET 
    motor_number_prefix = CASE 
        WHEN name = 'TMR-G18' THEN 'G18'
        WHEN name = 'TMR-MNK3' THEN 'MNK3'
        WHEN name = 'TMR-Q1' THEN 'Q1'
        WHEN name = 'TMR-ZL' THEN 'ZL'
        WHEN name = 'TMR-ZS' THEN 'ZS'
        WHEN name = 'TMR-XGW' THEN 'XGW'
        WHEN name = 'TMR-COLA5' THEN 'COLA5'
        WHEN name = 'TMR-X01' THEN 'X01'
    END,
    chassis_number_prefix = motor_number_prefix,
    -- Set can_be_leased to false for e-bicycles
    can_be_leased = CASE 
        WHEN name IN ('TMR-COLA5', 'TMR-X01') THEN FALSE 
        ELSE TRUE 
    END
WHERE motor_number_prefix IS NULL;

-- Create an enum for bill types
CREATE TYPE bill_type AS ENUM ('CASH', 'LEASE', 'ADVANCE_CASH', 'ADVANCE_LEASE');

-- Create bills table with updated structure
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

-- Add comments for better documentation
COMMENT ON TABLE bills IS 'Stores all bill records for scooter sales and leases';
COMMENT ON TABLE bike_models IS 'Stores available bike models and their details';
COMMENT ON COLUMN bills.bill_type IS 'Type of bill: CASH, LEASE, ADVANCE_CASH, or ADVANCE_LEASE';
COMMENT ON COLUMN bills.rmv_charge IS 'RMV charge: 0 for e-bicycles, 13000 for cash sales, 13500 for leasing';
COMMENT ON COLUMN bills.converted_bill_id IS 'Reference to the final bill when an advance payment is converted';
COMMENT ON COLUMN bike_models.can_be_leased IS 'Whether the bike model can be sold through leasing (false for e-bicycles)';

-- Create a view for easier bill calculations
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

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres; 