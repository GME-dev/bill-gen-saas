CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_nic TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    model_name TEXT NOT NULL,
    motor_number TEXT NOT NULL,
    chassis_number TEXT NOT NULL,
    bike_price DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2),
    bill_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    balance_amount DECIMAL(10,2),
    original_bill_id INTEGER,
    estimated_delivery_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bike_models (
    id SERIAL PRIMARY KEY,
    model_name TEXT NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    motor_number_prefix TEXT,
    chassis_number_prefix TEXT,
    is_ebicycle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add predefined bike models with is_ebicycle flag
INSERT INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) 
VALUES
    ('TMR-G18', 499500.00, 'G18', 'G18', FALSE),
    ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE),
    ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE),
    ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE),
    ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE),
    ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE),
    ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE),
    ('TMR-X01', 219500.00, 'X01', 'X01', TRUE)
ON CONFLICT (model_name) DO NOTHING;

-- Sample additional models
INSERT OR IGNORE INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) VALUES
    ('Model_A', 550000, NULL, NULL, FALSE),
    ('Model_B', 650000, NULL, NULL, FALSE),
    ('Model_C', 750000, NULL, NULL, FALSE); 