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
- Backend: Express.js
- Database: MongoDB Atlas
- Deployment: Cloudflare Pages (Frontend) and Railway (Backend)

## Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd bill-gen-saas
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Create environment files:
   - Frontend `.env`:
     ```env
     VITE_API_URL=your_backend_api_url
     ```
   - Backend `.env`:
     ```env
     MONGODB_URI=your_mongodb_atlas_connection_string
     MONGODB_DB_NAME=bill-gen
     CORS_ORIGIN=your_frontend_url
     ```

4. Set up the database:
   - Run the migration script to initialize MongoDB collections:
     ```bash
     cd backend
     node scripts/migrate-to-mongodb.js
     ```

5. Start development servers:
   ```bash
   # Start backend
   cd backend
   npm run dev
   
   # Start frontend (in a separate terminal)
   cd frontend
   npm run dev
   ```

## Database Schema

### bike_models (MongoDB Collection)
- `_id`: ObjectId (Primary Key)
- `name`: String (Unique)
- `price`: Number
- `is_ebicycle`: Boolean
- `can_be_leased`: Boolean
- `created_at`: Date
- `updated_at`: Date

### bills (MongoDB Collection)
- `_id`: ObjectId (Primary Key)
- `bill_number`: String (Unique)
- `bill_type`: String ('cash' or 'leasing')
- `customer_name`: String
- `customer_nic`: String
- `customer_address`: String
- `model_name`: String (References bike_models.name)
- Various amount fields and status tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 