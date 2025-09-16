// controllers/invoiceController.js
const Invoice = require("../models/Invoicemodel");
const {Form} = require("../models/formModel");// your existing form model
const { uploadImages } = require("../config/cloudinary1");
const { v4: uuidv4 } = require("uuid");

// Generate unique invoiceId
function generateInvoiceId() {
  return "HICAP" + Math.floor(1000 + Math.random() * 9000); // Example: HICAP1234
}

exports.createInvoice = async (req, res) => {
  try {
    // Use req.body for normal fields, req.file for uploaded file
    const { studentId, dueDate, paymentMethod, transactionId } = req.body;
    const logoBuffer = req.file ? req.file.buffer : null;

    if (!studentId) return res.status(400).json({ success: false, message: "studentId is required" });

    const student = await Form.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Upload logo to Cloudinary
    let logoUrl = "";
    if (logoBuffer) {
      logoUrl = await uploadImages(logoBuffer, "invoice-logos");
    }

    const invoiceData = {
      invoiceId: generateInvoiceId(),
      studentId: student._id,
      logo: logoUrl,
      instituteName: "HICAP Institute",
      instituteAddress: "123 Main Street, City, Country",
      fullName: student.fullName,
      mobile: student.mobile,
      email: student.email,
      roleType: student.roleType,
      dueDate,
      paymentMethod,
      transactionId,
    };

    if (student.roleType === "student") {
      invoiceData.degree = student.degree;
      invoiceData.department = student.department;
      invoiceData.yearOfPassing = student.yearOfPassedOut;
    } else {
      invoiceData.company = student.company;
      invoiceData.role = student.role;
      invoiceData.experience = student.experience;
    }

    const invoice = await Invoice.create(invoiceData);
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.generateInvoiceHTML = (invoice) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Invoice ${invoice.invoiceId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .logo { width: 150px; }
      .info { margin-top: 20px; }
      .info h2 { margin: 5px 0; }
      .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .table th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="${invoice.logo}" class="logo" />
      <div>
        <h1>${invoice.instituteName}</h1>
        <p>${invoice.instituteAddress}</p>
      </div>
    </div>

    <div class="info">
      <h2>Invoice ID: ${invoice.invoiceId}</h2>
      <p>Name: ${invoice.fullName}</p>
      <p>Email: ${invoice.email}</p>
      <p>Mobile: ${invoice.mobile}</p>
      <p>Status: ${invoice.status}</p>
      <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p>Payment Method: ${invoice.paymentMethod}</p>
      <p>Transaction ID: ${invoice.transactionId || "-"}</p>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.roleType === "student" ? `
          <tr><td>Degree</td><td>${invoice.degree}</td></tr>
          <tr><td>Department</td><td>${invoice.department}</td></tr>
          <tr><td>Year of Passing</td><td>${invoice.yearOfPassing}</td></tr>
        ` : `
          <tr><td>Company</td><td>${invoice.company}</td></tr>
          <tr><td>Role</td><td>${invoice.role}</td></tr>
          <tr><td>Experience</td><td>${invoice.experience}</td></tr>
        `}
      </tbody>
    </table>
  </body>
  </html>
  `;
};

// GET ALL INVOICES
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("studentId", "fullName email mobile roleType degree department yearOfPassedOut company role experience"); 
      // populates student fields selectively

    res.status(200).json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET INVOICE BY ID
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate("studentId", "fullName email mobile roleType degree department yearOfPassedOut company role experience");

    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    res.status(200).json({ success: true, invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};