// models/invoiceModel.js
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true },
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  logo: { type: String }, // Cloudinary URL
  instituteName: { type: String, required: true },
  instituteAddress: { type: String, required: true },
  fullName: { type: String, required: true },
  mobile: { type: String },
  email: { type: String },
  roleType: { type: String, enum: ["student", "professional"], required: true },
  // Student fields
  degree: { type: String },
  department: { type: String },
  yearOfPassing: { type: Number },
  // Professional fields
  company: { type: String },
  role: { type: String },
  experience: { type: String },
  status: { type: String, enum: ["unpaid", "paid", "pending"], default: "unpaid" },
  dueDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ["upi", "card", "bank", "cash"], default: "cash" },
  transactionId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
