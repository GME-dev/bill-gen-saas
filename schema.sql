CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_nic TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    model_name TEXT NOT NULL,
    motor_number TEXT NOT NULL,
    chassis_number TEXT NOT NULL,
    bike_price REAL NOT NULL,
    down_payment REAL,
    bill_date TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    balance_amount REAL,
    original_bill_id INTEGER,
    estimated_delivery_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bike_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    motor_number_prefix TEXT,
    chassis_number_prefix TEXT,
    is_ebicycle BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add predefined bike models with is_ebicycle flag
INSERT OR IGNORE INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) VALUES
    ('TMR-G18', 499500.00, 'G18', 'G18', FALSE),
    ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE),
    ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE),
    ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE),
    ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE),
    ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE),
    ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE),
    ('TMR-X01', 219500.00, 'X01', 'X01', TRUE);

-- Sample additional models
INSERT OR IGNORE INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) VALUES
    ('Model_A', 550000, NULL, NULL, FALSE),
    ('Model_B', 650000, NULL, NULL, FALSE),
    ('Model_C', 750000, NULL, NULL, FALSE); 