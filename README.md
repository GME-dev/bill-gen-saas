# Bill Generation System

A comprehensive bill generation system for motorcycle sales, supporting both cash and leasing transactions.

## Features

### Bill Types
1. **Cash Bills**
   - Available for all bike models
   - Regular bikes: Total = Bike Price + RMV (13,000)
   - E-bicycles: Total = Bike Price (final price)

2. **Leasing Bills**
   - Not available for e-bicycles
   - Shows: Bike Price, RMV as CPZ (13,500), Down Payment
   - Total Amount = Down Payment

3. **Advance Payment Bills**
   - For Cash Advance:
     * Shows: Bike Price, RMV, Advance Amount
     * Balance = Total Price - Advance Amount
   - For Leasing Advance:
     * Shows: Bike Price, CPZ, Down Payment, Advance Amount
     * Balance = Down Payment - Advance Amount

### Bike Types
1. **E-Bicycles**
   - Models: TMR-COLA5, TMR-X01
   - No RMV charges
   - Cash sales only
   - Price in system is final price

2. **Regular Bikes**
   - All other models
   - RMV charges apply
   - Available for both cash and leasing

## Tech Stack

- Frontend: React with Ant Design
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth

## Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd bill-gen-saas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Run the migrations in `supabase_migration.sql`
   - This will create all necessary tables and insert default bike models

5. Start the development server:
   ```bash
   npm start
   ```

## Database Schema

### bike_models
- `id`: UUID (Primary Key)
- `model_name`: Text (Unique)
- `price`: Decimal
- `motor_number_prefix`: Text
- `chassis_number_prefix`: Text
- `is_ebicycle`: Boolean

### bills
- `id`: UUID (Primary Key)
- `bill_number`: Text (Unique)
- `bill_type`: Text ('cash' or 'leasing')
- `customer_name`: Text
- `customer_nic`: Text
- `customer_address`: Text
- `model_name`: Text (References bike_models)
- Various amount fields and status tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 