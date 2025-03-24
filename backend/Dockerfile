FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
app.put("/api/bills/:id", async (req, res) => {\n\
  try {\n\
    let updateData = req.body;\n\
    \n\
    // Determine if bike is e-bicycle\n\
    const isEbicycle = updateData.is_ebicycle || \n\
                      updateData.model_name?.includes("COLA5") || \n\
                      updateData.model_name?.includes("X01");\n\
    \n\
    // Set bike price\n\
    const bikePrice = Number(updateData.bike_price || updateData.price || updateData.subtotal || 0);\n\
    \n\
    // Handle field compatibility and business logic\n\
    if (updateData.bill_type === "leasing") {\n\
      // For leasing updates\n\
      updateData.is_ebicycle = isEbicycle;\n\
      updateData.bike_price = bikePrice;\n\
      updateData.cpz_charge = isEbicycle ? 0 : 13500;\n\
      updateData.down_payment = Number(updateData.down_payment || 0);\n\
      updateData.total = updateData.down_payment; // For leasing, total is down payment\n\
      updateData.status = "leasing";\n\
      updateData.isPaid = false;\n\
      updateData.paid = false;\n\
    } else if (updateData.advance && Number(updateData.advance) > 0) {\n\
      // For advance payment updates\n\
      updateData.is_ebicycle = isEbicycle;\n\
      updateData.bike_price = bikePrice;\n\
      \n\
      if (updateData.bill_type === "leasing") {\n\
        updateData.cpz_charge = isEbicycle ? 0 : 13500;\n\
        updateData.down_payment = Number(updateData.down_payment || 0);\n\
        updateData.total = updateData.down_payment;\n\
        updateData.balance = updateData.down_payment - Number(updateData.advance);\n\
      } else {\n\
        updateData.rmv_charge = isEbicycle ? 0 : 13000;\n\
        updateData.total = bikePrice + updateData.rmv_charge;\n\
        updateData.balance = updateData.total - Number(updateData.advance);\n\
      }\n\
    } else if (updateData.items && Array.isArray(updateData.items)) {\n\
      // If updating items, calculate totals\n\
      const subtotal = updateData.items.reduce(\n\
        (sum, item) => sum + Number(item.amount || item.total || 0),\n\
        0\n\
      );\n\
      updateData.subtotal = subtotal;\n\
      updateData.subTotal = subtotal; // For compatibility\n\
      updateData.total = subtotal + Number(updateData.tax || 0);\n\
      updateData.amount = updateData.total; // For compatibility\n\
    } else {\n\
      // Regular cash bill updates\n\
      updateData.is_ebicycle = isEbicycle;\n\
      updateData.bike_price = bikePrice;\n\
      updateData.rmv_charge = isEbicycle ? 0 : 13000;\n\
      updateData.total = bikePrice + updateData.rmv_charge;\n\
    }\n\
    \n\
    // Handle compatibility between field formats\n\
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
    // Get current bill to check if it is e-bicycle\n\
    const currentBill = await Bill.findById(req.params.id);\n\
    if (!currentBill) {\n\
      return res.status(404).json({ error: "Bill not found" });\n\
    }\n\
    \n\
    // Check if model is e-bicycle\n\
    const isEbicycle = currentBill.is_ebicycle || \n\
                      currentBill.model_name?.includes("COLA5") || \n\
                      currentBill.model_name?.includes("X01");\n\
    \n\
    // Dont allow leasing for e-bicycles\n\
    if (isEbicycle) {\n\
      return res.status(400).json({ error: "E-bicycles cannot be converted to leasing" });\n\
    }\n\
    \n\
    const bikePrice = Number(currentBill.bike_price || currentBill.subtotal || 0);\n\
    const cpzCharge = 13500; // For leasing\n\
    const downPayment = Number(req.body.down_payment || 0);\n\
    \n\
    const updateData = {\n\
      ...req.body,\n\
      status: "leasing",\n\
      bill_type: "leasing",\n\
      paymentMethod: "leasing",\n\
      isPaid: false,\n\
      paid: false,\n\
      is_ebicycle: false,\n\
      bike_price: bikePrice,\n\
      cpz_charge: cpzCharge,\n\
      down_payment: downPayment,\n\
      total: downPayment, // For leasing, total is down payment\n\
      // If there is an advance payment\n\
      balance: req.body.advance ? (downPayment - Number(req.body.advance)) : null\n\
    };\n\
    \n\
    const updatedBill = await Bill.findByIdAndUpdate(\n\
      req.params.id,\n\
      updateData,\n\
      { new: true, runValidators: true }\n\
    );\n\
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