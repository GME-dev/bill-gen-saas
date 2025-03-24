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
      // Header\n\
      doc.fontSize(20).text("GUNAWARDHANA MOTORS", { align: "center" });\n\
      doc.fontSize(14).text("EMBILIPITIYA", { align: "center" });\n\
      doc.fontSize(10).text("070 3131 899", { align: "center" });\n\
      doc.moveDown();\n\
      \n\
      // Invoice\n\
      doc.fontSize(16).text(`Invoice: ${bill.billNumber || bill.bill_number || "N/A"}`, { align: "center" });\n\
      doc.moveDown();\n\
      \n\
      // Customer Info\n\
      doc.fontSize(12).text(`Date: ${new Date(bill.serviceDate || bill.date || Date.now()).toLocaleDateString()}`);\n\
      doc.text(`Customer: ${bill.customerName || bill.customer_name || "N/A"}`);\n\
      doc.text(`Phone: ${bill.customerPhone || bill.customer_phone || bill.customer_nic || "N/A"}`);\n\
      if (bill.customer_address) {\n\
        doc.text(`Address: ${bill.customer_address}`);\n\
      }\n\
      \n\
      // Bike Info\n\
      doc.moveDown();\n\
      if (bill.model_name) {\n\
        doc.text(`Bike: ${bill.model_name || "N/A"}`);\n\
        if (bill.chassis_number) doc.text(`Chassis Number: ${bill.chassis_number}`);\n\
        if (bill.engine_number) doc.text(`Engine Number: ${bill.engine_number}`);\n\
      } else if (bill.bikeInfo) {\n\
        doc.text(`Bike: ${bill.bikeInfo.make || ""} ${bill.bikeInfo.model || ""}`);\n\
        doc.text(`Registration Number: ${bill.bikeInfo.regNumber || "N/A"}`);\n\
      }\n\
      \n\
      // Items Table\n\
      doc.moveDown();\n\
      doc.text("Description", 50, doc.y);\n\
      doc.text("Qty", 300, doc.y, { width: 40, align: "center" });\n\
      doc.text("Price", 350, doc.y, { width: 70, align: "right" });\n\
      doc.text("Amount", 450, doc.y, { width: 70, align: "right" });\n\
      \n\
      doc.moveDown();\n\
      let y = doc.y;\n\
      \n\
      // Items\n\
      if (bill.items && bill.items.length > 0) {\n\
        bill.items.forEach(item => {\n\
          doc.text(item.description || "Item", 50, y);\n\
          doc.text(safeToString(item.quantity || 1), 300, y, { width: 40, align: "center" });\n\
          doc.text(safeToString(item.rate || item.price || 0), 350, y, { width: 70, align: "right" });\n\
          doc.text(safeToString(item.amount || item.total || 0), 450, y, { width: 70, align: "right" });\n\
          y = doc.y + 15;\n\
          doc.y = y;\n\
        });\n\
      } else {\n\
        doc.text("Total Amount", 50, y);\n\
        doc.text("1", 300, y, { width: 40, align: "center" });\n\
        doc.text("", 350, y, { width: 70, align: "right" });\n\
        doc.text(safeToString(bill.total || bill.amount || 0), 450, y, { width: 70, align: "right" });\n\
      }\n\
      \n\
      // Totals\n\
      doc.moveDown();\n\
      doc.text("Subtotal:", 350, doc.y, { width: 70, align: "right" });\n\
      doc.text(safeToString(bill.subtotal || bill.subTotal || bill.total || 0), 450, doc.y, { width: 70, align: "right" });\n\
      \n\
      doc.text("Tax:", 350, doc.y + 20, { width: 70, align: "right" });\n\
      doc.text(safeToString(bill.tax || 0), 450, doc.y + 20, { width: 70, align: "right" });\n\
      \n\
      doc.text("Total:", 350, doc.y + 40, { width: 70, align: "right" });\n\
      doc.text(safeToString(bill.total || bill.amount || 0) + " LKR", 450, doc.y + 40, { width: 70, align: "right" });\n\
      \n\
      // Payment Info\n\
      doc.moveDown(2);\n\
      let status = "Unpaid";\n\
      if (bill.isPaid || bill.paid || bill.status === "paid") {\n\
        status = "Paid";\n\
      } else if (bill.status) {\n\
        status = bill.status.charAt(0).toUpperCase() + bill.status.slice(1);\n\
      }\n\
      doc.text(`Payment Status: ${status}`);\n\
      \n\
      if (bill.isPaid || bill.paid) {\n\
        doc.text(`Payment Method: ${bill.paymentMethod || bill.bill_type || "N/A"}`);\n\
      } else if (bill.bill_type) {\n\
        doc.text(`Bill Type: ${bill.bill_type}`);\n\
      }\n\
      \n\
      // Notes\n\
      if (bill.notes || bill.remarks) {\n\
        doc.moveDown();\n\
        doc.text("Notes:");\n\
        doc.text(bill.notes || bill.remarks);\n\
      }\n\
      \n\
      // Footer\n\
      doc.moveDown(2);\n\
      doc.fontSize(10).text("Thank you for your business!", { align: "center" });\n\
      doc.text("Gunawardhana Motors, Embilipitiya | Tel: 070 3131 899", { align: "center" });\n\
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
  collection: "bike_models" // Set the collection name explicitly\n\
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
  model_name: String,       // For alternative bike model reference\n\
  chassis_number: String,   // For bike identification\n\
  engine_number: String,    // For bike identification\n\
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
    const bikeModels = await BikeModel.find().sort({ name: 1 });\n\
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
    \n\
    // Calculate totals if items are present\n\
    if (req.body.items && Array.isArray(req.body.items)) {\n\
      const subtotal = req.body.items.reduce(\n\
        (sum, item) => sum + Number(item.amount || item.total || 0), \n\
        0\n\
      );\n\
      const total = subtotal + Number(req.body.tax || 0);\n\
      \n\
      billData = {\n\
        ...billData,\n\
        subtotal,\n\
        subTotal: subtotal, // For compatibility\n\
        total,\n\
        amount: total // For compatibility\n\
      };\n\
    }\n\
    \n\
    // Handle field compatibility\n\
    if (billData.customer_name && !billData.customerName) {\n\
      billData.customerName = billData.customer_name;\n\
    }\n\
    if (billData.customer_phone && !billData.customerPhone) {\n\
      billData.customerPhone = billData.customer_phone;\n\
    }\n\
    if (billData.bill_type === "cash" && !billData.isPaid) {\n\
      billData.isPaid = true;\n\
      billData.paymentMethod = "cash";\n\
    }\n\
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
    let updateData = req.body;\n\
    \n\
    // Calculate totals if items are updated\n\
    if (req.body.items && Array.isArray(req.body.items)) {\n\
      const subtotal = req.body.items.reduce(\n\
        (sum, item) => sum + Number(item.amount || item.total || 0),\n\
        0\n\
      );\n\
      const total = subtotal + Number(req.body.tax || 0);\n\
      \n\
      updateData = {\n\
        ...updateData,\n\
        subtotal,\n\
        subTotal: subtotal, // For compatibility\n\
        total,\n\
        amount: total // For compatibility\n\
      };\n\
    }\n\
    \n\
    // Handle field compatibility\n\
    if (updateData.customer_name && !updateData.customerName) {\n\
      updateData.customerName = updateData.customer_name;\n\
    }\n\
    if (updateData.customer_phone && !updateData.customerPhone) {\n\
      updateData.customerPhone = updateData.customer_phone;\n\
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
// Update bill status\n\
app.patch("/api/bills/:id/status", async (req, res) => {\n\
  try {\n\
    const { status } = req.body;\n\
    if (!status) {\n\
      return res.status(400).json({ error: "Status is required" });\n\
    }\n\
    \n\
    // Handle different status types\n\
    let updateData = { status };\n\
    \n\
    if (status === "paid") {\n\
      updateData.isPaid = true;\n\
      updateData.paid = true;\n\
      updateData.paymentMethod = req.body.paymentMethod || "cash";\n\
    } else if (status === "cancelled") {\n\
      updateData.isPaid = false;\n\
      updateData.paid = false;\n\
    }\n\
    \n\
    const updatedBill = await Bill.findByIdAndUpdate(\n\
      req.params.id,\n\
      updateData,\n\
      { new: true }\n\
    );\n\
    \n\
    if (!updatedBill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    \n\
    res.status(200).json(updatedBill);\n\
  } catch (error) {\n\
    logger.error(`Error updating bill status: ${error.message}`);\n\
    res.status(400).json({ error: error.message });\n\
  }\n\
});\n\
\n\
// Convert bill to leasing\n\
app.put("/api/bills/:id/convert-to-leasing", async (req, res) => {\n\
  try {\n\
    const updateData = {\n\
      ...req.body,\n\
      status: "leasing",\n\
      bill_type: "leasing",\n\
      paymentMethod: "leasing",\n\
      isPaid: false,\n\
      paid: false\n\
    };\n\
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
    logger.error(`Error converting bill to leasing: ${error.message}`);\n\
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
        isPaid: true,\n\
        paid: true,\n\
        status: "paid",\n\
        paymentMethod,\n\
        bill_type: paymentMethod\n\
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