FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb pdfkit fs-extra

# Create directories
RUN mkdir -p src/utils src/models src/services templates

# Create logger.js
RUN printf "%s" 'const logger = {\n\
  error: (message) => console.error(message),\n\
  warn: (message) => console.warn(message),\n\
  info: (message) => console.info(message),\n\
  http: (message) => console.log(message),\n\
  debug: (message) => console.debug(message),\n\
};\n\
\n\
module.exports = logger;' > src/utils/logger.js

# Create database.js
RUN printf "%s" 'const mongoose = require("mongoose");\n\
const logger = require("./logger");\n\
\n\
// Connect to MongoDB\n\
const connectToDatabase = async () => {\n\
  try {\n\
    const options = {\n\
      useNewUrlParser: true,\n\
      useUnifiedTopology: true,\n\
    };\n\
    \n\
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/bill-gen";\n\
    await mongoose.connect(uri, options);\n\
    \n\
    logger.info("Connected to MongoDB successfully");\n\
    return mongoose.connection;\n\
  } catch (error) {\n\
    logger.error(`Error connecting to MongoDB: ${error.message}`);\n\
    throw error;\n\
  }\n\
};\n\
\n\
module.exports = { connectToDatabase };' > src/utils/database.js

# Create simplified pdfService.js with basic functionality
RUN printf "%s" 'const PDFDocument = require("pdfkit");\n\
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
      // Add font and color styling\n\
      doc.font("Helvetica-Bold");\n\
      doc.fillColor("#000080"); // Dark blue for header\n\
      \n\
      // Header with company logo/name\n\
      doc.fontSize(18).text("TMR TRADING LANKA (PVT) LTD", { align: "center" });\n\
      doc.fillColor("#000000"); // Back to black text\n\
      doc.fontSize(11).moveDown(0.5);\n\
      doc.font("Helvetica-Bold").text("GUNAWARDANA MOTORS, EMBILIPITIYA", { align: "left" });\n\
      doc.text("AUTHORIZED DEALER - EMBILIPITIYA", { align: "left" });\n\
      \n\
      // Bill Number and Date - At the top right\n\
      const billNumber = bill.billNumber || bill.bill_number || "N/A";\n\
      doc.fillColor("#000080"); // Dark blue for header\n\
      doc.text(`Bill No: ${billNumber}`, 400, 50, { align: "right" });\n\
      \n\
      const today = new Date(bill.serviceDate || bill.date || Date.now());\n\
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;\n\
      doc.text(`Date: ${formattedDate}`, 400, 70, { align: "right" });\n\
      doc.fillColor("#000000"); // Back to black text\n\
      \n\
      // Customer Details section\n\
      doc.moveDown(1.5);\n\
      doc.fillColor("#000080"); // Dark blue for section headers\n\
      doc.font("Helvetica-Bold").fontSize(12).text("Customer Details:", { underline: true });\n\
      doc.fillColor("#000000"); // Back to black text\n\
      doc.moveDown(0.5);\n\
      doc.font("Helvetica").fontSize(11);\n\
      doc.text(`Name: ${bill.customerName || bill.customer_name || "N/A"}`);\n\
      doc.text(`NIC: ${bill.customer_nic || "N/A"}`);\n\
      doc.text(`Address: ${bill.customer_address || "N/A"}`);\n\
      \n\
      // Vehicle Details section\n\
      doc.moveDown(1);\n\
      doc.fillColor("#000080"); // Dark blue for section headers\n\
      doc.font("Helvetica-Bold").fontSize(12).text("Vehicle Details:", { underline: true });\n\
      doc.fillColor("#000000"); // Back to black text\n\
      doc.moveDown(0.5);\n\
      doc.font("Helvetica").fontSize(11);\n\
      doc.text(`Model: ${bill.model_name || "N/A"}`);\n\
      if (bill.engine_number) doc.text(`Motor Number: ${bill.engine_number}`);\n\
      if (bill.chassis_number) doc.text(`Chassis Number: ${bill.chassis_number}`);\n\
      \n\
      // Determine if bike is e-bicycle\n\
      const isEbicycle = bill.is_ebicycle || \n\
                        bill.model_name?.includes("COLA5") || \n\
                        bill.model_name?.includes("X01");\n\
      \n\
      // Payment Details section\n\
      doc.moveDown(1);\n\
      doc.fillColor("#000080"); // Dark blue for section headers\n\
      doc.font("Helvetica-Bold").fontSize(12).text("Payment Details:", { underline: true });\n\
      doc.fillColor("#000000"); // Back to black text\n\
      doc.moveDown(0.5);\n\
      \n\
      // Create payment table with borders and cleaner styling\n\
      const tableTop = doc.y;\n\
      const tableLeft = 50;\n\
      const colWidth = 250;\n\
      const amountColWidth = 220;\n\
      const rowHeight = 25;\n\
      \n\
      // Table styling\n\
      doc.lineWidth(1);\n\
      doc.strokeColor("#000080"); // Dark blue for table borders\n\
      \n\
      // Table headers\n\
      doc.rect(tableLeft, tableTop, colWidth, rowHeight).fill("#f0f0f0").stroke();\n\
      doc.rect(tableLeft + colWidth, tableTop, amountColWidth, rowHeight).fill("#f0f0f0").stroke();\n\
      doc.fillColor("#000000");\n\
      doc.font("Helvetica-Bold").fontSize(11);\n\
      doc.text("Description", tableLeft + 10, tableTop + 8);\n\
      doc.text("Amount (Rs.)", tableLeft + colWidth + 10, tableTop + 8);\n\
      \n\
      let currentY = tableTop + rowHeight;\n\
      let totalAmount = 0;\n\
      doc.font("Helvetica").fontSize(10);\n\
      \n\
      // Handle different bill types\n\
      if (bill.bill_type === "leasing") {\n\
        // Leasing bills - only for regular bikes\n\
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);\n\
        const cpzAmount = isEbicycle ? 0 : 13500;\n\
        const downPayment = Number(bill.down_payment || bill.advance || 0);\n\
        \n\
        // Bike Price\n\
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // CPZ Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
          doc.text("CPZ Charge", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(cpzAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // Down Payment\n\
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
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
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // RMV/CPZ Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
          doc.text(rmvLabel, tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // If leasing, show down payment\n\
        let fullAmount = bikePrice + rmvAmount;\n\
        if (bill.bill_type === "leasing" && bill.down_payment) {\n\
          const downPayment = Number(bill.down_payment || 0);\n\
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
          doc.text("Down Payment", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(downPayment), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
          fullAmount = downPayment; // For leasing, full amount is down payment\n\
        }\n\
        \n\
        // Advance Amount\n\
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
        doc.text("Advance Amount", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(advanceAmount), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // Balance\n\
        const balance = fullAmount - advanceAmount;\n\
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
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
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
        doc.text("Bike Price", tableLeft + 10, currentY + 8);\n\
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);\n\
        currentY += rowHeight;\n\
        \n\
        // RMV Charge (if not e-bicycle)\n\
        if (!isEbicycle) {\n\
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();\n\
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();\n\
          doc.text("RMV Charge", tableLeft + 10, currentY + 8);\n\
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);\n\
          currentY += rowHeight;\n\
        }\n\
        \n\
        // For cash, total amount is bike price + RMV (if applicable)\n\
        totalAmount = bikePrice + rmvAmount;\n\
      }\n\
      \n\
      // Total Amount (highlighted)\n\
      doc.rect(tableLeft, currentY, colWidth, rowHeight).fill("#f0f0f0").stroke();\n\
      doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).fill("#f0f0f0").stroke();\n\
      doc.fillColor("#000080");\n\
      doc.font("Helvetica-Bold").fontSize(11);\n\
      doc.text("Total Amount", tableLeft + 10, currentY + 8);\n\
      doc.text(formatCurrency(totalAmount), tableLeft + colWidth + 10, currentY + 8);\n\
      doc.fillColor("#000000");\n\
      \n\
      // Terms and Conditions section\n\
      doc.moveDown(2);\n\
      doc.fillColor("#000080");\n\
      doc.font("Helvetica-Bold").fontSize(11).text("Terms and Conditions:", { underline: true });\n\
      doc.fillColor("#000000");\n\
      doc.moveDown(0.3);\n\
      doc.font("Helvetica").fontSize(10);\n\
      doc.text("1. All prices are inclusive of taxes.");\n\
      doc.text("2. Warranty is subject to terms and conditions.");\n\
      doc.text("3. This is a computer-generated bill.");\n\
      doc.text("4. RMV registration will be completed within 30 days.");\n\
      \n\
      // Signature lines\n\
      doc.moveDown(2);\n\
      doc.strokeColor("#000000");\n\
      doc.lineWidth(0.5);\n\
      doc.moveTo(50, doc.y).lineTo(200, doc.y).stroke();\n\
      doc.text("Dealer Signature", 50, doc.y + 5);\n\
      \n\
      doc.moveTo(350, doc.y - 15).lineTo(500, doc.y - 15).stroke();\n\
      doc.text("Rubber Stamp", 350, doc.y + 5);\n\
      \n\
      // Footer\n\
      doc.moveDown(1);\n\
      doc.fillColor("#000080");\n\
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
RUN printf "%s" 'const mongoose = require("mongoose");\n\
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
module.exports = mongoose.model("BikeModel", BikeModelSchema);' > src/models/BikeModel.js

# Create src/models/Bill.js with proper schema definition
RUN printf "%s" 'const mongoose = require("mongoose");\n\
\n\
const BillSchema = new mongoose.Schema(\n\
  {\n\
    bill_type: {\n\
      type: String,\n\
      enum: ["cash", "leasing", "advance"],\n\
      required: [true, "Bill type is required"],\n\
    },\n\
    bill_status: {\n\
      type: String,\n\
      enum: ["pending", "paid", "cancelled"],\n\
      default: "pending",\n\
    },\n\
    billNumber: {\n\
      type: String,\n\
      // Generate a unique bill number with date and random component\n\
      default: function() {\n\
        const date = new Date();\n\
        const year = date.getFullYear();\n\
        const month = String(date.getMonth() + 1).padStart(2, "0");\n\
        const day = String(date.getDate()).padStart(2, "0");\n\
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");\n\
        return `TMR-${year}${month}${day}-${random}`;\n\
      },\n\
    },\n\
    bill_number: String, // For backward compatibility\n\
    date: {\n\
      type: Date,\n\
      default: Date.now,\n\
    },\n\
    customerName: String,\n\
    customer_name: String,\n\
    customer_nic: String,\n\
    customer_address: String,\n\
    customer_phone: String,\n\
    model_name: String,\n\
    bike_price: Number,\n\
    is_ebicycle: {\n\
      type: Boolean,\n\
      default: false,\n\
    },\n\
    price: Number,\n\
    subtotal: Number,\n\
    advance: Number,\n\
    down_payment: Number,\n\
    engine_number: String,\n\
    chassis_number: String,\n\
    serviceDate: Date,\n\
    leasing_company: String,\n\
    leasing_amount: Number,\n\
  },\n\
  { timestamps: true }\n\
);\n\
\n\
// Ensure billNumber and bill_number sync and are never null\n\
BillSchema.pre("save", function (next) {\n\
  // Make sure billNumber is set\n\
  if (!this.billNumber) {\n\
    const date = new Date();\n\
    const year = date.getFullYear();\n\
    const month = String(date.getMonth() + 1).padStart(2, "0");\n\
    const day = String(date.getDate()).padStart(2, "0");\n\
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");\n\
    this.billNumber = `TMR-${year}${month}${day}-${random}`;\n\
  }\n\
  \n\
  // Sync bill_number for backward compatibility\n\
  this.bill_number = this.billNumber;\n\
  \n\
  // Auto-detect e-bicycle based on model name\n\
  if (this.model_name && (this.model_name.includes("COLA5") || this.model_name.includes("X01"))) {\n\
    this.is_ebicycle = true;\n\
  }\n\
  \n\
  next();\n\
});\n\
\n\
// Create index separately to avoid Docker parsing issues\n\
BillSchema.index({billNumber: 1});\n\
\n\
const Bill = mongoose.model("Bill", BillSchema, "bills");\n\
\n\
module.exports = Bill;' > src/models/Bill.js

# Create server.js
RUN cat > src/server.js << 'EOL'
// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
const logger = require("./utils/logger");
const { connectToDatabase } = require("./utils/database");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// Models
const Bill = require("./models/Bill");
const BikeModel = require("./models/BikeModel");

// App Setup
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("tiny"));
}

