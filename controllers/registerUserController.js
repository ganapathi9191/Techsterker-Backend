const bcrypt = require('bcryptjs');
const UserRegister = require('../models/registerUser');  // Correct reference
const generateToken = require('../config/token');
//const Enrollment = require('../models/enrollment');
const { Course } = require('../models/coursesModel');
const mongoose = require('mongoose');
const razorpay = require('razorpay');
const Order = require("../models/Order")
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const htmlPdf = require('html-pdf');
const puppeteer = require('puppeteer-core');
const executablePath = '/snap/bin/chromium';  // Path to Chromium found on your server
const multer = require('multer');
const path = require("path");
const fs = require("fs");
const Invoice = require("../models/Invoicemodel") // ✅ CORRECT
const PDFDocument = require('pdfkit');
const {Enrollment} = require('../models/enrollment'); // ✅ Make sure path & model name are correct
const { Certificate,OurCertificate,Community } = require('../models/enrollment');
const { Mentor } = require("../models/ourMentors")
const csv = require('csv-parser');
const LiveClass = require('../models/liveClass');
const Attendance = require("../models/Attendance")
const VerifiedUser = require("../models/VerifiedUser")




const TWILIO_SID = "AC6dbc0f86b6481658d4b4bc471d1dfb32";
const TWILIO_AUTH_TOKEN = "c623dd368248f84be06e643750fae2f0";
const TWILIO_PHONE = "+19123489710";

