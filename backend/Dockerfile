FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb

# Create logger.js
RUN mkdir -p src/utils
RUN echo 'const logger = {\n  error: (message) => console.error(message),\n  warn: (message) => console.warn(message),\n  info: (message) => console.info(message),\n  http: (message) => console.log(message),\n  debug: (message) => console.debug(message),\n};\n\nmodule.exports = logger;' > src/utils/logger.js

# Create a simple server.js
RUN echo 'require("dotenv").config();\nconst express = require("express");\nconst cors = require("cors");\nconst helmet = require("helmet");\nconst morgan = require("morgan");\nconst logger = require("./utils/logger");\n\n// Initialize express\nconst app = express();\nconst port = process.env.PORT || 8080;\n\n// Apply middlewares\napp.use(helmet()); // Security headers\napp.use(cors({\n  origin: process.env.CORS_ORIGIN || "*",\n  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],\n  allowedHeaders: ["Content-Type", "Authorization"]\n}));\napp.use(express.json()); // Parse JSON bodies\napp.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies\napp.use(morgan("dev", {\n  skip: () => process.env.NODE_ENV === "test",\n  stream: { write: (message) => logger.http(message.trim()) }\n}));\n\n// Health check route\napp.get("/api/health", (req, res) => {\n  res.status(200).json({ status: "ok" });\n});\n\n// API routes\napp.get("/api/bills", (req, res) => {\n  res.status(200).json({ message: "Bills API" });\n});\n\napp.get("/api/bike-models", (req, res) => {\n  res.status(200).json({ message: "Bike Models API" });\n});\n\n// Start server\nconst server = app.listen(port, () => {\n  try {\n    logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`);\n  } catch (error) {\n    logger.error(`Failed to start server: ${error.message}`);\n    setTimeout(() => {\n      process.exit(1);\n    }, 1000);\n  }\n});\n\n// Graceful shutdown\nprocess.on("SIGTERM", () => {\n  logger.info("SIGTERM signal received");\n  server.close(() => {\n    logger.info("HTTP server closed");\n    process.exit(0);\n  });\n});\n\nprocess.on("SIGINT", () => {\n  logger.info("SIGINT signal received");\n  server.close(() => {\n    logger.info("HTTP server closed");\n    process.exit(0);\n  });\n});\n\nmodule.exports = app;' > src/server.js

# Create the .env file
RUN echo "PORT=8080\nNODE_ENV=production\nMONGODB_URI=mongodb+srv://gunawardhanamotorsembilipitiya:0Mu8lMAFac5hMdcP@bill-gen-cluster.riyvl.mongodb.net/bill-gen?retryWrites=true&w=majority&appName=bill-gen-cluster\nCORS_ORIGIN=https://bill-gen-saas.pages.dev" > .env

# Create a templates directory if needed
RUN mkdir -p templates

# Verify files
RUN ls -la
RUN ls -la src
RUN ls -la src/utils
RUN cat src/server.js
RUN cat src/utils/logger.js

# Expose the port the app will run on
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"] 