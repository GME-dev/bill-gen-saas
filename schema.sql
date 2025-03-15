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
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    is_ebicycle BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO bike_models (name, price, is_ebicycle) 
VALUES 
    ('TMR_COLA5', 450000, TRUE),
    ('TMR_X01', 350000, TRUE);

INSERT OR IGNORE INTO bike_models (name, price, is_ebicycle)
VALUES
    ('Model_A', 550000, FALSE),
    ('Model_B', 650000, FALSE),
    ('Model_C', 750000, FALSE); 