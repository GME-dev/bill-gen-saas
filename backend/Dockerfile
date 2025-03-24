FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb

# Create directories
RUN mkdir -p src/utils src/models templates

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

# Create BikeModel.js
RUN printf 'const mongoose = require("mongoose");\n\
\n\
const BikeModelSchema = new mongoose.Schema({\n\
  make: {\n\
    type: String,\n\
    required: [true, "Make is required"],\n\
    trim: true\n\
  },\n\
  bikeModel: {\n\
    type: String,\n\
    required: [true, "Model is required"],\n\
    trim: true\n\
  },\n\
  year: {\n\
    type: Number,\n\
    required: [true, "Year is required"],\n\
    min: [1900, "Year must be at least 1900"],\n\
    max: [new Date().getFullYear() + 1, "Year cannot be in the future"]\n\
  }\n\
}, {\n\
  timestamps: true,\n\
  versionKey: false\n\
});\n\
\n\
// Create a compound index for performance\n\
BikeModelSchema.index({ make: 1, bikeModel: 1, year: 1 }, { unique: true });\n\
\n\
// Create text indexes for search\n\
BikeModelSchema.index({ make: "text", bikeModel: "text" });\n\
\n\
module.exports = mongoose.model("BikeModel", BikeModelSchema);' > src/models/BikeModel.js

# Create Bill.js
RUN printf 'const mongoose = require("mongoose");\n\
\n\
// Define schema for items in bill\n\
const BillItemSchema = new mongoose.Schema({\n\
  description: { type: String, required: true },\n\
  quantity: { type: Number, required: true, default: 1 },\n\
  rate: { type: Number, required: true },\n\
  amount: { type: Number, required: true }\n\
});\n\
\n\
// Define schema for bike info\n\
const BikeInfoSchema = new mongoose.Schema({\n\
  make: { type: String, required: true },\n\
  model: { type: String, required: true },\n\
  regNumber: { type: String, required: true }\n\
});\n\
\n\
const BillSchema = new mongoose.Schema({\n\
  billNumber: {\n\
    type: String,\n\
    required: true,\n\
    unique: true\n\
  },\n\
  customerName: {\n\
    type: String,\n\
    required: true\n\
  },\n\
  customerPhone: {\n\
    type: String,\n\
    required: true\n\
  },\n\
  bikeInfo: BikeInfoSchema,\n\
  serviceDate: {\n\
    type: Date,\n\
    required: true,\n\
    default: Date.now\n\
  },\n\
  items: [BillItemSchema],\n\
  subtotal: {\n\
    type: Number,\n\
    required: true\n\
  },\n\
  tax: {\n\
    type: Number,\n\
    required: true,\n\
    default: 0\n\
  },\n\
  total: {\n\
    type: Number,\n\
    required: true\n\
  },\n\
  isPaid: {\n\
    type: Boolean,\n\
    default: false\n\
  },\n\
  paymentMethod: {\n\
    type: String,\n\
    enum: ["cash", "card", "online", "pending"],\n\
    default: "pending"\n\
  },\n\
  notes: {\n\
    type: String\n\
  }\n\
}, {\n\
  timestamps: true\n\
});\n\
\n\
// Auto-generate bill number before saving\n\
BillSchema.pre("save", async function(next) {\n\
  if (this.isNew) {\n\
    const count = await mongoose.model("Bill").countDocuments();\n\
    this.billNumber = `TMR${(count + 1).toString().padStart(4, "0")}`;\n\
  }\n\
  next();\n\
});\n\
\n\
module.exports = mongoose.model("Bill", BillSchema);' > src/models/Bill.js

# Create server.js
RUN printf 'require("dotenv").config();\n\
const express = require("express");\n\
const cors = require("cors");\n\
const helmet = require("helmet");\n\
const morgan = require("morgan");\n\
const mongoose = require("mongoose");\n\
const logger = require("./utils/logger");\n\
const BikeModel = require("./models/BikeModel");\n\
const Bill = require("./models/Bill");\n\
\n\
// MongoDB connection\n\
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tmr-bill-generator";\n\
\n\
const connectToDatabase = async () => {\n\
  try {\n\
    await mongoose.connect(MONGODB_URI, {\n\
      useNewUrlParser: true,\n\
      useUnifiedTopology: true,\n\
    });\n\
    logger.info("Connected to MongoDB successfully");\n\
    return mongoose;\n\
  } catch (error) {\n\
    logger.error(`MongoDB connection error: ${error.message}`);\n\
    throw error;\n\
  }\n\
};\n\
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
// Bike Models routes\n\
app.get("/api/bike-models", async (req, res) => {\n\
  try {\n\
    const bikeModels = await BikeModel.find().sort({ make: 1, bikeModel: 1 });\n\
    res.status(200).json(bikeModels);\n\
  } catch (error) {\n\
    logger.error(`Error fetching bike models: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
app.post("/api/bike-models", async (req, res) => {\n\
  try {\n\
    const { make, model, year } = req.body;\n\
    const bikeModel = await BikeModel.create({\n\
      make,\n\
      bikeModel: model,\n\
      year: parseInt(year)\n\
    });\n\
    res.status(201).json(bikeModel);\n\
  } catch (error) {\n\
    if (error.name === "ValidationError") {\n\
      const messages = Object.values(error.errors).map(err => err.message);\n\
      return res.status(400).json({ error: `Validation error: ${messages.join(", ")}` });\n\
    }\n\
    if (error.code === 11000) {\n\
      return res.status(400).json({ error: "Bike model with this make, model, and year already exists" });\n\
    }\n\
    logger.error(`Error creating bike model: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Bill routes\n\
app.get("/api/bills", async (req, res) => {\n\
  try {\n\
    const bills = await Bill.find().sort({ createdAt: -1 });\n\
    res.status(200).json(bills);\n\
  } catch (error) {\n\
    logger.error(`Error fetching bills: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
app.post("/api/bills", async (req, res) => {\n\
  try {\n\
    // Calculate or validate totals\n\
    const { items, tax } = req.body;\n\
    \n\
    // Calculate subtotal\n\
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);\n\
    \n\
    // Calculate total\n\
    const total = subtotal + Number(tax || 0);\n\
    \n\
    // Create bill with calculated values\n\
    const billData = {\n\
      ...req.body,\n\
      subtotal,\n\
      total\n\
    };\n\
    \n\
    const newBill = new Bill(billData);\n\
    const savedBill = await newBill.save();\n\
    res.status(201).json(savedBill);\n\
  } catch (error) {\n\
    logger.error(`Error creating bill: ${error.message}`);\n\
    res.status(400).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Start server\n\
const server = app.listen(port, async () => {\n\
  try {\n\
    // Connect to database\n\
    await connectToDatabase();\n\
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
    mongoose.connection.close();\n\
    process.exit(0);\n\
  });\n\
});\n\
\n\
process.on("SIGINT", () => {\n\
  logger.info("SIGINT signal received");\n\
  server.close(() => {\n\
    logger.info("HTTP server closed");\n\
    mongoose.connection.close();\n\
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
RUN ls -la src/models
RUN cat src/server.js
RUN cat src/models/BikeModel.js
RUN cat src/models/Bill.js
RUN cat src/utils/logger.js

# Expose the port the app will run on
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"] 