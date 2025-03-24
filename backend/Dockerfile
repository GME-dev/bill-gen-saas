FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install express cors helmet morgan dotenv mongoose mongodb pdfkit fs-extra

# Create directories
RUN mkdir -p src/utils src/models src/services templates

# Create logger.js
RUN cat > src/utils/logger.js << 'EOL'
const logger = {
  error: (message) => console.error(message),
  warn: (message) => console.warn(message),
  info: (message) => console.info(message),
  http: (message) => console.log(message),
  debug: (message) => console.debug(message),
};

module.exports = logger;
EOL

# Create database.js
RUN cat > src/utils/database.js << 'EOL'
const mongoose = require("mongoose");
const logger = require("./logger");

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/bill-gen";
    await mongoose.connect(uri, options);
    
    logger.info("Connected to MongoDB successfully");
    return mongoose.connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = { connectToDatabase };
EOL

# Create simplified pdfService.js with basic functionality
RUN cat > src/services/pdfService.js << 'EOL'
const PDFDocument = require("pdfkit");
const logger = require("../utils/logger");

// Helper function to safely convert to string
const safeToString = (val) => {
  if (val === undefined || val === null) return "";
  return val.toString();
};

// Format currency in LKR
const formatCurrency = (amount) => {
  return `${Number(amount).toLocaleString("en-LK")}/-`;
};

