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
const executablePath = '/snap/bin/chromium';  // Path to Chromium found on your server



// Initialize Razorpay instance
const razorpayInstance = new razorpay({
  key_id: 'rzp_test_BxtRNvflG06PTV',
  key_secret: 'RecEtdcenmR7Lm4AIEwo4KFr',
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ganapathivaraprasad123@gmail.com", // Your Gmail account
    pass: "eqoufkewywjrpedn", // Gmail App password
  },
});

// Twilio initialization
const TWILIO_SID = "AC6dbc0f86b6481658d4b4bc471d1dfb32";
const TWILIO_AUTH_TOKEN = "c623dd368248f84be06e643750fae2f0";
const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// Function to generate a custom 4-digit password
function generateRandomPassword() {
  const randomPassword = Math.floor(1000 + Math.random() * 9000);  // Generates a 4-digit number
  return randomPassword.toString();
}

// Function to generate a custom user ID (HICAP + last 4 digits of the mobile number)
function generateCustomUserId(mobile) {
  const last4Digits = mobile.slice(-4); // Extract last 4 digits of mobile number
  return `HICAP${last4Digits}`;  // Format as HICAP-<last4digits>
}

// Function to generate a unique Invoice ID (e.g., INVOICEID-<random number>)
function generateInvoiceId() {
  return `INVOICEID-${Math.floor(Math.random() * 1000000)}`;
}

function createInvoiceHTML(newUser, generatedPassword, finalAdvancePayment, invoiceId, coursePrice) {
  // Calculate GST (5%) and total amount
  const gst = (coursePrice * 5) / 100;  
  const totalPrice = coursePrice + gst;  
  const remainingPayment = totalPrice - finalAdvancePayment;  

  return `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          width: 100px;
        }
        .company-details {
          text-align: right;
        }
        .company-details h2 {
          margin: 0;
        }
        .bill-details {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background: #f5f5f5;
        }
        .totals {
          margin-top: 20px;
          float: right;
          width: 50%;
        }
        .totals td {
          text-align: right;
        }
        .footer {
          text-align: center;
          margin-top: 60px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/Udemy_logo.svg" class="logo" alt="Company Logo" />
        </div>
        <div class="company-details">
          <h2>Your Company Pvt Ltd</h2>
          <p>123 Business Street, City, State - 000000</p>
          <p>Email: info@company.com | Phone: +91-9876543210</p>
        </div>
      </div>

      <div class="bill-details">
        <div>
          <h3>Bill To:</h3>
          <p><strong>${newUser.name}</strong></p>
          <p>${newUser.email}</p>
          <p>+91-${newUser.mobile}</p>
        </div>
        <div>
          <p><strong>Invoice No:</strong> ${invoiceId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <table>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
        <tr>
          <td>${newUser.course}</td>
          <td>1</td>
          <td>₹${coursePrice.toFixed(2)}</td>
          <td>₹${coursePrice.toFixed(2)}</td>
        </tr>
      </table>

      <table class="totals">
        <tr>
          <td><strong>Subtotal</strong></td>
          <td>₹${coursePrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>GST (5%)</strong></td>
          <td>₹${gst.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td>₹${totalPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Advance Payment</strong></td>
          <td>₹${finalAdvancePayment.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Remaining Payment</strong></td>
          <td>₹${remainingPayment.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Payment Status</strong></td>
          <td>Pending</td>
        </tr>
        <tr>
          <td><strong>Generated Password</strong></td>
          <td>${generatedPassword}</td>
        </tr>
      </table>

      <div class="footer">
        <p>Thank you for your registration!</p>
      </div>
    </body>
    </html>
  `;
}


async function createPDF(htmlContent) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
      ],
    });

    // Rest of your code remains the same...
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

