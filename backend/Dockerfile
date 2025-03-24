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

# Create simplified pdfService.js with basic functionality
RUN printf 'const PDFDocument = require("pdfkit");\n\
const logger = require("../utils/logger");\n\
\n\
// Helper function to safely convert to string\n\
const safeToString = (val) => {\n\
  if (val === undefined || val === null) return "";\n\
  return val.toString();\n\
};\n\
\n\
// Format currency in LKR\n\
const formatCurrency = (amount) => {\n\
  return `${Number(amount).toLocaleString("en-LK")}/-`;\n\
};\n\
\n\
// Function to generate PDF from bill data\n\
exports.generatePDF = async (bill) => {\n\
  return new Promise((resolve, reject) => {\n\
    try {\n\
      // Create a new PDF document\n\
      const doc = new PDFDocument({ margin: 50, size: "A4" });\n\
      \n\
      // Create buffer to store PDF\n\
      const buffers = [];\n\
      doc.on("data", buffers.push.bind(buffers));\n\
      doc.on("end", () => {\n\
        const pdfData = Buffer.concat(buffers);\n\
        resolve(pdfData);\n\
      });\n\
      \n\
      // Header\n\
      doc.fontSize(16).text("TMR TRADING LANKA (PVT) LTD", { align: "center" });\n\
      doc.moveDown(0.5);\n\
      doc.fontSize(12).text("GUNAWARDANA MOTORS, EMBILIPITIYA", { align: "left" });\n\
      doc.text("AUTHORIZED DEALER - EMBILIPITIYA", { align: "left" });\n\
      \n\
      // Bill Number and Date - At the top right\n\
      const billNumber = bill.billNumber || bill.bill_number || "N/A";\n\
      doc.text(`Bill No: ${billNumber}`, 400, 50, { align: "right" });\n\
      \n\
      const today = new Date(bill.serviceDate || bill.date || Date.now());\n\
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;\n\
      doc.text(`Date: ${formattedDate}`, 400, 70, { align: "right" });\n\
      \n\
      // Customer Details\n\
      doc.moveDown(1.5);\n\
      doc.fontSize(11).text("Customer Details:", { underline: true });\n\
      doc.moveDown(0.5);\n\
      doc.text(`Name: ${bill.customerName || bill.customer_name || "N/A"}`);\n\
      doc.text(`NIC: ${bill.customer_nic || "N/A"}`);\n\
      doc.text(`Address: ${bill.customer_address || "N/A"}`);\n\
      \n\
      // Vehicle Details\n\
      doc.moveDown(1);\n\
      doc.text("Vehicle Details:", { underline: true });\n\
      doc.moveDown(0.5);\n\
      doc.text(`Model: ${bill.model_name || "N/A"}`);\n\
      if (bill.engine_number) doc.text(`Motor Number: ${bill.engine_number}`);\n\
      if (bill.chassis_number) doc.text(`Chassis Number: ${bill.chassis_number}`);\n\
      \n\
      // Determine if bike is e-bicycle\n\
      const isEbicycle = bill.is_ebicycle || \n\
                        bill.model_name?.includes("COLA5") || \n\
                        bill.model_name?.includes("X01");\n\
      \n\
      // Payment Details\n\
      doc.moveDown(1);\n\
      doc.text("Payment Details:", { underline: true });\n\
      doc.moveDown(0.5);\n\
      \n\
      // Create payment table\n\
      const tableTop = doc.y;\n\
      const tableLeft = 50;\n\
      const colWidth = 170;\n\
      const amountColWidth = 100;\n\
      const rowHeight = 25;\n\
      \n\
      // Table headers\n\
      doc.rect(tableLeft, tableTop, colWidth + amountColWidth, rowHeight).stroke();\n\
      doc.text("Description", tableLeft + 10, tableTop + 8);\n\
      doc.text("Amount (Rs.)", tableLeft + colWidth + 10, tableTop + 8);\n\
      \n\
      let currentY = tableTop + rowHeight;\n\
      let totalAmount = 0;\n\
      \n\
      // Handle different bill types\n\
      if (bill.bill_type === "leasing") {\n\
        // Leasing bills - only for regular bikes\n\
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);\n\
        const cpzAmount = isEbicycle ? 0 : 13500;\n\
        const downPayment = Number(bill.down_payment || bill.advance || 0);\n\
        \n\
        // Bike Price\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // CPZ Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
          doc.text("CPZ Charge", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(cpzAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // Down Payment\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Down Payment", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(downPayment), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // For leasing, total amount is the down payment\n\
        totalAmount = downPayment;\n\
        \n\
      } else if (bill.advance && Number(bill.advance) > 0) {\n\
        // Advance Payment bill (either for cash or leasing)\n\
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);\n\
        const rmvAmount = isEbicycle ? 0 : (bill.bill_type === "leasing" ? 13500 : 13000);\n\
        const rmvLabel = bill.bill_type === "leasing" ? "CPZ Charge" : "RMV Charge";\n\
        const advanceAmount = Number(bill.advance || 0);\n\
        \n\
        // Bike Price\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // RMV/CPZ Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
          doc.text(rmvLabel, tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // If leasing, show down payment\n\
        let fullAmount = bikePrice + rmvAmount;\n\
        if (bill.bill_type === "leasing" && bill.down_payment) {\n\
          const downPayment = Number(bill.down_payment || 0);\n\
          doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
          doc.text("Down Payment", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(downPayment), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
          fullAmount = downPayment; // For leasing, full amount is down payment\n\
        }\n\
        \n\
        // Advance Amount\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Advance Amount", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(advanceAmount), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // Balance\n\
        const balance = fullAmount - advanceAmount;\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Balance", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(balance), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // For advance payment, total is the full amount\n\
        totalAmount = fullAmount;\n\
        \n\
      } else {\n\
        // Regular Cash bill\n\
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);\n\
        const rmvAmount = isEbicycle ? 0 : 13000;\n\
        \n\
        // Bike Price\n\
        doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // RMV Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
          doc.text("RMV Charge", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // For cash, total amount is bike price + RMV (if applicable)\n\
        totalAmount = bikePrice + rmvAmount;\n\
      }\n\
      \n\
      // Total Amount\n\
      doc.rect(tableLeft, currentY, colWidth + amountColWidth, rowHeight).stroke();\n\
      doc.text("Total Amount", tableLeft + 10, currentY + 8, { bold: true });\n\
      doc.text(formatCurrency(totalAmount), tableLeft + colWidth + 10, currentY + 8, { bold: true });\n\
      \n\
      // Terms and Conditions\n\
      doc.moveDown(2);\n\
      doc.fontSize(10).text("Terms and Conditions:", { underline: true });\n\
      doc.moveDown(0.3);\n\
      doc.text("1. All prices are inclusive of taxes.");\n\
      doc.text("2. Warranty is subject to terms and conditions.");\n\
      doc.text("3. This is a computer-generated bill.");\n\
      doc.text("4. RMV registration will be completed within 30 days.");\n\
      \n\
      // Signature\n\
      doc.moveDown(2);\n\
      doc.text("__________________________", 50, doc.y);\n\
      doc.text("Dealer Signature", 50, doc.y + 5);\n\
      \n\
      doc.text("__________________________", 350, doc.y - 15);\n\
      doc.text("Rubber Stamp", 350, doc.y + 5);\n\
      \n\
      // Footer\n\
      doc.moveDown(1);\n\
      doc.fontSize(10).text("Thank you for your business!", { align: "center" });\n\
      \n\
      // Finalize PDF\n\
      doc.end();\n\
    } catch (error) {\n\
      logger.error(`Error generating PDF: ${error.message}`);\n\
      reject(error);\n\
    }\n\
  });\n\
};' > src/services/pdfService.js

