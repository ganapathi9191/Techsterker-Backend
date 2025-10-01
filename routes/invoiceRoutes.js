const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/InvoiceController");
const validateObjectId = require("../utils/validateObjectId"); // Add this import
const multer = require("multer");
// Configure multer for file uploads
// Get Invoice as PDF
router.post("/getinvoice/:studentId", invoiceController.generateInvoiceByStudent);

module.exports = router;