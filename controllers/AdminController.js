const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');
const UserRegister = require('../models/registerUser');  // Correct reference
const generateToken = require('../config/token');
const Enrollment = require('../models/enrollment');
const {Course} = require('../models/coursesModel');
const mongoose = require('mongoose'); 
const razorpay = require('razorpay');
const Order = require("../models/Order")
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const htmlPdf = require('html-pdf');
const puppeteer = require('puppeteer-core');
const ChatGroup = require('../models/ChatGroup');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const executablePath = '/snap/bin/chromium';  // Path to Chromium found on your server

const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const streamifier = require("streamifier");

dotenv.config();



// Admin Registration
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    // Create new admin with plain password (No bcrypt)
    const newAdmin = await Admin.create({ name, email, password });

    // Generate JWT token
    const token = jwt.sign({ id: newAdmin._id, role: newAdmin.role }, 'your_jwt_secret_key', {
      expiresIn: '30d',
    });

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully!',
      data: {
        name: newAdmin.name,
        email: newAdmin.email,
        token,  // Send back the token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};



// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare the plain passwords (No bcrypt)
    if (admin.password !== password) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin._id, role: admin.role }, 'your_jwt_secret_key', {
      expiresIn: '30d',
    });

    res.status(200).json({
      success: true,
      message: 'Admin logged in successfully!',
      data: {
        adminId: admin._id,
        name: admin.name,
        email: admin.email,
        token,  // Send back the token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};




async function sendInvoiceEmail(newUser, generatedPassword, invoicePdfBuffer, invoiceId) {
  const mailOptions = {
    from: 'ganapathivaraprasad123@gmail.com',
    to: newUser.email,  // Make sure newUser.email is being used here
    subject: `Your Invoice - ${invoiceId}`,
    text: `Dear ${newUser.name},

    Greetings from TECHSTERKER!
    We hope this message finds you and your family in good health and high spirits.

    We are delighted to welcome you to TECHSTERKER – an institute dedicated to empowering the next generation of tech professionals through practical, career-focused training.

    :warning: **Your registration has been processed by our admin team.**
    :currency_exchange: **Please note, payment is pending** for your course registration. Kindly proceed with the payment to confirm your enrollment. The details of your course are as follows:

    :student: **Student Onboarding Details**
    Student Name: ${newUser.name}
    User ID: ${newUser.userId}
    Password: ${generatedPassword}
    Course: ${newUser.course}
    Payment Status: Pending
    Remaining Payment: ₹${newUser.remainingPayment.toFixed(2)}

    :repeat: **Note:** If you face any issues logging into the platform, please refresh the login page once or twice. This usually resolves most access issues.

    :telephone_receiver: **Need Help?**
    Our team is here to support you at every step.
    Phone: +91 90002 07286 (Available: 9:00 AM – 7:00 PM IST)
    Email: support@techsterker.com

    We have also tagged our customer support team in this email to assist you with your orientation and initial setup. Please feel free to reach out for any help you may need — we’re always happy to assist.

    We look forward to seeing you in class and wish you a successful learning experience!

    Welcome aboard, and let the learning begin!

    Warm regards,  
    Team TECHSTERKER`,
    attachments: [
      {
        filename: `Invoice_${invoiceId}.pdf`,
        content: invoicePdfBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}



exports.registerByAdmin = async (req, res) => {
  try {
    const {
      name, mobile, email, courseId, course, degree, department, yearOfPassedOut,
      company, role, experience, transactionId, advancePayment, isAdvancePayment
    } = req.body;

    // Validation for required fields
    if (!name || !mobile || !email || !courseId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Fetch course price from the database using courseId
    const courseData = await Course.findById(courseId);
    if (!courseData) {
      return res.status(400).json({ success: false, message: 'Invalid Course ID' });
    }

    const coursePrice = courseData.price;
    let finalAdvancePayment = 0;
    let totalPrice = coursePrice + (coursePrice * 5) / 100;  // Adding 5% GST

    // Generate a custom 4-digit password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);  // Hash the password

    // Generate a custom user ID (HICAP + last 4 digits of mobile)
    const customUserId = generateCustomUserId(mobile);

    // Save user to database with updated payment information
    const newUser = await UserRegister.create({
      userId: customUserId,  // Custom User ID (HICAP-1283)
      name,
      mobile,
      email,
      courseId,
      course,
      degree,
      department,
      yearOfPassedOut,
      company,
      role,
      experience,
      password: hashedPassword,  // Save the hashed version of the generated password
      generatedPassword,  // Save the plain generated password for reference
      totalPrice: totalPrice,  // Store the total price (course + GST)
      advancePayment: finalAdvancePayment,  // No advance payment in this case
      remainingPayment: totalPrice,  // Full remaining payment as no payment was made
      paymentStatus: 'Pending',  // Mark as Pending since no payment was made
    });

    // Since no payment was made, no order needs to be created
    // Optionally, we can add a "No Payment" order status or just skip order creation

    // Generate invoice HTML
    const invoiceId = generateInvoiceId();
    const invoiceHTML = createInvoiceHTML(newUser, generatedPassword, finalAdvancePayment, invoiceId, coursePrice);

    // Convert HTML to PDF
    const invoicePdfBuffer = await createPDF(invoiceHTML);

    // Send invoice via email (passing newUser now)
    await sendInvoiceEmail(newUser, generatedPassword, invoicePdfBuffer, invoiceId);

    // Send the response
    return res.status(200).json({
      success: true,
      message: 'User registration successful and invoice sent to the user\'s email.',
      data: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        courseId: newUser.courseId,
        course: newUser.course,
        totalPrice: totalPrice,
        advancePayment: finalAdvancePayment,
        remainingPayment: totalPrice,  // Remaining payment to be made by user
        paymentStatus: 'Pending',  // Payment status will be Pending
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'An error occurred', error: error.message });
  }
};



// Controller to create a new chat group
exports.createChatGroup = async (req, res) => {
  try {
    const { groupName, enrollmentId, enrolledUserIds } = req.body;

    // Step 1: Create the new chat group
    const chatGroup = new ChatGroup({
      groupName,
      enrollmentId,
      enrolledUsers: enrolledUserIds,
    });

    await chatGroup.save();

    // Step 2: Send notifications to enrolled users
    for (const userId of enrolledUserIds) {
      const user = await UserRegister.findById(userId);
      const notificationMessage = `You have been invited to join the group "${groupName}". Please accept to participate.`;

      const notification = new Notification({
        userId,
        message: notificationMessage,
        relatedGroupId: chatGroup._id, // Link notification to this group
      });

      await notification.save();

      // Optionally, we can send this notification via WebSocket (real-time push)
      // If you're using Socket.IO for real-time notifications
      // io.to(user.socketId).emit('newNotification', notification);
    }

    res.status(201).json({ ok: true, chatGroup });
  } catch (err) {
    console.error('Error creating chat group:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.sendMessage = async (req, res) => {
  try {
    const { chatGroupId, text, senderId } = req.body;
    const file = req.files?.media;

    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    if (!chatGroupId || !senderId) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    // 1️⃣ Check group
    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (!chatGroup) return res.status(404).json({ ok: false, message: "Chat group not found" });
    if (chatGroup.status !== "Accepted") {
      return res.status(400).json({
        ok: false,
        message: "You cannot send a message until you accept the invitation."
      });
    }

    // 2️⃣ Handle media upload
    let mediaUrl = null;
    if (file) {
      // Using tempFilePath safe method
      const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "chat-media",
        resource_type: "auto"
      });
      mediaUrl = uploadResult.secure_url;
    }

    // 3️⃣ Save message
    const message = new Message({
      chatGroupId,
      sender: senderId,
      text: text || "",
      media: mediaUrl
    });
    await message.save();

    res.status(201).json({
      ok: true,
      message,
      msg: mediaUrl
        ? "Message with media sent successfully."
        : "Text message sent successfully."
    });

  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};



exports.getAllChatGroups = async (req, res) => {
  try {
    const { userId } = req.query; // userId optional query parameter

    let query = {};
    if (userId) {
      query = { enrolledUsers: userId }; // Only groups where this user is enrolled
    }

    const chatGroups = await ChatGroup.find(query)
      .populate('enrolledUsers', 'name email') // Optional: populate user info
      .populate('enrollmentId', 'batchName courseId') // Optional: populate enrollment info
      .sort({ createdAt: -1 }); // Most recent groups first

    res.status(200).json({ ok: true, chatGroups });
  } catch (err) {
    console.error('Error fetching chat groups:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