# Create BikeModel schema
RUN printf 'const mongoose = require("mongoose");\n\
\n\
const BikeModelSchema = new mongoose.Schema({\n\
  name: {\n\
    type: String,\n\
    required: [true, "Model name is required"],\n\
    trim: true\n\
  },\n\
  model_name: {\n\
    type: String,\n\
    trim: true\n\
  },\n\
  price: {\n\
    type: Number,\n\
    required: [true, "Price is required"]\n\
  },\n\
  motor_number_prefix: {\n\
    type: String,\n\
    trim: true\n\
  },\n\
  chassis_number_prefix: {\n\
    type: String,\n\
    trim: true\n\
  },\n\
  is_ebicycle: {\n\
    type: Boolean,\n\
    default: false\n\
  },\n\
  can_be_leased: {\n\
    type: Boolean,\n\
    default: true\n\
  }\n\
}, {\n\
  timestamps: true,\n\
  versionKey: false,\n\
  collection: "bike_models", // Set the collection name explicitly\n\
  toJSON: {\n\
    virtuals: true,\n\
    transform: function(doc, ret) {\n\
      ret.id = ret._id;\n\
      ret.model_name = ret.name; // Map name to model_name for frontend compatibility\n\
      delete ret._id;\n\
      delete ret.__v;\n\
      return ret;\n\
    }\n\
  }\n\
});\n\
\n\
// Add middleware to sync name and model_name fields\n\
BikeModelSchema.pre("save", function(next) {\n\
  if (this.isModified("name")) {\n\
    this.model_name = this.name;\n\
  } else if (this.isModified("model_name")) {\n\
    this.name = this.model_name;\n\
  }\n\
  next();\n\
});\n\
\n\
module.exports = mongoose.model("BikeModel", BikeModelSchema);\n\
' > src/models/BikeModel.js

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
  bill_number: String,  // Alternative field for compatibility\n\
  bill_type: { \n\
    type: String,\n\
    enum: ["cash", "card", "online", "leasing", "pending"],\n\
    default: "cash"\n\
  },\n\
  status: {\n\
    type: String,\n\
    enum: ["pending", "paid", "cancelled", "completed", "leasing"],\n\
    default: "pending"\n\
  },\n\
  customerName: {\n\
    type: String,\n\
    required: true\n\
  },\n\
  customer_name: String,  // Alternative field for compatibility\n\
  customerPhone: {\n\
    type: String,\n\
    required: true\n\
  },\n\
  customer_phone: String,  // Alternative field for compatibility\n\
  customer_nic: String,    // Additional field for NIC\n\
  customer_address: String, // Additional field for address\n\
  bikeInfo: BikeInfoSchema,\n\
  model_name: String,       // For bike model reference\n\
  chassis_number: String,   // For bike identification\n\
  engine_number: String,    // For bike identification\n\
  bike_price: Number,       // Price of the bike only\n\
  is_ebicycle: Boolean,     // Whether this is an e-bicycle\n\
  rmv_charge: Number,       // RMV charge for regular bikes (13,000)\n\
  cpz_charge: Number,       // CPZ charge for leasing bikes (13,500)\n\
  down_payment: Number,     // Down payment for leasing\n\
  advance: Number,          // Advance payment amount\n\
  serviceDate: {\n\
    type: Date,\n\
    required: true,\n\
    default: Date.now\n\
  },\n\
  date: Date,               // Alternative date field\n\
  items: [BillItemSchema],\n\
  subtotal: {\n\
    type: Number,\n\
    required: true\n\
  },\n\
  subTotal: Number,         // Alternative subtotal field\n\
  tax: {\n\
    type: Number,\n\
    required: true,\n\
    default: 0\n\
  },\n\
  total: {\n\
    type: Number,\n\
    required: true\n\
  },\n\
  amount: Number,           // Alternative total field\n\
  isPaid: {\n\
    type: Boolean,\n\
    default: false\n\
  },\n\
  paid: Boolean,            // Alternative paid field\n\
  paymentMethod: {\n\
    type: String,\n\
    enum: ["cash", "card", "online", "leasing", "pending"],\n\
    default: "pending"\n\
  },\n\
  notes: {\n\
    type: String\n\
  },\n\
  remarks: String           // Alternative notes field\n\
}, {\n\
  timestamps: true,\n\
  strict: false  // Allow additional fields not in schema\n\
});\n\
\n\
// Auto-generate bill number before saving\n\
BillSchema.pre("save", async function(next) {\n\
  try {\n\
    if (this.isNew && !this.billNumber && !this.bill_number) {\n\
      const today = new Date();\n\
      const year = today.getFullYear().toString().substr(-2);\n\
      const month = (today.getMonth() + 1).toString().padStart(2, "0");\n\
      \n\
      const count = await mongoose.model("Bill").countDocuments();\n\
      this.billNumber = `TMR-${year}-${month}-${(count + 1).toString().padStart(4, "0")}`;\n\
      \n\
      // Set the alternative field for compatibility\n\
      if (!this.bill_number) {\n\
        this.bill_number = this.billNumber;\n\
      }\n\
    }\n\
    next();\n\
  } catch (error) {\n\
    next(error);\n\
  }\n\
});\n\
\n\
module.exports = mongoose.model("Bill", BillSchema);' > src/models/Bill.js