// Function to generate PDF from bill data
exports.generatePDF = async (bill) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      
      // Create buffer to store PDF
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Add font and color styling
      doc.font("Helvetica-Bold");
      doc.fillColor("#000080"); // Dark blue for header
      
      // Header with company logo/name
      doc.fontSize(18).text("TMR TRADING LANKA (PVT) LTD", { align: "center" });
      doc.fillColor("#000000"); // Back to black text
      doc.fontSize(11).moveDown(0.5);
      doc.font("Helvetica-Bold").text("GUNAWARDANA MOTORS, EMBILIPITIYA", { align: "left" });
      doc.text("AUTHORIZED DEALER - EMBILIPITIYA", { align: "left" });
      
      // Bill Number and Date - At the top right
      const billNumber = bill.billNumber || bill.bill_number || "N/A";
      doc.fillColor("#000080"); // Dark blue for header
      doc.text(`Bill No: ${billNumber}`, 400, 50, { align: "right" });
      
      const today = new Date(bill.serviceDate || bill.date || Date.now());
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      doc.text(`Date: ${formattedDate}`, 400, 70, { align: "right" });
      doc.fillColor("#000000"); // Back to black text
      
      // Customer Details section
      doc.moveDown(1.5);
      doc.fillColor("#000080"); // Dark blue for section headers
      doc.font("Helvetica-Bold").fontSize(12).text("Customer Details:", { underline: true });
      doc.fillColor("#000000"); // Back to black text
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(11);
      doc.text(`Name: ${bill.customerName || bill.customer_name || "N/A"}`);
      doc.text(`NIC: ${bill.customer_nic || "N/A"}`);
      doc.text(`Address: ${bill.customer_address || "N/A"}`);
      
      // Vehicle Details section
      doc.moveDown(1);
      doc.fillColor("#000080"); // Dark blue for section headers
      doc.font("Helvetica-Bold").fontSize(12).text("Vehicle Details:", { underline: true });
      doc.fillColor("#000000"); // Back to black text
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(11);
      doc.text(`Model: ${bill.model_name || "N/A"}`);
      if (bill.engine_number) doc.text(`Motor Number: ${bill.engine_number}`);
      if (bill.chassis_number) doc.text(`Chassis Number: ${bill.chassis_number}`);
      
      // Determine if bike is e-bicycle
      const isEbicycle = bill.is_ebicycle || 
                        bill.model_name?.includes("COLA5") || 
                        bill.model_name?.includes("X01");
      
      // Payment Details section
      doc.moveDown(1);
      doc.fillColor("#000080"); // Dark blue for section headers
      doc.font("Helvetica-Bold").fontSize(12).text("Payment Details:", { underline: true });
      doc.fillColor("#000000"); // Back to black text
      doc.moveDown(0.5);
      
      // Create payment table with borders and cleaner styling
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidth = 250;
      const amountColWidth = 220;
      const rowHeight = 25;
      
      // Table styling
      doc.lineWidth(1);
      doc.strokeColor("#000080"); // Dark blue for table borders
      
      // Table headers
      doc.rect(tableLeft, tableTop, colWidth, rowHeight).fill("#f0f0f0").stroke();
      doc.rect(tableLeft + colWidth, tableTop, amountColWidth, rowHeight).fill("#f0f0f0").stroke();
      doc.fillColor("#000000");
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("Description", tableLeft + 10, tableTop + 8);
      doc.text("Amount (Rs.)", tableLeft + colWidth + 10, tableTop + 8);
      
      let currentY = tableTop + rowHeight;
      let totalAmount = 0;
      doc.font("Helvetica").fontSize(10);
      
      // Handle different bill types
      if (bill.bill_type === "leasing") {
        // Leasing bills - only for regular bikes
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);
        const cpzAmount = isEbicycle ? 0 : 13500;
        const downPayment = Number(bill.down_payment || bill.advance || 0);
        
        // Bike Price
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Bike Price", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // CPZ Charge (if not e-bicycle)
        if (!isEbicycle) {
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
          doc.text("CPZ Charge", tableLeft + 10, currentY + 8);
          doc.text(formatCurrency(cpzAmount), tableLeft + colWidth + 10, currentY + 8);
          currentY += rowHeight;
        }
        
        // Down Payment
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Down Payment", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(downPayment), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // For leasing, total amount is the down payment
        totalAmount = downPayment;
        
      } else if (bill.advance && Number(bill.advance) > 0) {
        // Advance Payment bill (either for cash or leasing)
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);
        const rmvAmount = isEbicycle ? 0 : (bill.bill_type === "leasing" ? 13500 : 13000);
        const rmvLabel = bill.bill_type === "leasing" ? "CPZ Charge" : "RMV Charge";
        const advanceAmount = Number(bill.advance || 0);
        
        // Bike Price
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Bike Price", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // RMV/CPZ Charge (if not e-bicycle)
        if (!isEbicycle) {
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
          doc.text(rmvLabel, tableLeft + 10, currentY + 8);
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);
          currentY += rowHeight;
        }
        
        // If leasing, show down payment
        let fullAmount = bikePrice + rmvAmount;
        if (bill.bill_type === "leasing" && bill.down_payment) {
          const downPayment = Number(bill.down_payment || 0);
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
          doc.text("Down Payment", tableLeft + 10, currentY + 8);
          doc.text(formatCurrency(downPayment), tableLeft + colWidth + 10, currentY + 8);
          currentY += rowHeight;
          fullAmount = downPayment; // For leasing, full amount is down payment
        }
        
        // Advance Amount
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Advance Amount", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(advanceAmount), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // Balance
        const balance = fullAmount - advanceAmount;
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Balance", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(balance), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // For advance payment, total is the full amount
        totalAmount = fullAmount;
        
      } else {
        // Regular Cash bill
        const bikePrice = Number(bill.bike_price || bill.price || bill.subtotal || 0);
        const rmvAmount = isEbicycle ? 0 : 13000;
        
        // Bike Price
        doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
        doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
        doc.text("Bike Price", tableLeft + 10, currentY + 8);
        doc.text(formatCurrency(bikePrice), tableLeft + colWidth + 10, currentY + 8);
        currentY += rowHeight;
        
        // RMV Charge (if not e-bicycle)
        if (!isEbicycle) {
          doc.rect(tableLeft, currentY, colWidth, rowHeight).stroke();
          doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).stroke();
          doc.text("RMV Charge", tableLeft + 10, currentY + 8);
          doc.text(formatCurrency(rmvAmount), tableLeft + colWidth + 10, currentY + 8);
          currentY += rowHeight;
        }
        
        // For cash, total amount is bike price + RMV (if applicable)
        totalAmount = bikePrice + rmvAmount;
      }
      
      // Total Amount (highlighted)
      doc.rect(tableLeft, currentY, colWidth, rowHeight).fill("#f0f0f0").stroke();
      doc.rect(tableLeft + colWidth, currentY, amountColWidth, rowHeight).fill("#f0f0f0").stroke();
      doc.fillColor("#000080");
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("Total Amount", tableLeft + 10, currentY + 8);
      doc.text(formatCurrency(totalAmount), tableLeft + colWidth + 10, currentY + 8);
      doc.fillColor("#000000");
      
      // Terms and Conditions section
      doc.moveDown(2);
      doc.fillColor("#000080");
      doc.font("Helvetica-Bold").fontSize(11).text("Terms and Conditions:", { underline: true });
      doc.fillColor("#000000");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10);
      doc.text("1. All prices are inclusive of taxes.");
      doc.text("2. Warranty is subject to terms and conditions.");
      doc.text("3. This is a computer-generated bill.");
      doc.text("4. RMV registration will be completed within 30 days.");
      
      // Signature lines
      doc.moveDown(2);
      doc.strokeColor("#000000");
      doc.lineWidth(0.5);
      doc.moveTo(50, doc.y).lineTo(200, doc.y).stroke();
      doc.text("Dealer Signature", 50, doc.y + 5);
      
      doc.moveTo(350, doc.y - 15).lineTo(500, doc.y - 15).stroke();
      doc.text("Rubber Stamp", 350, doc.y + 5);
      
      // Footer
      doc.moveDown(1);
      doc.fillColor("#000080");
      doc.fontSize(10).text("Thank you for your business!", { align: "center" });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      logger.error(`Error generating PDF: ${error.message}`);
      reject(error);
    }
  });
};
EOL

