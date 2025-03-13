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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 