# Create server.js without sample data
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
    await mongoose.connect(MONGODB_URI);\n\
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
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",\n\
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],\n\
  allowedHeaders: ["Content-Type", "Authorization"],\n\
  credentials: true\n\
}));\n\
\n\
// Disable caching for all routes\n\
app.use((req, res, next) => {\n\
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");\n\
  next();\n\
});\n\
\n\
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
// Bike Models routes with enhanced logging\n\
app.get("/api/bike-models", async (req, res) => {\n\
  try {\n\
    const bikeModels = await BikeModel.find().sort({ name: 1 });\n\
    logger.info(`Found ${bikeModels.length} bike models:`, bikeModels);\n\
    res.status(200).json(bikeModels);\n\
  } catch (error) {\n\
    logger.error(`Error fetching bike models: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
app.get("/api/bike-models/:id", async (req, res) => {\n\
  try {\n\
    const bikeModel = await BikeModel.findById(req.params.id);\n\
    if (!bikeModel) {\n\
      return res.status(404).json({ error: "Bike model not found" });\n\
    }\n\
    res.status(200).json(bikeModel);\n\
  } catch (error) {\n\
    logger.error(`Error fetching bike model by ID: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
app.post("/api/bike-models", async (req, res) => {\n\
  try {\n\
    const { name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle, can_be_leased } = req.body;\n\
    const bikeModel = await BikeModel.create({\n\
      name,\n\
      price,\n\
      motor_number_prefix,\n\
      chassis_number_prefix,\n\
      is_ebicycle,\n\
      can_be_leased\n\
    });\n\
    res.status(201).json(bikeModel);\n\
  } catch (error) {\n\
    if (error.name === "ValidationError") {\n\
      const messages = Object.values(error.errors).map(err => err.message);\n\
      return res.status(400).json({ error: `Validation error: ${messages.join(", ")}` });\n\
    }\n\
    if (error.code === 11000) {\n\
      return res.status(400).json({ error: "Bike model with this name already exists" });\n\
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
    // Handle preview mode if requested\n\
    const isPreview = req.query.preview === "true";\n\
    const disposition = isPreview ? "inline" : "attachment";\n\
    \n\
    res.setHeader("Content-Type", "application/pdf");\n\
    res.setHeader("Content-Disposition", `${disposition}; filename=TMR_Bill_${bill.billNumber || bill.bill_number}.pdf`);\n\
    res.status(200).send(pdfBuffer);\n\
  } catch (error) {\n\
    logger.error(`Error generating PDF: ${error.message}`);\n\
    res.status(500).json({ error: error.message });\n\
  }\n\
});\n\
\n\
app.post("/api/bills", async (req, res) => {\n\
  try {\n\
    let billData = req.body;\n\
    
    // Determine if bike is e-bicycle
    const isEbicycle = billData.is_ebicycle || 
                      billData.model_name?.includes("COLA5") || 
                      billData.model_name?.includes("X01");
    
    // Set bike price
    const bikePrice = Number(billData.bike_price || billData.price || billData.subtotal || 0);
    
    // Calculate RMV/CPZ charges
    const rmvCharge = isEbicycle ? 0 : 13000;
    const cpzCharge = isEbicycle ? 0 : 13500;
    
    // Handle different bill types
    if (billData.bill_type === "leasing") {
      // For leasing, total is down payment
      const downPayment = Number(billData.down_payment || 0);
      
      billData = {
        ...billData,
        is_ebicycle: isEbicycle,
        bike_price: bikePrice,
        cpz_charge: cpzCharge,
        down_payment: downPayment,
        subtotal: bikePrice,
        total: downPayment, // For leasing, total is the down payment
        customerPhone: billData.customer_phone || billData.customer_nic || "",
        customerName: billData.customer_name || billData.customerName || "",
        isPaid: false,
        status: "leasing",
        paymentMethod: "leasing"
      };
      
    } else if (billData.advance && Number(billData.advance) > 0) {
      // For advance payment
      const advanceAmount = Number(billData.advance || 0);
      let fullAmount = bikePrice;
      
      if (billData.bill_type === "leasing") {
        // For leasing advance, total is down payment
        const downPayment = Number(billData.down_payment || 0);
        fullAmount = downPayment;
        billData.cpz_charge = cpzCharge;
      } else {
        // For cash advance, total is bike price + RMV
        fullAmount = bikePrice + rmvCharge;
        billData.rmv_charge = rmvCharge;
      }
      
      // Calculate balance
      const balance = fullAmount - advanceAmount;
      
      billData = {
        ...billData,
        is_ebicycle: isEbicycle,
        bike_price: bikePrice,
        advance: advanceAmount,
        subtotal: bikePrice,
        total: fullAmount,
        balance: balance,
        customerPhone: billData.customer_phone || billData.customer_nic || "",
        customerName: billData.customer_name || billData.customerName || "",
        isPaid: false,
        status: "pending"
      };
      
    } else {
      // Regular cash bill
      const totalAmount = bikePrice + (isEbicycle ? 0 : rmvCharge);
      
      billData = {
        ...billData,
        is_ebicycle: isEbicycle,
        bike_price: bikePrice,
        rmv_charge: rmvCharge,
        subtotal: bikePrice,
        total: totalAmount,
        customerPhone: billData.customer_phone || billData.customer_nic || "",
        customerName: billData.customer_name || billData.customerName || "",
        isPaid: billData.bill_type === "cash",
        status: billData.bill_type === "cash" ? "paid" : "pending",
        paymentMethod: billData.bill_type === "cash" ? "cash" : billData.paymentMethod || "pending"
      };
    }
    
    // Get bike model details if not provided
    if (billData.model_name && !billData.bike_price) {
      try {
        const bikeModel = await BikeModel.findOne({ 
          $or: [
            { name: billData.model_name },
            { model_name: billData.model_name }
          ]
        });
        if (bikeModel) {
          billData.bike_price = bikeModel.price;
          billData.is_ebicycle = bikeModel.is_ebicycle;
          
          // Recalculate total
          if (billData.bill_type === "leasing") {
            // No changes needed, total is already set to down payment
          } else if (billData.advance && Number(billData.advance) > 0) {
            if (billData.bill_type === "leasing") {
              // Balance calculation already handled
            } else {
              // Cash with advance
              const rmvCharge = billData.is_ebicycle ? 0 : 13000;
              billData.total = billData.bike_price + rmvCharge;
              billData.balance = billData.total - billData.advance;
            }
          } else {
            // Regular cash bill
            const rmvCharge = billData.is_ebicycle ? 0 : 13000;
            billData.total = billData.bike_price + rmvCharge;
          }
        }
      } catch (error) {
        logger.error(`Error fetching bike model: ${error.message}`);
      }
    }
    
    const newBill = new Bill(billData);
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (error) {
    logger.error(`Error creating bill: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

# Create .env file
RUN printf 'PORT=8080\n\
NODE_ENV=production\n\
MONGODB_URI=mongodb+srv://gunawardhanamotorsembilipitiya:0Mu8lMAFac5hMdcP@bill-gen-cluster.riyvl.mongodb.net/bill-gen?retryWrites=true&w=majority&appName=bill-gen-cluster\n\
CORS_ORIGIN=https://bill-gen-saas.pages.dev,https://web-production-0ed6.up.railway.app' > .env

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