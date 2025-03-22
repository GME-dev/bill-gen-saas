# Bill Generation SaaS - Project Structure

```
bill-gen-saas/
├── backend/
│   ├── src/
│   │   ├── routes/           # API routes
│   │   │   ├── bills.js
│   │   │   ├── branding.js
│   │   │   └── bike-models.js
│   │   ├── controllers/      # Route controllers
│   │   │   ├── billController.js
│   │   │   └── brandingController.js
│   │   ├── models/          # Data models
│   │   │   └── bill.js
│   │   ├── utils/           # Utility functions
│   │   │   ├── database.js
│   │   │   ├── pdfGenerator.js
│   │   │   └── logger.js
│   │   ├── middleware/      # Custom middleware
│   │   │   └── auth.js
│   │   ├── config/         # Configuration files
│   │   │   └── database.js
│   │   ├── app.js          # Express app setup
│   │   └── index.js        # Application entry point
│   ├── templates/          # PDF and document templates
│   ├── tests/             # Backend tests
│   ├── package.json       # Backend dependencies
│   └── .env              # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Frontend utilities
│   │   ├── config/       # Frontend configuration
│   │   ├── assets/       # Static assets
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/           # Public assets
│   ├── package.json      # Frontend dependencies
│   └── .env             # Frontend environment variables
│
├── docker/              # Docker configuration
│   ├── backend/
│   │   └── Dockerfile
│   └── frontend/
│       └── Dockerfile
│
├── .github/            # GitHub configuration
├── .gitignore
├── docker-compose.yml
├── railway.json
└── README.md
```

## Key Changes

1. Separated backend and frontend into distinct directories
2. Organized backend code into MVC pattern
3. Moved all backend-related files to the backend directory
4. Moved all frontend-related files to the frontend directory
5. Added proper configuration directories
6. Added Docker configuration directory
7. Added proper test directories

## Migration Steps

1. Move all backend files from `src/` to `backend/src/`
2. Move all frontend files to `frontend/src/`
3. Update import paths in all files
4. Update package.json files
5. Update Docker configuration
6. Update deployment configuration