const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `invoice-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// Function to generate a custom 4-digit password
function generateRandomPassword() {
  const randomPassword = Math.floor(1000 + Math.random() * 9000);
  return randomPassword.toString();
}

// Function to generate a custom user ID (HICAP + last 4 digits of the mobile number)
function generateCustomUserId(mobile) {
  const last4Digits = mobile.slice(-4);
  return `HICAP${last4Digits}`;
}

// Function to generate a unique Invoice ID
function generateInvoiceId() {
  return `INVOICEID-${Math.floor(Math.random() * 1000000)}`;
}

// Initialize Razorpay instance test keys
// const razorpayInstance = new razorpay({
//   key_id: 'rzp_test_BxtRNvflG06PTV',
//   key_secret: 'RecEtdcenmR7Lm4AIEwo4KFr',
// });


//live keys
const razorpayInstance = new razorpay({
  key_id: 'rzp_live_ROKQXDRUzOnshb',
  key_secret: 'q4uhcHWg4IZ6xb4yLQE4I1Ll',
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "techsterker@gmail.com",
    pass: "tzyyfbujianhxzuw",
  },
});

// Register function with ACTUAL PDF generation
exports.register = [
  upload.single('invoicePdf'),
  async (req, res) => {
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



       // Fetch the user from VerifiedUser database to check phone verification status
      const verifiedUser = await VerifiedUser.findOne({ mobile: mobile });

      if (!verifiedUser) {
        return res.status(400).json({ success: false, message: "Your mobile number is not registered for verification. Please verify your phone number first." });
      }

      if (!verifiedUser.verifyStatus) {
        return res.status(400).json({ success: false, message: "Your phone number is not verified. Please complete the verification process to proceed with registration." });
      }

      
      // Calculate GST (5%)
      const gstAmount = (coursePrice * 5) / 100;
      
      let finalAdvancePayment;
      let totalPrice;

      // Calculate total price and advance payment WITH GST
    if (isAdvancePayment) {
  const advanceWithoutGst = 15000;
  const gstOnAdvance = (advanceWithoutGst * 5) / 100;
  finalAdvancePayment = advanceWithoutGst + gstOnAdvance;
  totalPrice = coursePrice + gstAmount;
} else {
  totalPrice = coursePrice + gstAmount;
  finalAdvancePayment = totalPrice; // ✅ Set paid amount as full
}


      // Calculate remaining payment
      const remainingPayment = isAdvancePayment ? totalPrice - finalAdvancePayment : 0;

      // Generate a custom 4-digit password
      const generatedPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Generate a custom user ID
      const customUserId = generateCustomUserId(mobile);

      // Generate invoice ID
      const invoiceId = generateInvoiceId();

      // Save user to database with updated payment information
      const newUser = await UserRegister.create({
        userId: customUserId,
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
        password: hashedPassword,
        generatedPassword,
        totalPrice: totalPrice,
        advancePayment: finalAdvancePayment,
        remainingPayment: remainingPayment,
        paymentStatus: isAdvancePayment ? 'Pending' : 'Completed',
      });

      // Create order
      const newOrder = await Order.create({
        transactionId: transactionId,
        userId: newUser._id,
        courseId,
        totalAmount: totalPrice,
        advancePayment: finalAdvancePayment,
        remainingAmount: remainingPayment,
        paymentStatus: isAdvancePayment ? 'Pending' : 'Completed',
      });

      // Update user with order ID
      newUser.orderId = newOrder._id;
      await newUser.save();

      // ===== PDF GENERATION START =====
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const invoicesDir = path.join(__dirname, "../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Company Info
      const companyInfo = {
        name: "Techsterker",
        contact: "+91 9000239871",
        email: "info@techsterker.com",
        logoPath: path.join(__dirname, "../upload/logo.png"),
      };

      /// ===== Header =====
      if (fs.existsSync(companyInfo.logoPath)) {
        doc.image(companyInfo.logoPath, 50, 30, { width: 50 }); // 👈 smaller logo, shifted up
      }
      doc.fontSize(16).font("Helvetica-Bold").text(companyInfo.name, 120, 35); // 👈 shifted up
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Phone: ${companyInfo.contact}`, 120, 55)
        .text(`Email: ${companyInfo.email}`, 120, 70);

      doc.moveTo(50, 100).lineTo(550, 100).stroke(); // 👈 divider line bhi upar

      // ===== Bill To & Invoice Info =====
      doc.fontSize(11).font("Helvetica-Bold").text("Bill To:", 50, 115);
      doc.fontSize(10).font("Helvetica")
        .text(name, 50, 130)
        .text(`+91-${mobile}`, 50, 145)
        .text(email || "", 50, 160);

      doc.fontSize(10).text(`Invoice no: ${invoiceId}`, 400, 115);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 130);

      // ===== Table Header =====
      const tableTop = 190; // 👈 shifted up
      const itemHeight = 25;

      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, itemHeight).fill();
      doc.fillColor("black").font("Helvetica-Bold");
      doc.text("Description", 55, tableTop + 7);
      doc.text("Quantity", 300, tableTop + 7);
      doc.text("Unit Price", 370, tableTop + 7);
      doc.text("Amount", 460, tableTop + 7);
      doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
      doc.moveTo(50, tableTop + itemHeight).lineTo(550, tableTop + itemHeight).stroke();

      // ===== Table Items =====
      const items = [
        {
          description: course,
          quantity: 1,
          unitPrice: coursePrice,
          amount: coursePrice,
        },
      ];

      doc.font("Helvetica").fontSize(10);
      items.forEach((item, i) => {
        const y = tableTop + itemHeight + i * itemHeight;
        doc.text(item.description, 55, y + 7);
        doc.text(item.quantity.toString(), 305, y + 7);
        doc.text(`Rs.${item.unitPrice.toLocaleString()}/-`, 370, y + 7);
        doc.text(`Rs.${item.amount.toLocaleString()}/-`, 460, y + 7);
        doc.moveTo(50, y + itemHeight).lineTo(550, y + itemHeight).stroke();
      });

      // ===== Totals =====
      const totalsY = tableTop + itemHeight + items.length * itemHeight + 30;

      doc.font("Helvetica");
      doc.text(`Subtotal`, 370, totalsY);
      doc.text(`Rs.${coursePrice.toLocaleString()}/-`, 460, totalsY);

      doc.font("Helvetica");
      doc.text(`GST (5%)`, 370, totalsY + 15);
      doc.text(`Rs.${gstAmount.toLocaleString()}/-`, 460, totalsY + 15);

      doc.font("Helvetica-Bold");
      doc.text(`Total`, 370, totalsY + 30);
      doc.text(`Rs.${totalPrice.toLocaleString()}/-`, 460, totalsY + 30);

      doc.font("Helvetica-Bold");
      doc.text(`Paid Amount`, 370, totalsY + 45);
      doc.text(`Rs.${finalAdvancePayment.toLocaleString()}/-`, 460, totalsY + 45);

      doc.font("Helvetica-Bold");
      doc.text(`Balance Due`, 370, totalsY + 60);
      doc.text(`Rs.${remainingPayment.toLocaleString()}/-`, 460, totalsY + 60);

      // ===== Footer (Thank You) =====
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(
          "Thank you for choosing Techsterker! This is a computer-generated invoice.",
          50,
          totalsY + 90,
          { width: 500, align: "start" }
        );

      doc.end();

      // ===== After PDF ready =====
      writeStream.on("finish", async () => {
        try {
          console.log("PDF generated at:", filePath);

          const stats = fs.statSync(filePath);
          if (stats.size === 0) throw new Error("Generated PDF file is empty");

          // ✅ Correct URL path for static serving
          const pdfUrl = `/uploads/invoices/${fileName}`;
          const fullPdfUrl = `${req.protocol}://${req.get('host')}${pdfUrl}`;

          // Calculate due date (30 days from now)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          // ===== Save Invoice to Database =====
          const invoiceData = {
            invoiceNumber: invoiceId,
            studentId: newUser._id,
            paymentId: newOrder._id,
            issueDate: new Date(),
            dueDate: dueDate,
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount
            })),
            subtotal: coursePrice,
            gst: gstAmount,
            total: totalPrice,
            advancePayment: finalAdvancePayment,
            remainingPayment: remainingPayment,
            status: "sent",
            notes: "Thank you for choosing Techsterker!",
            pdfUrl: pdfUrl,
            fullPdfUrl: fullPdfUrl,
            companyInfo: {
              name: companyInfo.name,
              contact: companyInfo.contact,
              email: companyInfo.email
            }
          };

          console.log('Saving invoice to database:', invoiceData);

          let savedInvoice;
          try {
            savedInvoice = await Invoice.create(invoiceData);
            console.log("✅ Invoice saved to database:", savedInvoice._id);
          } catch (dbError) {
            console.error("❌ Error saving invoice to database:", dbError.message);
          }

          let emailSuccess = false,
            smsSuccess = false;

          // ===== Email =====
          if (email) {
            try {
              const mailOptions = {
                from: `"Techsterker" <techsterker@gmail.com>`,
                to: email,
                subject: `Invoice ${invoiceId} - ${course}`,
                html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#333;">
    <h2>Welcome to TECHSTERKER 🎉</h2>
    <p>Dear <strong>${name}</strong>,</p>

    <p>Greetings from <strong>TECHSTERKER</strong>! We hope this message finds you and your family in good health and high spirits.</p>

    <p>We are delighted to welcome <strong>${name}</strong> to TECHSTERKER – an institute dedicated to empowering the next generation of tech professionals through practical, career-focused training.</p>

    <p>At TECHSTERKER, we believe that learning thrives when mentors and learners collaborate to build strong technical foundations, ignite curiosity, and develop the problem-solving skills essential for success in today's fast-paced digital world.</p>

    <p>Your classes will be conducted by experienced industry mentors. The date of commencement will be shared shortly by your assigned instructor.</p>

    <!-- Onboarding Details -->
    <h3 style="margin-top: 20px;">📝 Student Onboarding Details</h3>
    <ul>
      <li><strong>Student Name:</strong> ${name}</li>
      <li><strong>User ID:</strong> ${customUserId}</li>
      <li><strong>Password:</strong> ${generatedPassword}</li>
      <li><strong>Platform:</strong> Online Classes</li>
    </ul>
    <p><strong>🔁 Note:</strong> If you face any issues logging into the platform, please refresh the login page once or twice. This usually resolves most access issues.</p>

    <!-- Support Info -->
    <h3 style="margin-top: 20px;">📞 Need Help?</h3>
    <p>Our team is here to support you at every step.</p>
    <ul>
      <li>
        <strong>Phone:</strong> +91 90002 39871 <br>
        <span style="margin-left:65px; color:#666;">(Available: 9:00 AM – 7:00 PM IST)</span>
      </li>
      <li><strong>Email:</strong> techsterker@gmail.com</li>
      <li>
        <strong>Login Here:</strong> 
        <a href="https://www.techsterker.com/" target="_blank">https://www.techsterker.com/</a>
      </li>
    </ul>

    <p>We have also tagged our customer support team in this email to assist you with your orientation and initial setup. Please feel free to reach out for any help you may need — we're always happy to assist.</p>

    <p>We look forward to seeing you in class and wish you a successful learning experience!</p>

    <p>Welcome aboard, and let the learning begin! 🚀</p>

    <p style="margin-top: 30px;">
      Warm regards,<br>
      <strong>Team TECHSTERKER</strong>
    </p>
  </div>
`,
                attachments: [
                  {
                    filename: fileName,
                    path: filePath,
                    contentType: "application/pdf",
                  },
                ],
              };

              const info = await transporter.sendMail(mailOptions);
              console.log("✅ Email sent:", info.messageId);
              emailSuccess = true;
            } catch (err) {
              console.error("❌ Email sending failed:", err.message);
            }
          }

          // ===== SMS =====
          if (mobile) {
            try {
              const smsMessage = `Hi ${name}, Invoice ${invoiceId} for ${course} (Course: Rs.${coursePrice}/-, GST: Rs.${gstAmount}/-, Total: Rs.${totalPrice}/-, Paid Amount: Rs.${finalAdvancePayment}/-, Due: Rs.${remainingPayment}/-) Download: ${fullPdfUrl}. User ID: ${customUserId}, Password: ${generatedPassword}`;

              const smsResult = await client.messages.create({
                body: smsMessage,
                from: TWILIO_PHONE,
                to: `+91${mobile}`,
              });

              console.log("✅ SMS sent:", smsResult.sid);
              smsSuccess = true;
            } catch (err) {
              console.error("❌ SMS sending failed:", err.message);
            }
          }

          // Create Razorpay order
          const razorpayOrder = await razorpayInstance.orders.create({
            amount: totalPrice * 100,
            currency: "INR",
            receipt: newOrder._id.toString(),
            payment_capture: 1,
          });

          // Send response
          res.status(200).json({
            success: true,
            message: "Registration successful and invoice generated",
            razorpayOrderId: razorpayOrder.id,
            data: {
              userId: newUser.userId,
              name: newUser.name,
              email: newUser.email,
              mobile: newUser.mobile,
              courseId: newUser.courseId,
              course: newUser.course,
              coursePrice: coursePrice,
              gstAmount: gstAmount,
              totalPrice: totalPrice,
              paidAmount: finalAdvancePayment, // Changed from advancePayment to paidAmount
              remainingPayment: remainingPayment,
              orderId: newOrder._id,
              invoice: {
                invoiceId: savedInvoice?._id,
                invoiceNumber: invoiceId,
                pdfUrl: pdfUrl,
                fullPdfUrl: fullPdfUrl,
                issueDate: invoiceData.issueDate,
                dueDate: invoiceData.dueDate,
                totalAmount: totalPrice,
                status: "sent",
              },
              notifications: {
                emailSent: emailSuccess,
                smsSent: smsSuccess,
                databaseSaved: !!savedInvoice
              },
            },
          });

        } catch (err) {
          console.error("❌ Post-PDF process error:", err.message);
          res.status(500).json({
            success: false,
            message: "An error occurred while sending the invoice.",
          });
        }
      });

      writeStream.on("error", (err) => {
        console.error("❌ PDF write stream error:", err);
        res.status(500).json({
          success: false,
          message: "Error generating PDF file",
        });
      });

    } catch (err) {
      console.error("❌ Error in registration:", err.message);
      res.status(500).json({
        success: false,
        message: "An error occurred during registration.",
      });
    }
  },
];



//create user by admin

exports.adminCreateInvoice = [
  upload.single('invoicePdf'),
  async (req, res) => {
    try {
      const {
        name, mobile, email, courseId, course, degree, department, yearOfPassedOut,
        company, role, experience, isAdvancePayment
      } = req.body;

      // Fetch course price
      const courseData = await Course.findById(courseId);
      if (!courseData) {
        return res.status(400).json({ success: false, message: 'Invalid Course ID' });
      }

      const coursePrice = courseData.price;
      
      // Calculate GST (5%)
      const gstAmount = (coursePrice * 5) / 100;
      const totalPrice = coursePrice + gstAmount;
      
      let finalAdvancePayment;
      let remainingPayment;

      // Calculate advance payment with GST proportion
      if (isAdvancePayment) {
        const advanceWithoutGst = 15000;
        const gstOnAdvance = (advanceWithoutGst * 5) / 100;
        finalAdvancePayment = advanceWithoutGst + gstOnAdvance;
        remainingPayment = totalPrice - finalAdvancePayment;
      } else {
        finalAdvancePayment = totalPrice;
        remainingPayment = 0;
      }

      // Generate password and user ID
      const generatedPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      const customUserId = generateCustomUserId(mobile);

      // Generate invoice ID
      const invoiceId = generateInvoiceId();

      // Save user
      const newUser = await UserRegister.create({
        userId: customUserId,
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
        password: hashedPassword,
        generatedPassword,
        totalPrice,
        advancePayment: finalAdvancePayment,
        remainingPayment,
        paymentStatus: isAdvancePayment ? 'Pending' : 'Completed',
      });

      // ===== PDF Generation =====
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const invoicesDir = path.join(__dirname, "../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

      const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const companyInfo = {
        name: "Techsterker",
        contact: "+91 9000239871",
        email: "info@techsterker.com",
        logoPath: path.join(__dirname, "../upload/logo.png"),
      };

      if (fs.existsSync(companyInfo.logoPath)) doc.image(companyInfo.logoPath, 50, 30, { width: 50 });
      doc.fontSize(16).font("Helvetica-Bold").text(companyInfo.name, 120, 35);
      doc.fontSize(10).font("Helvetica")
        .text(`Phone: ${companyInfo.contact}`, 120, 55)
        .text(`Email: ${companyInfo.email}`, 120, 70);

      doc.moveTo(50, 100).lineTo(550, 100).stroke();

      // Bill to
      doc.fontSize(11).font("Helvetica-Bold").text("Bill To:", 50, 115);
      doc.fontSize(10).font("Helvetica")
        .text(name, 50, 130)
        .text(`+91-${mobile}`, 50, 145)
        .text(email || "", 50, 160);

      doc.fontSize(10).text(`Invoice no: ${invoiceId}`, 400, 115);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 130);

      const tableTop = 190;
      const itemHeight = 25;

      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, itemHeight).fill();
      doc.fillColor("black").font("Helvetica-Bold");
      doc.text("Description", 55, tableTop + 7);
      doc.text("Quantity", 300, tableTop + 7);
      doc.text("Unit Price", 370, tableTop + 7);
      doc.text("Amount", 460, tableTop + 7);
      doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
      doc.moveTo(50, tableTop + itemHeight).lineTo(550, tableTop + itemHeight).stroke();

      const items = [
        { description: course, quantity: 1, unitPrice: coursePrice, amount: coursePrice }
      ];

      doc.font("Helvetica").fontSize(10);
      items.forEach((item, i) => {
        const y = tableTop + itemHeight + i * itemHeight;
        doc.text(item.description, 55, y + 7);
        doc.text(item.quantity.toString(), 305, y + 7);
        doc.text(`Rs.${item.unitPrice.toLocaleString()}/-`, 370, y + 7);
        doc.text(`Rs.${item.amount.toLocaleString()}/-`, 460, y + 7);
        doc.moveTo(50, y + itemHeight).lineTo(550, y + itemHeight).stroke();
      });

      const totalsY = tableTop + itemHeight + items.length * itemHeight + 30;

      // Updated totals section with GST
      doc.font("Helvetica");
      doc.text(`Subtotal`, 370, totalsY);
      doc.text(`Rs.${coursePrice.toLocaleString()}/-`, 460, totalsY);

      doc.font("Helvetica");
      doc.text(`GST (5%)`, 370, totalsY + 15);
      doc.text(`Rs.${gstAmount.toLocaleString()}/-`, 460, totalsY + 15);

      doc.font("Helvetica-Bold");
      doc.text(`Total`, 370, totalsY + 30);
      doc.text(`Rs.${totalPrice.toLocaleString()}/-`, 460, totalsY + 30);

      doc.font("Helvetica-Bold");
      doc.text(`Paid Amount`, 370, totalsY + 45);
      doc.text(`Rs.${finalAdvancePayment.toLocaleString()}/-`, 460, totalsY + 45);

      doc.font("Helvetica-Bold");
      doc.text(`Balance Due`, 370, totalsY + 60);
      doc.text(`Rs.${remainingPayment.toLocaleString()}/-`, 460, totalsY + 60);

      doc.fontSize(9).fillColor("#666")
        .text("Thank you for choosing Techsterker! This is a computer-generated invoice.", 50, totalsY + 90, { width: 500, align: "start" });

      doc.end();

      writeStream.on("finish", async () => {
        const pdfUrl = `/uploads/invoices/${fileName}`;
        const fullPdfUrl = `${req.protocol}://${req.get('host')}${pdfUrl}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const invoiceData = {
          invoiceNumber: invoiceId,
          studentId: newUser._id,
          issueDate: new Date(),
          dueDate,
          items,
          subtotal: coursePrice,
          gst: gstAmount,
          total: totalPrice,
          advancePayment: finalAdvancePayment,
          remainingPayment,
          status: "sent",
          notes: "Thank you for choosing Techsterker!",
          pdfUrl,
          fullPdfUrl,
          companyInfo
        };

        let savedInvoice;
        try { 
          savedInvoice = await Invoice.create(invoiceData); 
        } 
        catch (dbError) { 
          console.error("Invoice DB save failed:", dbError.message); 
        }

        // Email
        let emailSuccess = false;
        if (email) {
          try {
            await transporter.sendMail({
              from: `"Techsterker" <techsterker@gmail.com>`,
              to: email,
              subject: `Invoice ${invoiceId} - ${course}`,
              html: `<p>Hi ${name},</p>
<p>This is your invoice for the course <strong>${course}</strong>. Course Fee: Rs.${coursePrice.toLocaleString()}/-, GST: Rs.${gstAmount.toLocaleString()}/-, Total Amount: Rs.${totalPrice.toLocaleString()}/-, Paid: Rs.${finalAdvancePayment.toLocaleString()}/-, Balance Due: Rs.${remainingPayment.toLocaleString()}/-.</p>
<p>You can download your invoice here: <a href="${fullPdfUrl}">${fullPdfUrl}</a></p>
<p>Your login credentials: User ID: ${customUserId}, Password: ${generatedPassword}</p>`,
              attachments: [{ filename: fileName, path: filePath }]
            });
            emailSuccess = true;
          } catch (err) { 
            console.error("Email failed:", err.message); 
          }
        }

        // SMS
        let smsSuccess = false;
        if (mobile) {
          try {
            await client.messages.create({
              body: `Hi ${name}, Invoice ${invoiceId} for ${course} (Course: Rs.${coursePrice}/-, GST: Rs.${gstAmount}/-, Total: Rs.${totalPrice}/-, Paid: Rs.${finalAdvancePayment}/-, Due: Rs.${remainingPayment}/-) Download: ${fullPdfUrl}. User ID: ${customUserId}, Password: ${generatedPassword}`,
              from: TWILIO_PHONE,
              to: `+91${mobile}`
            });
            smsSuccess = true;
          } catch (err) { 
            console.error("SMS failed:", err.message); 
          }
        }

        // Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: totalPrice * 100,
          currency: "INR",
          receipt: newUser._id.toString(),
          payment_capture: 1,
        });

        res.status(200).json({
          success: true,
          message: "Invoice created by admin successfully",
          razorpayOrderId: razorpayOrder.id,
          data: {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            mobile: newUser.mobile,
            courseId: newUser.courseId,
            course: newUser.course,
            coursePrice: coursePrice,
            gstAmount: gstAmount,
            totalPrice: totalPrice,
            advancePayment: finalAdvancePayment,
            remainingPayment: remainingPayment,
            invoice: {
              invoiceId: savedInvoice?._id,
              invoiceNumber: invoiceId,
              pdfUrl,
              fullPdfUrl,
              issueDate: invoiceData.issueDate,
              dueDate: invoiceData.dueDate,
              totalAmount: totalPrice,
              status: "sent",
            },
            notifications: {
              emailSent: emailSuccess,
              smsSent: smsSuccess,
              databaseSaved: !!savedInvoice
            }
          }
        });
      });

      writeStream.on("error", (err) => {
        console.error("PDF write error:", err);
        res.status(500).json({ success: false, message: "Error generating PDF" });
      });

    } catch (err) {
      console.error("Admin invoice error:", err);
      res.status(500).json({ success: false, message: "Error creating invoice" });
    }
  }
];



