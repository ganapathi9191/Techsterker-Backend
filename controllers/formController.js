const { Form, Payment } = require("../models/formModel");
const { Course } = require("../models/coursesModel");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const twilio = require("twilio");

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Twilio credentials
const TWILIO_SID = "AC6dbc0f86b6481658d4b4bc471d1dfb32";
const TWILIO_AUTH_TOKEN = "c623dd368248f84be06e643750fae2f0";
const TWILIO_PHONE = "+19123489710";


const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// Utility to format number for Twilio
function formatNumber(number) {
  if (!number) return null;
  if (number.startsWith("+")) return number;
  return "+91" + number; // assuming Indian numbers
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RHlt1aNxIRxsUa",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "d2skF5Am9n5PLn17DuvOzjRW",
});


// ------------------- FORM -------------------

// Create Form
exports.createForm = async (req, res) => {
  try {
    const { 
      fullName, mobile, email, courseId, roleType,
      degree, department, yearOfPassedOut,
      company, role, experience
    } = req.body;

    // Role type validation
    if (roleType === "student") {
      if (!degree || !department || !yearOfPassedOut) {
        return res.status(400).json({
          success: false,
          message: "Degree, department, and yearOfPassedOut are required for students"
        });
      }
    }

    if (roleType === "professional") {
      if (!company || !role || !experience) {
        return res.status(400).json({
          success: false,
          message: "Company, role, and experience are required for professionals"
        });
      }
    }

    const form = await Form.create({
      fullName,
      mobile,
      email,
      courseId,
      roleType,
      degree,
      department,
      yearOfPassedOut,
      company,
      role,
      experience
    });

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
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Update form
exports.updateFormById = async (req, res) => {
   try {
    const {
      fullName, mobile, email, courseId, roleType,
      degree, department, yearOfPassedOut,
      company, role, experience
    } = req.body;

    // Role type validation
    if (roleType === "student") {
      if (!degree || !department || !yearOfPassedOut) {
        return res.status(400).json({
          success: false,
          message: "Degree, department, and yearOfPassedOut are required for students"
        });
      }
    }

    if (roleType === "professional") {
      if (!company || !role || !experience) {
        return res.status(400).json({
          success: false,
          message: "Company, role, and experience are required for professionals"
        });
      }
    }

    const form = await Form.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        mobile,
        email,
        courseId,
        roleType,
        degree,
        department,
        yearOfPassedOut,
        company,
        role,
        experience
      },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    res.json({ success: true, message: "Form updated", data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete form
exports.deleteFormById = async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }
    res.json({ success: true, message: "Form deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// ------------------- OTP -------------------


 
// Generate and send OTP
exports.generateOtp = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const form = await Form.findById(studentId);

    if (!form) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    // Check if mobile number exists and is valid (ONLY essential check)
    if (!form.mobile || form.mobile.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Mobile number is required to send OTP"
      });
    }

    // Validate mobile number format (basic validation)
    const mobileRegex = /^[6-9]\d{9}$/; // Indian mobile numbers
    const cleanMobile = form.mobile.replace(/[+\s-]/g, '');
    
    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid mobile number format. Please provide a valid 10-digit Indian mobile number."
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP temporarily in DB
    form.otp = otp;
    form.otpVerified = false;
    form.otpGeneratedAt = new Date();
    await form.save();

    // Send SMS via Twilio
    const toNumber = formatNumber(form.mobile);
    try {
      // Use student name if available, otherwise generic message
      const message = form.name 
        ? `Hello ${form.name}, your OTP is ${otp}. Valid for 10 minutes.`
        : `Your OTP is ${otp}. Valid for 10 minutes.`;
      
      await client.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to: toNumber
      });
    } catch (twilioError) {
      console.error("Twilio error:", twilioError);
      
      // Clear OTP since sending failed
      form.otp = null;
      form.otpGeneratedAt = null;
      await form.save();

      return res.status(500).json({ 
        success: false, 
        message: "Failed to send SMS. Please check the mobile number format."
      });
    }

    // JWT token for OTP verification
    const token = jwt.sign({ 
      studentId: form._id.toString(),
      mobile: form.mobile
    }, JWT_SECRET, { expiresIn: "10m" });

    res.json({
      success: true,
      message: `OTP sent via SMS to ${form.mobile}`,
      token,
      mobile: form.mobile
    });

  } catch (err) {
    console.error("Error in generateOtp:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};
// Verify OTP
exports.verifyOtp = async (req, res) => {
   try {
    const { otp, token } = req.body;

    if (!otp || !token) {
      return res.status(400).json({ 
        success: false, 
        message: "OTP and token are required"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired token" 
      });
    }

    const form = await Form.findById(decoded.studentId);
    if (!form) {
      return res.status(404).json({ 
        success: false, 
        message: "Student record not found" 
      });
    }

    // Check if OTP exists and matches
    if (!form.otp || form.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP" 
      });
    }

    // Check if OTP is expired (10 minutes)
    if (form.otpGeneratedAt) {
      const otpAge = new Date() - new Date(form.otpGeneratedAt);
      const tenMinutes = 10 * 60 * 1000;
      
      if (otpAge > tenMinutes) {
        form.otp = null;
        form.otpGeneratedAt = null;
        await form.save();
        
        return res.status(400).json({ 
          success: false, 
          message: "OTP has expired" 
        });
      }
    }

    // OTP is correct
    form.otpVerified = true;
    form.otp = null;
    form.otpGeneratedAt = null;
    await form.save();

    // Issue new token
    const newToken = jwt.sign({ 
      studentId: form._id.toString(),
      mobile: form.mobile
    }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      message: "OTP verified successfully",
      otpVerified: true,
      token: newToken,
      studentId: form._id
    });

  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};
// ------------------- PAYMENT -------------------

// Create Payment
exports.createPayment = async (req, res) => {
   try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    // Find student form and populate course
    const form = await Form.findById(studentId).populate("courseId");
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    const course = form.courseId; // Already populated
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Razorpay order options
    const options = {
      amount: Math.round(course.price * 100), // Always in paise
      currency: "INR",
      receipt: `rcpt_${studentId}_${Date.now()}`.slice(0, 40), // keep receipt length safe
    };

    // Create Razorpay order
    const order = await razorpay.orders.create(options);

    // Save payment record in DB
    const payment = await Payment.create({
      studentId: form._id,
      courseId: course._id,
      amount: course.price,
      currency: "INR",
      razorpayOrderId: order.id,
      paymentStatus: "paid",
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        paymentId: payment._id,
        orderId: order.id,
        amount: course.price,
        currency: "INR",
        courseName: course.name,
        studentName: form.fullName, // ✅ Optional - useful for frontend
      },
    });
  } catch (err) {
    console.error("Error in createPayment:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// ✅ Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body; // expected: "pending" or "paid"

    if (!["pending", "paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { paymentStatus: status },
      { new: true }
    ).populate("studentId courseId");

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, message: "Payment status updated", data: payment });
  } catch (err) {
    console.error("Error updating payment status:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("studentId courseId")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate("studentId courseId");

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};