# Create BikeModel schema
RUN cat > src/models/BikeModel.js << 'EOL'
const mongoose = require("mongoose");

const BikeModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Model name is required"],
    trim: true
  },
  model_name: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Price is required"]
  },
  motor_number_prefix: {
    type: String,
    trim: true
  },
  chassis_number_prefix: {
    type: String,
    trim: true
  },
  is_ebicycle: {
    type: Boolean,
    default: false
  },
  can_be_leased: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: "bike_models", // Set the collection name explicitly
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.model_name = ret.name; // Map name to model_name for frontend compatibility
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Add middleware to sync name and model_name fields
BikeModelSchema.pre("save", function(next) {
  if (this.isModified("name")) {
    this.model_name = this.name;
  } else if (this.isModified("model_name")) {
    this.name = this.model_name;
  }
  next();
});

module.exports = mongoose.model("BikeModel", BikeModelSchema);
EOL

# Create src/models/Bill.js with proper schema definition
RUN cat > src/models/Bill.js << 'EOL'
const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    bill_type: {
      type: String,
      enum: ["cash", "leasing", "advance"],
      required: [true, "Bill type is required"],
    },
    bill_status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    billNumber: {
      type: String,
      // Generate a unique bill number with date and random component
      default: function() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        return `TMR-${year}${month}${day}-${random}`;
      },
    },
    bill_number: String, // For backward compatibility
    date: {
      type: Date,
      default: Date.now,
    },
    customerName: String,
    customer_name: String,
    customer_nic: String,
    customer_address: String,
    customer_phone: String,
    model_name: String,
    bike_price: Number,
    is_ebicycle: {
      type: Boolean,
      default: false,
    },
    price: Number,
    subtotal: Number,
    advance: Number,
    down_payment: Number,
    engine_number: String,
    chassis_number: String,
    serviceDate: Date,
    leasing_company: String,
    leasing_amount: Number,
  },
  { timestamps: true }
);

// Ensure billNumber and bill_number sync and are never null
BillSchema.pre("save", function (next) {
  // Make sure billNumber is set
  if (!this.billNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.billNumber = `TMR-${year}${month}${day}-${random}`;
  }
  
  // Sync bill_number for backward compatibility
  this.bill_number = this.billNumber;
  
  // Auto-detect e-bicycle based on model name
  if (this.model_name && (this.model_name.includes("COLA5") || this.model_name.includes("X01"))) {
    this.is_ebicycle = true;
  }
  
  next();
});

// Create index separately to avoid Docker parsing issues
BillSchema.index({billNumber: 1});

const Bill = mongoose.model("Bill", BillSchema, "bills");

module.exports = Bill;
EOL

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
RUN cat > .env << 'EOL'
PORT=8080
NODE_ENV=production
MONGODB_URI=mongodb+srv://gunawardhanamotorsembilipitiya:0Mu8lMAFac5hMdcP@bill-gen-cluster.riyvl.mongodb.net/bill-gen?retryWrites=true&w=majority&appName=bill-gen-cluster
CORS_ORIGIN=https://bill-gen-saas.pages.dev,https://web-production-0ed6.up.railway.app
EOL

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