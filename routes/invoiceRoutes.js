const express = require("express");
const router = express.Router();
const multer = require("multer");
const createInvoice = require("../controllers/InvoiceController");

const upload = multer(); // stores file in memory as buffer

router.post("/createInvoice", upload.single("logoFile"), createInvoice.createInvoice);
router.get("/getAllInvoices", createInvoice.getAllInvoices);
router.get("/getInvoiceById/:id", createInvoice.getInvoiceById);

module.exports = router;
