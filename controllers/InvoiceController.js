const { Form, Payment } = require("../models/formModel");
const PDFDocument = require("pdfkit");
const path = require("path");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const fs = require("fs");
const fetch = require("node-fetch"); // ✅ For TinyURL
const { uploadToCloudinary } = require("../config/cloudinary2"); // ✅ fixed Cloudinary
const Invoice = require("../models/Invoicemodel") // ✅ CORRECT
const multer = require('multer');

// Twilio credentials
const TWILIO_SID = "AC6dbc0f86b6481658d4b4bc471d1dfb32";
const TWILIO_AUTH_TOKEN = "c623dd368248f84be06e643750fae2f0";
const TWILIO_PHONE = "+19123489710";

const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// Helper: shorten URL for SMS
async function shortenUrl(longUrl) {
  try {
    const res = await fetch(
      "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(longUrl)
    );
    return await res.text();
  } catch (err) {
    console.error("TinyURL failed:", err.message);
    return longUrl; // fallback to original
  }
}

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

exports.generateInvoiceByStudent = [
  upload.single('invoicePdf'),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      console.log('Generating invoice for student:', studentId);

      // Fetch student
      const student = await Form.findById(studentId);
      if (!student) {
        console.log('Student not found:', studentId);
        return res.status(404).json({ 
          success: false, 
          message: "Student not found" 
        });
      }

      // Fetch payment & course
      const payment = await Payment.findOne({ studentId }).populate("courseId");
      if (!payment) {
        console.log('Payment not found for student:', studentId);
        return res.status(404).json({ 
          success: false, 
          message: "Payment not found" 
        });
      }

      console.log('Payment found:', payment._id);

      // Company Info
      const companyInfo = {
        name: "Techsterker",
        contact: "+91 9000239871",
        email: "info@techsterker.com",
        logoPath: path.join(__dirname, "../upload/logo.png"),
      };

      // PDF setup
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const invoicesDir = path.join(__dirname, "../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice-${studentId}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // ===== Header =====
      if (fs.existsSync(companyInfo.logoPath)) {
        doc.image(companyInfo.logoPath, 50, 45, { width: 80 });
      }
      doc.fontSize(20).text(companyInfo.name, 140, 50);
      doc
        .fontSize(10)
        .text(`Phone: ${companyInfo.contact}`, 140, 75)
        .text(`Email: ${companyInfo.email}`, 140, 90);

      doc.moveTo(50, 120).lineTo(550, 120).stroke();

      // Bill To
      const invoiceNumber = `TT-${Date.now()}`;
      doc.fontSize(12).text("Bill To:", 50, 130);
      doc
        .fontSize(10)
        .text(student.fullName, 50, 145)
        .text(`+91-${student.mobile}`, 50, 160)
        .text(student.email || "", 50, 175);

      doc
        .fontSize(10)
        .text(`Invoice No: ${invoiceNumber}`, 400, 130)
        .text(`Date: ${new Date().toLocaleDateString()}`, 400, 145);

      // ===== Table =====
      const tableTop = 200;
      const itemHeight = 25;

      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, itemHeight).fill();
      doc.fillColor("black").font("Helvetica-Bold");
      doc.text("Description", 55, tableTop + 7);
      doc.text("Quantity", 300, tableTop + 7);
      doc.text("Unit Price", 370, tableTop + 7);
      doc.text("Amount", 450, tableTop + 7);
      doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
      doc.moveTo(50, tableTop + itemHeight).lineTo(550, tableTop + itemHeight).stroke();

      const items = [
        {
          description: payment.courseId?.name || "Course",
          quantity: 1,
          unitPrice: payment.amount,
          amount: payment.amount,
        },
      ];

      doc.font("Helvetica").fontSize(10);
      items.forEach((item, i) => {
        const y = tableTop + itemHeight + i * itemHeight;
        if (i % 2 === 0)
          doc.rect(50, y, 500, itemHeight).fill("#f9f9f9").fillColor("black");

        doc.text(item.description, 55, y + 7);
        doc.text(item.quantity.toString(), 300, y + 7);
        doc.text(`Rs.${item.unitPrice.toLocaleString()}/-`, 370, y + 7);
        doc.text(`Rs.${item.amount.toLocaleString()}/-`, 450, y + 7);
      });

      // Totals
      const totalY = tableTop + itemHeight + items.length * itemHeight + 20;
      doc.rect(350, totalY, 200, 70).stroke();
      doc.font("Helvetica-Bold");
      doc.text(`Total: Rs.${payment.amount.toLocaleString()}/-`, 360, totalY + 10);
      doc.text(`Paid: Rs.${payment.amount.toLocaleString()}/-`, 360, totalY + 25);
      doc.text(`Balance Due: Rs.0/-`, 360, totalY + 40);

      doc
        .fontSize(8)
        .fillColor("#666")
        .text(
          "Thank you for choosing Techsterker! This is a computer-generated invoice.",
          50,
          doc.page.height - 50
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
            invoiceNumber: invoiceNumber,
            studentId: studentId,
            paymentId: payment._id,
            issueDate: new Date(),
            dueDate: dueDate,
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount
            })),
            subtotal: payment.amount,
            total: payment.amount,
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
            // ✅ CORRECT WAY TO CREATE INVOICE
            savedInvoice = await Invoice.create(invoiceData);
            console.log("✅ Invoice saved to database:", savedInvoice._id);
          } catch (dbError) {
            console.error("❌ Error saving invoice to database:", dbError.message);
            console.error("Database error details:", dbError);
            // Continue even if DB save fails, but log the error
          }

          let emailSuccess = false,
            smsSuccess = false;

          // ===== Email =====
          if (student.email) {
            try {
              const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: "ganapathivaraprasad123@gmail.com",
                  pass: "eqoufkewywjrpedn",
                },
              });

              const mailOptions = {
                from: `"Techsterker" <ganapathivaraprasad123@gmail.com>`,
                to: student.email,
                subject: `Invoice ${invoiceNumber} - ${payment.courseId?.name || "Course Enrollment"}`,
                html: `
                  <h2>Invoice Ready</h2>
                  <p>Dear <b>${student.fullName}</b>, your invoice is ready.</p>
                  <p>Amount: Rs.${payment.amount}/-</p>
                  <p>Due Date: ${dueDate.toLocaleDateString()}</p>
                  <p><a href="${fullPdfUrl}">Download Invoice</a></p>
                  <p>Invoice Number: ${invoiceNumber}</p>
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
          if (student.mobile) {
            try {
              const smsMessage = `Hi ${student.fullName}, Invoice ${invoiceNumber} for ${payment.courseId?.name} (Rs.${payment.amount}/-) Download: ${fullPdfUrl}`;

              // Make sure you have Twilio configured
              const smsResult = await client.messages.create({
                body: smsMessage,
                from: TWILIO_PHONE,
                to: `+91${student.mobile}`,
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
            message: "Invoice generated and sent successfully",
            data: {
              invoiceId: savedInvoice?._id,
              invoiceNumber: invoiceNumber,
              pdfUrl: pdfUrl,
              fullPdfUrl: fullPdfUrl,
              issueDate: invoiceData.issueDate,
              dueDate: invoiceData.dueDate,
              totalAmount: payment.amount,
              status: "sent",
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
      console.error("❌ Error generating invoice:", err.message);
      res.status(500).json({
        success: false,
        message: "An error occurred while generating the invoice.",
      });
    }
  },
];