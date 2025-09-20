const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ["draft", "sent", "paid", "overdue"], default: "draft" },
  notes: { type: String },
  logoUrl: { type: String },
  companyInfo: {
    name: { type: String },
    address: { type: String },
    contact: { type: String },
    taxId: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
