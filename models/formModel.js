
// models/formModel.js
const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  roleType: { type: String, enum: ["student", "professional"], required: true },
  company: { type: String },
  role: { type: String },
  experience: { type: String },
  isPrivacyAccepted: { type: Boolean, required: true },
  otpVerified: { type: Boolean, default: false },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  razorpayOrderId: { type: String }
}, { timestamps: true });

const Form = mongoose.model("Form", formSchema);
const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Form, Payment };
