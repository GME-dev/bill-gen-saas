FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb pdfkit fs-extra

# Create directories
RUN mkdir -p src/utils src/models src/services templates

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

# Create pdfService.js for PDF generation
RUN printf 'const PDFDocument = require("pdfkit");\n\
const fs = require("fs-extra");\n\
const path = require("path");\n\
const logger = require("../utils/logger");\n\
\n\
// Function to generate PDF from bill data\n\
exports.generatePDF = async (bill) => {\n\
  return new Promise((resolve, reject) => {\n\
    try {\n\
      // Create a new PDF document\n\
      const doc = new PDFDocument({ margin: 50 });\n\
      \n\
      // Create buffer to store PDF\n\
      const buffers = [];\n\
      doc.on("data", buffers.push.bind(buffers));\n\
      doc.on("end", () => {\n\
        const pdfData = Buffer.concat(buffers);\n\
        resolve(pdfData);\n\
      });\n\
      \n\
      // Add content to PDF\n\
      // Header\n\
      doc.fontSize(20).text("GUNAWARDHANA MOTORS", { align: "center" });\n\
      doc.fontSize(14).text("EMBILIPITIYA", { align: "center" });\n\
      doc.moveDown();\n\
      doc.fontSize(16).text(`Invoice: ${bill.billNumber}`, { align: "center" });\n\
      doc.moveDown();\n\
      \n\
      // Customer Information\n\
      doc.fontSize(12).text(`Date: ${new Date(bill.serviceDate).toLocaleDateString()}`);\n\
      doc.text(`Customer: ${bill.customerName}`);\n\
      doc.text(`Phone: ${bill.customerPhone}`);\n\
      doc.moveDown();\n\
      \n\
      // Bike Information\n\
      if (bill.bikeInfo) {\n\
        doc.text(`Bike: ${bill.bikeInfo.make} ${bill.bikeInfo.model}`);\n\
        doc.text(`Registration Number: ${bill.bikeInfo.regNumber}`);\n\
      }\n\
      doc.moveDown();\n\
      \n\
      // Items Table Headers\n\
      doc.font("Helvetica-Bold");\n\
      const tableTop = doc.y;\n\
      doc.text("Description", 50, tableTop);\n\
      doc.text("Qty", 280, tableTop, { width: 40, align: "right" });\n\
      doc.text("Rate", 330, tableTop, { width: 70, align: "right" });\n\
      doc.text("Amount", 430, tableTop, { width: 70, align: "right" });\n\
      doc.moveDown();\n\
      \n\
      // Items\n\
      doc.font("Helvetica");\n\
      let itemY = doc.y;\n\
      \n\
      if (bill.items && bill.items.length > 0) {\n\
        bill.items.forEach(item => {\n\
          doc.text(item.description, 50, itemY);\n\
          doc.text(item.quantity.toString(), 280, itemY, { width: 40, align: "right" });\n\
          doc.text(item.rate.toString(), 330, itemY, { width: 70, align: "right" });\n\
          doc.text(item.amount.toString(), 430, itemY, { width: 70, align: "right" });\n\
          itemY = doc.y + 15;\n\
          doc.y = itemY;\n\
        });\n\
      } else {\n\
        doc.text("No items", 50, itemY);\n\
      }\n\
      \n\
      doc.moveDown();\n\
      \n\
      // Totals\n\
      const totalsY = doc.y + 10;\n\
      doc.text("Subtotal:", 330, totalsY, { width: 70, align: "right" });\n\
      doc.text(bill.subtotal.toString(), 430, totalsY, { width: 70, align: "right" });\n\
      \n\
      doc.text("Tax:", 330, totalsY + 20, { width: 70, align: "right" });\n\
      doc.text(bill.tax.toString(), 430, totalsY + 20, { width: 70, align: "right" });\n\
      \n\
      doc.font("Helvetica-Bold");\n\
      doc.text("Total:", 330, totalsY + 40, { width: 70, align: "right" });\n\
      doc.text(bill.total.toString(), 430, totalsY + 40, { width: 70, align: "right" });\n\
      \n\
      // Payment Status\n\
      doc.moveDown(2);\n\
      doc.font("Helvetica");\n\
      doc.text(`Payment Status: ${bill.isPaid ? "Paid" : "Unpaid"}`);\n\
      if (bill.isPaid) {\n\
        doc.text(`Payment Method: ${bill.paymentMethod}`);\n\
      }\n\
      \n\
      // Notes\n\
      if (bill.notes) {\n\
        doc.moveDown();\n\
        doc.text("Notes:");\n\
        doc.text(bill.notes);\n\
      }\n\
      \n\
      // Footer\n\
      doc.moveDown(2);\n\
      doc.fontSize(10).text("Thank you for your business!", { align: "center" });\n\
      doc.text("Gunawardhana Motors, Embilipitiya | Tel: 047-1234567", { align: "center" });\n\
      \n\
      // Finalize the PDF\n\
      doc.end();\n\
    } catch (error) {\n\
      logger.error(`Error generating PDF: ${error.message}`);\n\
      reject(error);\n\
    }\n\
  });\n\
};' > src/services/pdfService.js

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
const { generatePDF } = require("./services/pdfService");\n\
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
// Get bill by ID\n\
app.get("/api/bills/:id", async (req, res) => {\n\
  try {\n\
    const bill = await Bill.findById(req.params.id);\n\
    if (!bill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    res.status(200).json(bill);\n\
  } catch (error) {\n\
    logger.error(`Error fetching bill by ID: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Generate PDF for a bill\n\
app.get("/api/bills/:id/pdf", async (req, res) => {\n\
  try {\n\
    const bill = await Bill.findById(req.params.id);\n\
    if (!bill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    \n\
    const pdfBuffer = await generatePDF(bill);\n\
    \n\
    res.setHeader("Content-Type", "application/pdf");\n\
    res.setHeader("Content-Disposition", `attachment; filename=TMR_Bill_${bill.billNumber}.pdf`);\n\
    res.status(200).send(pdfBuffer);\n\
  } catch (error) {\n\
    logger.error(`Error generating PDF: ${error.message}`);\n\
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
// Update bill\n\
app.put("/api/bills/:id", async (req, res) => {\n\
  try {\n\
    // Calculate or validate totals if items are updated\n\
    let updateData = req.body;\n\
    \n\
    if (req.body.items) {\n\
      const subtotal = req.body.items.reduce(\n\
        (sum, item) => sum + Number(item.amount),\n\
        0\n\
      );\n\
      const total = subtotal + Number(req.body.tax || 0);\n\
      \n\
      updateData = {\n\
        ...updateData,\n\
        subtotal,\n\
        total\n\
      };\n\
    }\n\
    \n\
    const updatedBill = await Bill.findByIdAndUpdate(\n\
      req.params.id,\n\
      updateData,\n\
      { new: true, runValidators: true }\n\
    );\n\
    \n\
    if (!updatedBill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    \n\
    res.status(200).json(updatedBill);\n\
  } catch (error) {\n\
    logger.error(`Error updating bill: ${error.message}`);\n\
    res.status(400).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Delete bill\n\
app.delete("/api/bills/:id", async (req, res) => {\n\
  try {\n\
    const bill = await Bill.findByIdAndDelete(req.params.id);\n\
    if (!bill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    res.status(200).json({ message: "Bill deleted successfully" });\n\
  } catch (error) {\n\
    logger.error(`Error deleting bill: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Mark bill as paid\n\
app.patch("/api/bills/:id/pay", async (req, res) => {\n\
  try {\n\
    const { paymentMethod } = req.body;\n\
    if (!paymentMethod) {\n\
      return res.status(400).json({ error: "Payment method is required" });\n\
    }\n\
    \n\
    const updatedBill = await Bill.findByIdAndUpdate(\n\
      req.params.id,\n\
      { \n\
        isPaid: true, \n\
        paymentMethod \n\
      },\n\
      { new: true }\n\
    );\n\
    \n\
    if (!updatedBill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    \n\
    res.status(200).json(updatedBill);\n\
  } catch (error) {\n\
    logger.error(`Error marking bill as paid: ${error.message}`);\n\
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
RUN ls -la src/services
RUN cat src/server.js
RUN cat src/models/BikeModel.js
RUN cat src/models/Bill.js
RUN cat src/utils/logger.js
RUN cat src/services/pdfService.js

# Expose the port the app will run on
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"] 