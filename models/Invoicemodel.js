const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date,},
  items: [{
    description: { type: String,  },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number,},
    amount: { type: Number,}
  }],
  subtotal: { type: Number, },
  total: { type: Number, },
  status: { type: String, enum: ["draft", "sent", "paid", "overdue"], default: "draft" },
  notes: { type: String },
    paymentStatus: { type: String, },

  
  // New fields for PDF storage
  pdfUrl: { type: String,}, // Relative path: "/uploads/invoices/filename.pdf"
  fullPdfUrl: { type: String, }, // Full URL: "http://localhost:5001/uploads/invoices/filename.pdf"
  
  logoUrl: { type: String },
  companyInfo: {
    name: { type: String },
    address: { type: String },
    contact: { type: String },
    email: { type: String },
    taxId: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);