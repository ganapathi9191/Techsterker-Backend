// routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const { createInvoice } = require("../controllers/InvoiceController");


router.post("/createInvoice", createInvoice);

module.exports = router;
