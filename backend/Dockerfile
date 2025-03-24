FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb

# Create directories
RUN mkdir -p src/utils templates

# Create logger.js
RUN printf 'const logger = {\n\
  error: (message) => console.error(message),\n\
  warn: (message) => console.warn(message),\n\
  info: (message) => console.info(message),\n\
  http: (message) => console.log(message),\n\
  debug: (message) => console.debug(message),\n\
};\n\
\n\
module.exports = logger;' > src/utils/logger.js

# Create server.js
RUN printf 'require("dotenv").config();\n\
const express = require("express");\n\
const cors = require("cors");\n\
const helmet = require("helmet");\n\
const morgan = require("morgan");\n\
const logger = require("./utils/logger");\n\
\n\
// Initialize express\n\
const app = express();\n\
const port = process.env.PORT || 8080;\n\
\n\
// Apply middlewares\n\
app.use(helmet());\n\
app.use(cors({\n\
  origin: process.env.CORS_ORIGIN || "*",\n\
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],\n\
  allowedHeaders: ["Content-Type", "Authorization"]\n\
}));\n\
app.use(express.json());\n\
app.use(express.urlencoded({ extended: true }));\n\
app.use(morgan("dev", {\n\
  skip: () => process.env.NODE_ENV === "test",\n\
  stream: { write: (message) => logger.http(message.trim()) }\n\
}));\n\
\n\
// Health check route\n\
app.get("/api/health", (req, res) => {\n\
  res.status(200).json({ status: "ok" });\n\
});\n\
\n\
// Sample data\n\
const sampleBills = [\n\
  { id: "1", customerName: "John Doe", bikeModel: "Honda CB150R", total: 25000, date: "2023-01-15" },\n\
  { id: "2", customerName: "Jane Smith", bikeModel: "Yamaha R15", total: 18000, date: "2023-02-20" },\n\
  { id: "3", customerName: "Bob Johnson", bikeModel: "Bajaj Pulsar", total: 12000, date: "2023-03-10" }\n\
];\n\
\n\
const sampleBikeModels = [\n\
  { id: "1", name: "Honda CB150R", price: 250000, brand: "Honda" },\n\
  { id: "2", name: "Yamaha R15", price: 180000, brand: "Yamaha" },\n\
  { id: "3", name: "Bajaj Pulsar", price: 120000, brand: "Bajaj" },\n\
  { id: "4", name: "TVS Apache", price: 140000, brand: "TVS" }\n\
];\n\
\n\
// API routes\n\
app.get("/api/bills", (req, res) => {\n\
  res.status(200).json({\n\
    success: true,\n\
    data: sampleBills,\n\
    count: sampleBills.length\n\
  });\n\
});\n\
\n\
app.get("/api/bike-models", (req, res) => {\n\
  res.status(200).json({\n\
    success: true,\n\
    data: sampleBikeModels,\n\
    count: sampleBikeModels.length\n\
  });\n\
});\n\
\n\
// Start server\n\
const server = app.listen(port, () => {\n\
  try {\n\
    logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`);\n\
  } catch (error) {\n\
    logger.error(`Failed to start server: ${error.message}`);\n\
    setTimeout(() => {\n\
      process.exit(1);\n\
    }, 1000);\n\
  }\n\
});\n\
\n\
// Graceful shutdown\n\
process.on("SIGTERM", () => {\n\
  logger.info("SIGTERM signal received");\n\
  server.close(() => {\n\
    logger.info("HTTP server closed");\n\
    process.exit(0);\n\
  });\n\
});\n\
\n\
process.on("SIGINT", () => {\n\
  logger.info("SIGINT signal received");\n\
  server.close(() => {\n\
    logger.info("HTTP server closed");\n\
    process.exit(0);\n\
  });\n\
});\n\
\n\
module.exports = app;' > src/server.js

# Create .env file
RUN printf 'PORT=8080\n\
NODE_ENV=production\n\
MONGODB_URI=mongodb+srv://gunawardhanamotorsembilipitiya:0Mu8lMAFac5hMdcP@bill-gen-cluster.riyvl.mongodb.net/bill-gen?retryWrites=true&w=majority&appName=bill-gen-cluster\n\
CORS_ORIGIN=https://bill-gen-saas.pages.dev' > .env

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