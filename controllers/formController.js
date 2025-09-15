const { Form, Payment } = require("../models/formModel");
const { Course } = require("../models/coursesModel");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RHlt1aNxIRxsUa",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "d2skF5Am9n5PLn17DuvOzjRW",
});

const JWT_SECRET = process.env.JWT_SECRET_KEY || "supersecretkey";

// ------------------- FORM -------------------

// Create Form
exports.createForm = async (req, res) => {
  try {
    const { fullName, mobile, email, courseId, roleType, company, role, experience, isPrivacyAccepted } = req.body;

    if (!isPrivacyAccepted) return res.status(400).json({ success: false, message: "Privacy must be accepted" });
    if (roleType === "professional" && (!company || !role || !experience))
      return res.status(400).json({ success: false, message: "Company, role, experience required for professionals" });

    const form = await Form.create({ fullName, mobile, email, courseId, roleType, company, role, experience, isPrivacyAccepted });
    res.status(201).json({ success: true, message: "Form created", data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all forms
exports.getAllForms = async (req, res) => {
  try {
    const forms = await Form.find().populate("courseId");
    res.json({ success: true, data: forms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get form by ID
exports.getFormById = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id).populate("courseId");
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update form
exports.updateFormById = async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });
    res.json({ success: true, message: "Form updated", data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete form
exports.deleteFormById = async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });
    res.json({ success: true, message: "Form deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- OTP -------------------

// Generate OTP
exports.generateOtp = async (req, res) => {
 try {
    const { studentId } = req.params; // can be _id or mobile
    const { mobile } = req.body;

    let form;

    // First try to find by _id
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      form = await Form.findById(studentId);
    }

    // If not found by _id, try by mobile
    if (!form && mobile) {
      form = await Form.findOne({ mobile });
    }

    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    // Ensure mobile matches if provided
    if (mobile && form.mobile !== mobile) 
      return res.status(400).json({ success: false, message: "Mobile does not match" });

    const otp = "1234"; // fixed OTP
    const token = jwt.sign({ studentId: form._id.toString(), mobile: form.mobile }, JWT_SECRET, { expiresIn: "10m" });

    res.json({ success: true, message: "OTP generated", otp, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { otp, token } = req.body;

    if (!token) return res.status(401).json({ success: false, message: "Token required" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // Use studentId from token
    const form = await Form.findById(decoded.studentId);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    if (otp !== "1234") return res.status(400).json({ success: false, message: "Invalid OTP" });

    form.otpVerified = true;
    await form.save();

    const newToken = jwt.sign({ studentId: form._id.toString(), mobile: form.mobile }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ success: true, message: "OTP verified", token: newToken });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// ------------------- PAYMENT -------------------

// Create Payment
exports.createPayment = async (req, res) => {
     try {
    const { studentId } = req.body;
    const form = await Form.findById(studentId).populate("courseId");
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    const course = await Course.findById(form.courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // Razorpay Order
    const options = {
      amount: course.price * 100,
      currency: "INR",
      receipt: `rcpt_${studentId}_${Date.now()}`.slice(0, 40),
    };
    const order = await razorpay.orders.create(options);

    // Save to DB
    const payment = await Payment.create({
      studentId,
      courseId: course._id,
      amount: course.price,
      currency: "INR",
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    });

    res.json({
      success: true,
      message: "Payment order created",
      data: {
        paymentId: payment._id,
        orderId: order.id,
        amount: course.price,
        currency: "INR",
        courseName: course.name,
      },
    });
  } catch (err) {
    console.error("Error in createPayment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId, status } = req.body; // status = "paid" or "failed"

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    payment.paymentStatus = status;
    await payment.save();

    res.json({
      success: true,
      message: `Payment marked as ${status}`,
      data: payment,
    });
  } catch (err) {
    console.error("Error in updatePaymentStatus:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};