// Controller for admin to generate initial invoice without any payment
exports.generateInitialInvoice = [
  upload.none(),
  async (req, res) => {
    try {
      const {
        name, mobile, email, courseId, course, degree, department, yearOfPassedOut,
        company, role, experience, totalAmount, upiId, paymentMode
      } = req.body;

      // Validation for required fields
      if (!name || !mobile || !course || !totalAmount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, mobile, course, and total amount are required fields' 
        });
      }

      const coursePrice = parseFloat(totalAmount);
      
      // Calculate GST (5%)
      const gstAmount = (coursePrice * 5) / 100;
      const totalPrice = coursePrice + gstAmount;
      
      // User ne abhi kuch bhi pay nahi kiya hai - initial invoice hai
      const paidAmount = 0;
      const remainingPayment = totalPrice;

      // Generate a custom 4-digit password
      const generatedPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Generate a custom user ID
      const customUserId = generateCustomUserId(mobile);

      // Generate invoice ID
      const invoiceId = generateInvoiceId();

      // Save user to database with Pending payment status
      const newUser = await UserRegister.create({
        userId: customUserId,
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
        password: hashedPassword,
        generatedPassword,
        totalPrice: totalPrice,
        advancePayment: paidAmount, // 0 since no payment yet
        remainingPayment: remainingPayment, // Total amount due
        paymentStatus: 'Pending', // Initial status
        paymentMode: paymentMode || 'Manual',
      });

      // Create order
      const newOrder = await Order.create({
        transactionId: `INITIAL-${Date.now()}`,
        userId: newUser._id,
        courseId,
        totalAmount: totalPrice,
        advancePayment: paidAmount, // 0
        remainingAmount: remainingPayment, // Full amount
        paymentStatus: 'Pending',
        paymentMode: paymentMode || 'Manual',
      });

      // Update user with order ID
      newUser.orderId = newOrder._id;
      await newUser.save();

      // ===== PDF GENERATION START =====
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const invoicesDir = path.join(__dirname, "../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Company Info
      const companyInfo = {
        name: "Techsterker",
        contact: "+91 9000239871",
        email: "info@techsterker.com",
        logoPath: path.join(__dirname, "../upload/logo.png"),
      };

      // ===== Header =====
      if (fs.existsSync(companyInfo.logoPath)) {
        doc.image(companyInfo.logoPath, 50, 30, { width: 50 });
      }
      doc.fontSize(16).font("Helvetica-Bold").text(companyInfo.name, 120, 35);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Phone: ${companyInfo.contact}`, 120, 55)
        .text(`Email: ${companyInfo.email}`, 120, 70);

      doc.moveTo(50, 100).lineTo(550, 100).stroke();

      // ===== Bill To & Invoice Info =====
      doc.fontSize(11).font("Helvetica-Bold").text("Bill To:", 50, 115);
      doc.fontSize(10).font("Helvetica")
        .text(name, 50, 130)
        .text(`+91-${mobile}`, 50, 145)
        .text(email || "", 50, 160);

      doc.fontSize(10).text(`Invoice no: ${invoiceId}`, 400, 115);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 130);

      // ===== Table Header =====
      const tableTop = 190;
      const itemHeight = 25;

      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, itemHeight).fill();
      doc.fillColor("black").font("Helvetica-Bold");
      doc.text("Description", 55, tableTop + 7);
      doc.text("Quantity", 300, tableTop + 7);
      doc.text("Unit Price", 370, tableTop + 7);
      doc.text("Amount", 460, tableTop + 7);
      doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
      doc.moveTo(50, tableTop + itemHeight).lineTo(550, tableTop + itemHeight).stroke();

      // ===== Table Items =====
      const items = [
        {
          description: course,
          quantity: 1,
          unitPrice: coursePrice,
          amount: coursePrice,
        },
      ];

      doc.font("Helvetica").fontSize(10);
      items.forEach((item, i) => {
        const y = tableTop + itemHeight + i * itemHeight;
        doc.text(item.description, 55, y + 7);
        doc.text(item.quantity.toString(), 305, y + 7);
        doc.text(`Rs.${item.unitPrice.toLocaleString()}/-`, 370, y + 7);
        doc.text(`Rs.${item.amount.toLocaleString()}/-`, 460, y + 7);
        doc.moveTo(50, y + itemHeight).lineTo(550, y + itemHeight).stroke();
      });

      // ===== Totals =====
      const totalsY = tableTop + itemHeight + items.length * itemHeight + 30;

      doc.font("Helvetica");
      doc.text(`Subtotal`, 370, totalsY);
      doc.text(`Rs.${coursePrice.toLocaleString()}/-`, 460, totalsY);

      doc.font("Helvetica");
      doc.text(`GST (5%)`, 370, totalsY + 15);
      doc.text(`Rs.${gstAmount.toLocaleString()}/-`, 460, totalsY + 15);

      doc.font("Helvetica-Bold");
      doc.text(`Total Amount`, 370, totalsY + 30); // Changed to Total Amount
      doc.text(`Rs.${totalPrice.toLocaleString()}/-`, 460, totalsY + 30);

      // ===== Payment Instructions =====
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text(`Payment Instructions:`, 50, totalsY + 60);
      doc.font("Helvetica");
      doc.text(`Please pay the total amount of Rs.${totalPrice.toLocaleString()}/- using:`, 50, totalsY + 75);
      
      if (upiId) {
        doc.text(`UPI ID: ${upiId}`, 50, totalsY + 90);
      }
      
      if (paymentMode) {
        doc.text(`Payment Mode: ${paymentMode}`, 50, totalsY + (upiId ? 105 : 90));
      }

      doc.text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 50, totalsY + (upiId ? 120 : 105));

      // ===== Footer (Thank You) =====
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(
          "Thank you for choosing Techsterker! This is a computer-generated invoice.",
          50,
          totalsY + 150,
          { width: 500, align: "start" }
        );

      doc.end();

      // ===== After PDF ready =====
      writeStream.on("finish", async () => {
        try {
          console.log("PDF generated at:", filePath);

          const stats = fs.statSync(filePath);
          if (stats.size === 0) throw new Error("Generated PDF file is empty");

          const pdfUrl = `/uploads/invoices/${fileName}`;
          const fullPdfUrl = `${req.protocol}://${req.get('host')}${pdfUrl}`;

          // Calculate due date (30 days from now)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          // ===== Save Invoice to Database =====
          const invoiceData = {
            invoiceNumber: invoiceId,
            studentId: newUser._id,
            paymentId: newOrder._id,
            issueDate: new Date(),
            dueDate: dueDate,
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount
            })),
            subtotal: coursePrice,
            gst: gstAmount,
            total: totalPrice,
            advancePayment: paidAmount, // 0
            remainingPayment: remainingPayment, // Full amount
            status: "sent",
            notes: "Initial invoice - Payment pending",
            pdfUrl: pdfUrl,
            fullPdfUrl: fullPdfUrl,
            companyInfo: {
              name: companyInfo.name,
              contact: companyInfo.contact,
              email: companyInfo.email
            },
            paymentInstructions: {
              upiId: upiId || "Not provided",
              paymentMode: paymentMode || 'Manual Transfer',
              dueAmount: remainingPayment,
              dueDate: dueDate
            }
          };

          console.log('Saving invoice to database:', invoiceData);

          let savedInvoice;
          try {
            savedInvoice = await Invoice.create(invoiceData);
            console.log("✅ Invoice saved to database:", savedInvoice._id);
          } catch (dbError) {
            console.error("❌ Error saving invoice to database:", dbError.message);
          }

          let emailSuccess = false,
            smsSuccess = false;

          // ===== Email =====
          if (email) {
            try {
              const mailOptions = {
                from: `"Techsterker" <techsterker@gmail.com>`,
                to: email,
                subject: `Invoice ${invoiceId} - ${course} - Payment Required`,
                html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#333;">
    <h2>Welcome to TECHSTERKER 🎉</h2>
    <p>Dear <strong>${name}</strong>,</p>

    <p>Greetings from <strong>TECHSTERKER</strong>! We are pleased to onboard you for the <strong>${course}</strong> course.</p>

    <!-- Onboarding Details -->
    <h3 style="margin-top: 20px;">📝 Student Onboarding Details</h3>
    <ul>
      <li><strong>Student Name:</strong> ${name}</li>
      <li><strong>User ID:</strong> ${customUserId}</li>
      <li><strong>Password:</strong> ${generatedPassword}</li>
      <li><strong>Platform:</strong> Online Classes</li>
    </ul>

    <!-- Payment Instructions -->
    <h3 style="margin-top: 20px;">💳 Payment Instructions</h3>
    <p>Please complete the payment of <strong>Rs.${totalPrice.toLocaleString()}/-</strong> to activate your course.</p>
    ${upiId ? `
    <ul>
      <li><strong>UPI ID:</strong> ${upiId}</li>
      <li><strong>Payment Mode:</strong> ${paymentMode || 'UPI Transfer'}</li>
    </ul>
    ` : '<p>Please contact admin for payment details.</p>'}
    
    <p><strong>Note:</strong> Your course access will be activated after payment confirmation.</p>

    <p><strong>🔁 Note:</strong> If you face any issues logging into the platform, please refresh the login page once or twice.</p>

    <!-- Support Info -->
    <h3 style="margin-top: 20px;">📞 Need Help?</h3>
    <p>Our team is here to support you at every step.</p>
    <ul>
      <li>
        <strong>Phone:</strong> +91 90002 39871 <br>
        <span style="margin-left:65px; color:#666;">(Available: 9:00 AM – 7:00 PM IST)</span>
      </li>
      <li><strong>Email:</strong> techsterker@gmail.com</li>
      <li>
        <strong>Login Here:</strong> 
        <a href="https://www.techsterker.com/" target="_blank">https://www.techsterker.com/</a>
      </li>
    </ul>

    <p>We look forward to seeing you in class!</p>

    <p style="margin-top: 30px;">
      Warm regards,<br>
      <strong>Team TECHSTERKER</strong>
    </p>
  </div>
`,
                attachments: [
                  {
                    filename: fileName,
                    path: filePath,
                    contentType: "application/pdf",
                  },
                ],
              };

              const info = await transporter.sendMail(mailOptions);
              console.log("✅ Email sent:", info.messageId);
              emailSuccess = true;
            } catch (err) {
              console.error("❌ Email sending failed:", err.message);
            }
          }

          // ===== SMS =====
          if (mobile) {
            try {
              let smsMessage = `Hi ${name}, Invoice ${invoiceId} for ${course}. Total Amount: Rs.${totalPrice}/- (Due: Rs.${remainingPayment}/-). Download: ${fullPdfUrl}. User ID: ${customUserId}, Password: ${generatedPassword}`;
              
              if (upiId) {
                smsMessage += ` Pay via UPI: ${upiId}`;
              }

              const smsResult = await client.messages.create({
                body: smsMessage,
                from: TWILIO_PHONE,
                to: `+91${mobile}`,
              });

              console.log("✅ SMS sent:", smsResult.sid);
              smsSuccess = true;
            } catch (err) {
              console.error("❌ SMS sending failed:", err.message);
            }
          }

          // Send response
          res.status(200).json({
            success: true,
            message: "Initial invoice generated successfully. User needs to make payment.",
            data: {
              userId: newUser.userId,
              name: newUser.name,
              email: newUser.email,
              mobile: newUser.mobile,
              course: newUser.course,
              totalAmountDue: totalPrice,
              paymentStatus: 'Pending',
              orderId: newOrder._id,
              invoice: {
                invoiceId: savedInvoice?._id,
                invoiceNumber: invoiceId,
                pdfUrl: pdfUrl,
                fullPdfUrl: fullPdfUrl,
                issueDate: invoiceData.issueDate,
                dueDate: invoiceData.dueDate,
                totalAmount: totalPrice,
                status: "sent",
              },
              paymentInstructions: {
                upiId: upiId || "Contact admin",
                paymentMode: paymentMode || 'Manual Transfer',
                dueAmount: remainingPayment,
                dueDate: dueDate
              },
              notifications: {
                emailSent: emailSuccess,
                smsSent: smsSuccess,
                databaseSaved: !!savedInvoice
              },
            },
          });

        } catch (err) {
          console.error("❌ Post-PDF process error:", err.message);
          res.status(500).json({
            success: false,
            message: "An error occurred while sending the invoice.",
          });
        }
      });

      writeStream.on("error", (err) => {
        console.error("❌ PDF write stream error:", err);
        res.status(500).json({
          success: false,
          message: "Error generating PDF file",
        });
      });

    } catch (err) {
      console.error("❌ Error in initial invoice generation:", err.message);
      res.status(500).json({
        success: false,
        message: "An error occurred during initial invoice generation.",
      });
    }
  },
];




exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ issueDate: -1 });

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No invoices found",
        data: [],
      });
    }

    // Fetch user details for each invoice
    const formattedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        let studentData = null;

        if (inv.studentId) {
          // Query by ObjectId
          studentData = await UserRegister.findById(
            inv.studentId,
            "name mobile email userId course"
          );
        }

        return {
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          student: studentData
            ? {
                userId: studentData.userId,
                name: studentData.name,
                email: studentData.email,
                mobile: studentData.mobile,
                course: studentData.course,
              }
            : null,
          paymentId: inv.paymentId || null,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          items: inv.items,
          subtotal: inv.subtotal,
          gst: inv.gst,
          totalAmount: inv.total,
          status: inv.status,
          pdfUrl: inv.pdfUrl,
          fullPdfUrl: inv.fullPdfUrl,
          companyInfo: inv.companyInfo,
          paymentInstructions: inv.paymentInstructions,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      count: formattedInvoices.length,
      data: formattedInvoices,
    });
  } catch (err) {
    console.error("❌ Error fetching invoices:", err.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching invoices",
    });
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
    const { userId, generatedPassword } = req.body; // Accept userId and generatedPassword in the request body

    if (!userId || !generatedPassword) {
      return res.status(400).json({ success: false, message: 'User ID and password are required' });
    }

    // Find the user by userId (as it's unique)
    const user = await UserRegister.findOne({ userId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Compare the entered password with the generatedPassword (no hashing involved in this case)
    if (generatedPassword !== user.generatedPassword) {
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
        userId: user.userId, // Include userId in the response data
        token: generateToken(user._id), // Assuming generateToken is a utility function that generates JWT
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
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




// Get Education Dashboard Data
exports.getEducationDashboard = async (req, res) => {
  try {
    // Dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parallel queries (fast execution)
    const [
      totalStudents,
      totalMentors,
      todaysEnrollments,
      completedCoursesToday,
      revenueToday,
      dailyActive,
      weeklyActive,
      monthlyActive,
      earningsData,
      enrollmentData,
      studentInsightsData,
      mentorInsightsData
    ] = await Promise.all([
      // Total Students
      UserRegister.countDocuments(),

      // Total Mentors
      Mentor.countDocuments(),

      // Today's Enrollments
      UserRegister.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Today's Completed Certificates
      Certificate.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        status: "Approved"
      }),

      // Today's Revenue
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
            paymentStatus: "Completed"
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),

      // Active Students
      UserRegister.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      UserRegister.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      UserRegister.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),

      // Earnings Data (chart)
      Order.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$amount" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Enrollment Data (chart)
      Enrollment.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Student Insights Table
      UserRegister.find().select("name email mobile createdAt"),

      // Mentor Insights Table
      Mentor.find().select("name expertise createdAt")
    ]);

    // Final dashboard data
    const dashboardData = {
      totals: {
        students: totalStudents,
        mentors: totalMentors,
        categories: 12 // agar Categories model hai toh yaha count karna
      },
      todayStats: {
        todaysEnrollments,
        completedCoursesToday,
        revenueToday: revenueToday.length > 0 ? revenueToday[0].total : 0
      },
      activeStudents: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive
      },
      charts: {
        earningsData,
        enrollmentData
      },
      tables: {
        studentInsightsData,
        mentorInsightsData
      }
    };

    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};



exports.uploadBulkAttendanceCSV = async (req, res) => {
  const { mentorId } = req.params;

  if (!mentorId) {
    return res.status(400).json({ success: false, message: "mentorId is required in params" });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "CSV file is required" });
  }

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      results.push(data);
    })
    .on("end", async () => {
      try {
        const attendanceEntries = results.map(row => ({
          className: row["Class Name"]?.trim(),
          subject: row["Subject"]?.trim(),
          date: new Date(row["Date"]),
          timing: row["Timing"]?.trim(),
          studentName: row["Student Name"]?.trim(),
          enrollmentId: row["Enrollment ID"]?.trim(),
          status: row["Status"]?.trim().toLowerCase(),
        }));

        // Create one Attendance document with all entries in attendance array
        const newAttendance = new Attendance({
          mentorId,
          attendance: attendanceEntries,
        });

        await newAttendance.save();
        fs.unlinkSync(filePath);

        return res.status(201).json({
          success: true,
          message: `Attendance batch uploaded successfully with ${attendanceEntries.length} entries.`,
          attendanceId: newAttendance._id,
        });
      } catch (error) {
        console.error("CSV processing error:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ success: false, message: "Server error while processing attendance." });
      }
    })
    .on("error", (err) => {
      console.error("CSV read error:", err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, message: "Error reading CSV file." });
    });
};




// Assuming Attendance is already imported:
// const Attendance = require('path-to-your-attendance-model');

exports.getAttendanceByMentor = async (req, res) => {
  const { mentorId } = req.params;

  if (!mentorId) {
    return res.status(400).json({ success: false, message: "mentorId is required in params" });
  }

  try {
    const attendances = await Attendance.find({ mentorId }).sort({ createdAt: -1 });

    if (!attendances.length) {
      return res.status(404).json({ success: false, message: "No attendance records found for this mentor." });
    }

    // Flatten all attendance arrays into one
    const allAttendance = attendances.reduce((acc, record) => {
      return acc.concat(record.attendance);
    }, []);

    return res.status(200).json({
      success: true,
      mentorId: mentorId,
      attendance: allAttendance,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching attendance." });
  }
};



exports.getMentorDashboard = async (req, res) => {
  try {
    const { mentorId } = req.params;

    // Fetch mentor with enrolled batches and assigned courses, with deep population
    const mentor = await Mentor.findById(mentorId)
      .populate({
        path: "enrolledBatches",
        populate: {
          path: "courseId",
          select: "title description price duration level",
        },
      })
      .populate({
        path: "assignedCourses",
        populate: [
          { path: "courseId", select: "title description price duration level" },
          { path: "enrolledUsers", model: "UserRegister", select: "name email mobile" } // Only name, email, and mobile populated
        ],
      });

    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }

    // Total students taught (sum of enrolledUsers length in assignedCourses)
    const totalStudentsTaught = mentor.assignedCourses.reduce((acc, course) => {
      return acc + (course.enrolledUsers ? course.enrolledUsers.length : 0);
    }, 0);

    // Total courses created
    const totalCoursesCreated = mentor.assignedCourses.length;

    // Average rating calculation (assuming mentor.ratings array)
    let avgRating = 0;
    if (mentor.ratings && mentor.ratings.length > 0) {
      const sumRatings = mentor.ratings.reduce((acc, r) => acc + r.score, 0);
      avgRating = parseFloat((sumRatings / mentor.ratings.length).toFixed(2));
    }

    // Total earnings (course price * enrolledUsers count)
    let totalEarnings = 0;
    mentor.assignedCourses.forEach((course) => {
      if (course.courseId && course.courseId.price && course.enrolledUsers) {
        totalEarnings += course.courseId.price * course.enrolledUsers.length;
      }
    });

    // Today's enrollments & revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaysEnrollments = 0;
    let todaysRevenue = 0;

    mentor.assignedCourses.forEach((course) => {
      if (course.enrolledUsers && course.courseId && course.courseId.price) {
        course.enrolledUsers.forEach((user) => {
          if (user.enrolledAt) {
            const enrolledDate = new Date(user.enrolledAt);
            enrolledDate.setHours(0, 0, 0, 0);
            if (enrolledDate.getTime() === today.getTime()) {
              todaysEnrollments += 1;
              todaysRevenue += course.courseId.price;
            }
          }
        });
      }
    });

    // Active students - count unique enrolledUsers across assignedCourses
    const uniqueStudentIds = new Set();
    mentor.assignedCourses.forEach((course) => {
      if (course.enrolledUsers) {
        course.enrolledUsers.forEach((user) => uniqueStudentIds.add(user._id.toString()));
      }
    });

    const activeStudents = {
      daily: uniqueStudentIds.size,
      weekly: uniqueStudentIds.size,
      monthly: uniqueStudentIds.size,
    };

    // Prepare dashboard data
    const dashboardData = {
      totals: {
        studentsTaught: totalStudentsTaught,
        coursesCreated: totalCoursesCreated,
        avgRating,
        earnings: totalEarnings,
      },
      todayStats: {
        todaysEnrollments,
        todaysRevenue,
      },
      activeStudents,
      students: mentor.assignedCourses.flatMap(course =>
        course.enrolledUsers.map(user => ({
          _id: user._id,
          name: user.name, // Only sending name, email, and mobile as requested
          email: user.email,
          mobile: user.mobile,
        }))
      ),
      courses: mentor.assignedCourses.map((course) => ({
        name: course.courseId.title,
        enrolled: course.enrolledUsers ? course.enrolledUsers.length : 0,
        revenue: course.courseId.price * (course.enrolledUsers ? course.enrolledUsers.length : 0),
      })),
    };

    res.status(200).json({ success: true, data: dashboardData });

  } catch (error) {
    console.error("Error fetching mentor dashboard:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// Controller to send OTP
// Controller to send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body; // Accept mobile number from request body

    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    // Ensure the mobile number starts with +91
    let formattedMobile = mobile;

    if (!formattedMobile.startsWith('+')) {
      // Prepend +91 if the number does not already start with it
      formattedMobile = `+91${mobile}`; 
    }

    // Validate phone number format (example for India, can be adjusted for other countries)
    const phoneRegex = /^\+91\d{10}$/;  // This regex is for Indian numbers (you can change this for other countries)
    if (!phoneRegex.test(formattedMobile)) {
      return res.status(400).json({ success: false, message: "Invalid phone number format" });
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit number

    // Check if the user with this mobile already exists
    let user = await VerifiedUser.findOne({ mobile: formattedMobile });

    if (user) {
      // If user exists, update OTP
      user.otp = otp;
      user.verifyStatus = false; // Reset the verify status to false
    } else {
      // If user does not exist, create a new one
      user = new VerifiedUser({
        mobile: formattedMobile,
        otp: otp,
        verifyStatus: false,
      });
    }

    // Save OTP to the user document
    await user.save();

    // Send OTP to the user's mobile using Twilio
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: TWILIO_PHONE,
      to: formattedMobile, // Send the OTP to the formatted mobile number with '+'
    });

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Controller to verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body; // Accept only OTP from request body

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    // Find the user by OTP (You can adjust this as per your needs)
    const user = await VerifiedUser.findOne({ otp: otp });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found or OTP invalid" });
    }

    // Update verifyStatus to true as OTP matches
    user.verifyStatus = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      verifyStatus: user.verifyStatus,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// Controller to get attendance details for all mentors for admin
// Controller to get all attendance details for all mentors for admin
exports.getAllAttendanceForAdmin = async (req, res) => {
  try {
    // Fetch all attendance records for all mentors, and populate mentor details
    const attendances = await Attendance.find()
      .populate('mentorId', 'firstName lastName email phoneNumber expertise') // Populate mentor details
      .sort({ createdAt: -1 });

    if (!attendances.length) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found.",
      });
    }

    // Modify attendance records to include mentor's full name
    const attendanceWithMentorName = attendances.map(attendance => {
      const mentor = attendance.mentorId;
      const fullName = `${mentor.firstName} ${mentor.lastName}`;  // Create a full name
      return {
        ...attendance.toObject(),
      };
    });

    return res.status(200).json({
      success: true,
      attendance: attendanceWithMentorName,
    });
  } catch (error) {
    console.error("Error fetching attendance records for admin:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching attendance records for admin.",
    });
  }
};
