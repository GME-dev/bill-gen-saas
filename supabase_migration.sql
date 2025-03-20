-- Start transaction
BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create bike_models table
CREATE TABLE IF NOT EXISTS bike_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    motor_number_prefix TEXT,
    chassis_number_prefix TEXT,
    is_ebicycle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT UNIQUE NOT NULL,
    bill_type TEXT NOT NULL CHECK (bill_type IN ('cash', 'leasing')),
    customer_name TEXT NOT NULL,
    customer_nic TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    model_name TEXT NOT NULL REFERENCES bike_models(model_name),
    motor_number TEXT NOT NULL,
    chassis_number TEXT NOT NULL,
    bike_price DECIMAL(10,2) NOT NULL,
    rmv_charge DECIMAL(10,2),
    is_cpz BOOLEAN DEFAULT FALSE,
    down_payment DECIMAL(10,2),
    is_advance_payment BOOLEAN DEFAULT FALSE,
    advance_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2) NOT NULL,
    balance_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'converted')),
    original_bill_id UUID REFERENCES bills(id),
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bike_models_updated_at
    BEFORE UPDATE ON bike_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert predefined bike models
INSERT INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) 
VALUES
    ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE),
    ('TMR-X01', 219500.00, 'X01', 'X01', TRUE),
    ('TMR-G18', 499500.00, 'G18', 'G18', FALSE),
    ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE),
    ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE),
    ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE),
    ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE),
    ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE)
ON CONFLICT (model_name) DO NOTHING;

-- Create RLS policies
ALTER TABLE bike_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON bike_models
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON bills
    FOR ALL USING (auth.role() = 'authenticated');

-- Create view for bill summaries
CREATE OR REPLACE VIEW bill_summaries AS
SELECT 
    b.id,
    b.bill_number,
    b.bill_type,
    b.customer_name,
    b.model_name,
    bm.is_ebicycle,
    b.bike_price,
    b.rmv_charge,
    b.is_cpz,
    b.down_payment,
    b.is_advance_payment,
    b.advance_amount,
    b.total_amount,
    b.balance_amount,
    b.status,
    b.bill_date
FROM bills b
JOIN bike_models bm ON b.model_name = bm.model_name;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_customer_nic ON bills(customer_nic);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON bills(bill_type);

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