async function sendInvoiceEmail(newUser, generatedPassword, invoicePdfBuffer, invoiceId) {
  const mailOptions = {
    from: 'ganapathivaraprasad123@gmail.com',
    to: newUser.email,  // Make sure newUser.email is being used here
    subject: `Your Invoice - ${invoiceId}`,
    text: `Dear ${newUser.name},

    Greetings from TECHSTERKER!
    We hope this message finds you and your family in good health and high spirits.

    We are delighted to welcome ${newUser.name} to TECHSTERKER – an institute dedicated to empowering the next generation of tech professionals through practical, career-focused training.

    At TECHSTERKER, we believe that learning thrives when mentors and learners collaborate to build strong technical foundations, ignite curiosity, and develop the problem-solving skills essential for success in today’s fast-paced digital world.

    Your classes will be conducted by experienced industry mentors. The date of commencement will be shared shortly by your assigned instructor.

    We understand that every learner brings their own unique strengths, ideas, and aspirations. Our goal is to provide an engaging, interactive, and industry-relevant training experience through our integrated, hands-on curriculum – designed to enhance your technical skills, creativity, and confidence.

    We are excited to be part of your journey into the world of technology. Let’s build something great together!

    :student: Student Onboarding Details
    Student Name: ${newUser.name}
    User ID: ${newUser.userId}
    Password: ${generatedPassword}
    Date of Joining: ${newUser.joiningDate}
    Platform: Online Classes

    :repeat: Note: If you face any issues logging into the platform, please refresh the login page once or twice. This usually resolves most access issues.

    :telephone_receiver: Need Help?
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

exports.register = async (req, res) => {
  try {
    const {
      name, mobile, email, courseId, course, degree, department, yearOfPassedOut,
      company, role, experience, transactionId, advancePayment, isAdvancePayment
    } = req.body;

    // Validation for required fields
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    // Fetch course price from the database using courseId
    const courseData = await Course.findById(courseId);
    if (!courseData) {
      return res.status(400).json({ success: false, message: 'Invalid Course ID' });
    }

    const coursePrice = courseData.price;
    let finalAdvancePayment;
    let totalPrice;

    // Calculate total price and advance payment
    if (isAdvancePayment) {
      finalAdvancePayment = 15000;  // Fixed advance payment if true
      totalPrice = coursePrice + (coursePrice * 5) / 100;  // Total price with 5% GST
    } else {
      finalAdvancePayment = 0;  // No advance payment if false
      totalPrice = coursePrice + (coursePrice * 5) / 100;  // Full price with GST
    }

    // Calculate remaining payment
    const remainingPayment = isAdvancePayment ? totalPrice - finalAdvancePayment : 0;

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
      generatedPassword,
      totalPrice: totalPrice,  // Store the total price
      advancePayment: finalAdvancePayment,  // Store the advance payment
      remainingPayment: remainingPayment,  // Store the remaining payment
      paymentStatus: isAdvancePayment ? 'Pending' : 'Completed',  // Set initial payment status
    });

    // Create order schema even if no advance payment is made
    const newOrder = await Order.create({
      transactionId: transactionId,
      userId: newUser._id,  // Store the ObjectId of the user created above
      courseId,
      totalAmount: totalPrice,
      advancePayment: finalAdvancePayment,
      remainingAmount: remainingPayment,
      paymentStatus: isAdvancePayment ? 'Pending' : 'Completed',
    });

    // Update user with Razorpay order ID or the created order ID
    newUser.orderId = newOrder._id;
    await newUser.save();

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
      message: 'Registration successful and invoice sent to your email.',
      data: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        courseId: newUser.courseId,
        course: newUser.course,
        totalPrice: totalPrice,
        advancePayment: finalAdvancePayment,
        remainingPayment: remainingPayment,
        orderId: newOrder._id,  // Include order details in response
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'An error occurred', error: error.message });
  }
};



exports.getAllPayments = async (req, res) => {
  try {
    // Fetch all user registrations (payments) and populate necessary details like courseId
    const payments = await UserRegister.find()  // Fetching all user registrations
      .populate("courseId", "courseName price")  // Populating course details
      .exec();  // Execute query

    // If no payments are found
    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: "No payments found" });
    }

    // Format the response data
    const paymentDetails = payments.map((payment) => {
      return {
        userId: payment.userId,  // Custom User ID (e.g., HICAP-1283)
        userName: payment.name,
        userEmail: payment.email,
        userMobile: payment.mobile,
        courseName: payment.course,  // Course name is available directly in the UserRegister schema
        totalAmount: payment.totalPrice,  // Total price (including GST) from UserRegister schema
        advancePayment: payment.advancePayment,
        remainingAmount: payment.remainingPayment,  // Remaining amount
        paymentStatus: payment.paymentStatus,  // Payment status from UserRegister schema
        coursePrice: payment.courseId ? payment.courseId.price : 0,  // Get price from populated courseId
      };
    });

    // Send the response with payment details
    return res.status(200).json({
      success: true,
      message: 'Payments fetched successfully',
      data: paymentDetails,
    });

  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({ success: false, message: "An error occurred while fetching payments", error: error.message });
  }
};


// Controller to get user and course details
exports.getRegisteredCourseDetails = async (req, res) => {
  try {
    const { userId } = req.params;  // Fetch the userId from the route parameters

    // Step 1: Fetch the user from the database
    const user = await UserRegister.findById(userId).populate('courseId');  // Assuming 'courseId' is the reference field in UserRegister

    // If user not found
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 2: Fetch the course data related to the user's enrolled course
    const course = await Course.findById(user.courseId)

    // If course not found
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Step 3: Send the response with populated course details
    return res.status(200).json({
      success: true,
      message: 'User and course details fetched successfully',
      data: {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          courseId: user.courseId,
        },
        course: {
          courseId: course._id,
          name: course.name,
          description: course.description,
          price: course.price,
          duration: course.duration,
          mode: course.mode,
          category: course.category,
          features: course.features,
          reviews: course.reviews,
          image: course.image,
          logoImage: course.logoImage,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'An error occurred', error: error.message });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // Accept email and password in the request body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find the user by email (we can use email as a unique identifier here)
    const user = await UserRegister.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Compare the entered password with the generatedPassword directly (no hashing)
    if (password !== user.generatedPassword) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Successful login, send user data along with token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        mobile: user.mobile,
        token: generateToken(user._id), // Assuming generateToken is a utility function
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users and populate enrolledCourses, courseId, and assignedMentors
    const users = await UserRegister.find()
      .populate({
        path: 'enrolledCourses',  // Populate the enrolledCourses field
        select: 'batchNumber batchName startDate timings duration category', // Select desired fields
        populate: [
          {
            path: 'courseId',  // Populate courseId inside the enrollment
            select: 'courseName description', // Select fields you need from Course (adjust fields as needed)
          },
          {
            path: 'assignedMentors',  // Populate assignedMentors inside the enrollment
            select: 'name expertise', // Select the fields you need from the Mentor model
          }
        ]
      });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    const user = await UserRegister.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    const user = await UserRegister.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phoneNumber },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await UserRegister.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add recommended courses to a user
exports.addRecommendedCourses = async (req, res) => {
try {
    const { userId, courseIds } = req.body; // courseIds: array of ObjectIds

    if (!userId || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userId and non-empty courseIds[] required' });
    }

    // Validate ObjectIds
    const badIds = courseIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (!mongoose.Types.ObjectId.isValid(userId) || badIds.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid ObjectId(s): ${[
          !mongoose.Types.ObjectId.isValid(userId) ? userId : null,
          ...badIds
        ].filter(Boolean).join(', ')}`
      });
    }

    // Ensure all courses exist
    const foundIds = await Course.find({ _id: { $in: courseIds } }).distinct('_id');
    const missing = courseIds.filter(id => !foundIds.map(String).includes(String(id)));
    if (missing.length) {
      return res.status(404).json({ success: false, message: `Courses not found: ${missing.join(', ')}` });
    }

    // Add without duplicates
    const user = await UserRegister.findByIdAndUpdate(
      userId,
      { $addToSet: { recommendedCourses: { $each: courseIds } } },
      { new: true }
    ).populate('recommendedCourses');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({
      success: true,
      message: 'Recommended courses updated',
      data: user.recommendedCourses
    });
  } catch (err) {
    console.error('Error adding recommended courses:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// Get recommended courses for a user
exports.getRecommendedCourses = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserRegister.findById(userId)
      .populate('recommendedCourses');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Recommended courses fetched successfully",
      data: user.recommendedCourses
    });

  } catch (error) {
    console.error("Error fetching recommended courses:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

