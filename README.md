# Electric Scooter Bill Generator

A web application for generating and managing electric scooter bills, supporting both cash sales and leasing options.

## Features

- Create and manage bills for electric scooter sales
- Support for both cash sales and leasing options
- Automatic price calculation based on bike model
- PDF bill generation with professional layout
- Bill preview and download functionality
- Secure bill storage and management

## Tech Stack

- **Frontend**: React.js with Vite, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **PDF Generation**: pdf-lib

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd electric-scooter-bill-generator
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# In backend directory
cp .env.example .env
```

4. Start the development servers:
```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend server (from frontend directory)
npm run dev
```

## Usage

1. Access the application at `http://localhost:5173`
2. Create new bills using the "New Bill" button
3. View and manage bills in the bill list
4. Preview or download bills as PDFs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 