// PDF generation service
const pdfService = require("./services/pdfService");

// API Routes

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Bill Generator API" });
});

// Get all bills
app.get("/api/bills", async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    logger.error(`Error fetching bills: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get single bill by ID
app.get("/api/bills/:id", async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.status(200).json(bill);
  } catch (error) {
    logger.error(`Error fetching bill: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF for bill
app.get("/api/bills/:id/pdf", async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    // Generate PDF
    const pdfBuffer = await pdfService.generatePDF(bill);
    
    // Set headers and send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=bill-${bill.billNumber || bill._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error(`Error generating PDF: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get all bike models
app.get("/api/bike-models", async (req, res) => {
  try {
    const bikeModels = await BikeModel.find();
    logger.info(`Found ${bikeModels.length} bike models:`);
    res.status(200).json(bikeModels);
  } catch (error) {
    logger.error(`Error fetching bike models: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create new bike model
app.post("/api/bike-models", async (req, res) => {
  try {
    const newBikeModel = new BikeModel(req.body);
    const savedBikeModel = await newBikeModel.save();
    res.status(201).json(savedBikeModel);
  } catch (error) {
    logger.error(`Error creating bike model: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Create new bill
app.post("/api/bills", async (req, res) => {
  try {
    let billData = req.body;
    
    // Generate bill number if not provided
    if (!billData.billNumber && !billData.bill_number) {
      const today = new Date();
      const year = today.getFullYear().toString().substr(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      
      // Get counter
      const count = await Bill.countDocuments();
      const billNumber = `TMR-${year}-${month}-${(count + 1).toString().padStart(4, "0")}`;
      
      billData.billNumber = billNumber;
      billData.bill_number = billNumber;
    }
    
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

// Update bill
app.put("/api/bills/:id", async (req, res) => {
  try {
    let updateData = req.body;
    
    // Determine if bike is e-bicycle
    const isEbicycle = updateData.is_ebicycle || 
                      updateData.model_name?.includes("COLA5") || 
                      updateData.model_name?.includes("X01");
    
    // Set bike price
    const bikePrice = Number(updateData.bike_price || updateData.price || updateData.subtotal || 0);
    
    // Handle field compatibility and business logic
    if (updateData.bill_type === "leasing") {
      // For leasing updates
      updateData.is_ebicycle = isEbicycle;
      updateData.bike_price = bikePrice;
      updateData.cpz_charge = isEbicycle ? 0 : 13500;
      updateData.down_payment = Number(updateData.down_payment || 0);
      updateData.total = updateData.down_payment; // For leasing, total is down payment
      updateData.status = "leasing";
      updateData.isPaid = false;
      updateData.paid = false;
    } else if (updateData.advance && Number(updateData.advance) > 0) {
      // For advance payment updates
      updateData.is_ebicycle = isEbicycle;
      updateData.bike_price = bikePrice;
      
      if (updateData.bill_type === "leasing") {
        updateData.cpz_charge = isEbicycle ? 0 : 13500;
        updateData.down_payment = Number(updateData.down_payment || 0);
        updateData.total = updateData.down_payment;
        updateData.balance = updateData.down_payment - Number(updateData.advance);
      } else {
        updateData.rmv_charge = isEbicycle ? 0 : 13000;
        updateData.total = bikePrice + updateData.rmv_charge;
        updateData.balance = updateData.total - Number(updateData.advance);
      }
    } else if (updateData.items && Array.isArray(updateData.items)) {
      // If updating items, calculate totals
      const subtotal = updateData.items.reduce(
        (sum, item) => sum + Number(item.amount || item.total || 0),
        0
      );
      updateData.subtotal = subtotal;
      updateData.subTotal = subtotal; // For compatibility
      updateData.total = subtotal + Number(updateData.tax || 0);
      updateData.amount = updateData.total; // For compatibility
    } else {
      // Regular cash bill updates
      updateData.is_ebicycle = isEbicycle;
      updateData.bike_price = bikePrice;
      updateData.rmv_charge = isEbicycle ? 0 : 13000;
      updateData.total = bikePrice + updateData.rmv_charge;
    }
    
    // Handle compatibility between field formats
    if (updateData.customer_name && !updateData.customerName) {
      updateData.customerName = updateData.customer_name;
    }
    if (updateData.customer_phone && !updateData.customerPhone) {
      updateData.customerPhone = updateData.customer_phone;
    }
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedBill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    res.status(200).json(updatedBill);
  } catch (error) {
    logger.error(`Error updating bill: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Update bill status
app.patch("/api/bills/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    
    // Handle different status types
    let updateData = { status };
    
    if (status === "paid") {
      updateData.isPaid = true;
      updateData.paid = true;
      updateData.paymentMethod = req.body.paymentMethod || "cash";
    } else if (status === "cancelled") {
      updateData.isPaid = false;
      updateData.paid = false;
    }
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedBill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    res.status(200).json(updatedBill);
  } catch (error) {
    logger.error(`Error updating bill status: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Convert bill to leasing
app.put("/api/bills/:id/convert-to-leasing", async (req, res) => {
  try {
    // Get current bill to check if it is e-bicycle
    const currentBill = await Bill.findById(req.params.id);
    if (!currentBill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    // Check if model is e-bicycle
    const isEbicycle = currentBill.is_ebicycle || 
                      currentBill.model_name?.includes("COLA5") || 
                      currentBill.model_name?.includes("X01");
    
    // Dont allow leasing for e-bicycles
    if (isEbicycle) {
      return res.status(400).json({ error: "E-bicycles cannot be converted to leasing" });
    }
    
    const bikePrice = Number(currentBill.bike_price || currentBill.subtotal || 0);
    const cpzCharge = 13500; // For leasing
    const downPayment = Number(req.body.down_payment || 0);
    
    const updateData = {
      ...req.body,
      status: "leasing",
      bill_type: "leasing",
      paymentMethod: "leasing",
      isPaid: false,
      paid: false,
      is_ebicycle: false,
      bike_price: bikePrice,
      cpz_charge: cpzCharge,
      down_payment: downPayment,
      total: downPayment, // For leasing, total is down payment
      // If there is an advance payment
      balance: req.body.advance ? (downPayment - Number(req.body.advance)) : null
    };
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedBill);
  } catch (error) {
    logger.error(`Error converting bill to leasing: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Delete bill
app.delete("/api/bills/:id", async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting bill: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Mark bill as paid
app.patch("/api/bills/:id/pay", async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        isPaid: true,
        paid: true,
        status: "paid",
        paymentMethod,
        bill_type: paymentMethod
      },
      { new: true }
    );
    
    if (!updatedBill) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    res.status(200).json(updatedBill);
  } catch (error) {
    logger.error(`Error marking bill as paid: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Start server
const server = app.listen(port, async () => {
  try {
    // Connect to database
    await connectToDatabase();
    logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`);
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received");
  server.close(() => {
    logger.info("HTTP server closed");
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received");
  server.close(() => {
    logger.info("HTTP server closed");
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
EOL

# Create .env file
RUN printf "%s" 'PORT=8080\n\
NODE_ENV=production\n\
MONGODB_URI=mongodb+srv://gunawardhanamotorsembilipitiya:0Mu8lMAFac5hMdcP@bill-gen-cluster.riyvl.mongodb.net/bill-gen?retryWrites=true&w=majority&appName=bill-gen-cluster\n\
CORS_ORIGIN=https://bill-gen-saas.pages.dev,https://web-production-0ed6.up.railway.app' > .env

# Verify files
RUN ls -la
RUN ls -la src
RUN ls -la src/utils
RUN ls -la src/models
RUN ls -la src/services

# Expose the port the app will run on
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"] 