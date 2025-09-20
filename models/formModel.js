// models/formModel.js
const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  roleType: { type: String, enum: ["student", "professional"], required: true },

  // Student fields
  degree: { type: String },
  department: { type: String },
  yearOfPassedOut: { type: String },

  // Professional fields
  company: { type: String },
  role: { type: String },
  experience: { type: String },
 // OTP verification status
  otpVerified: { type: Boolean, default: false },
  otp: { type: String } // Save OTP temporarily
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String }, 
    razorpaySignature: { type: String }, 
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"], // ✅ simplified
      default: "pending",
    },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);
const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Form, Payment };

