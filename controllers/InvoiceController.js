// controllers/invoiceController.js
const Invoice = require("../models/Invoicemodel");
const Form = require("../models/formModel"); // your existing form model
const { uploadImages } = require("../config/cloudinary1");
const { v4: uuidv4 } = require("uuid");

// Generate unique invoiceId
function generateInvoiceId() {
  return "HICAP" + Math.floor(1000 + Math.random() * 9000); // Example: HICAP1234
}

exports.createInvoice = async (req, res) => {
  try {
    const { formId, dueDate, paymentMethod, transactionId, logoBuffer } = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    // Upload logo to Cloudinary if provided
    let logoUrl = "";
    if (logoBuffer) {
      logoUrl = await uploadImages(Buffer.from(logoBuffer, "base64"), "invoice-logos");
    }

    // Build invoice data dynamically
    const invoiceData = {
      invoiceId: generateInvoiceId(),
      formId: form._id,
      logo: logoUrl,
      instituteName: "HICAP Institute",
      instituteAddress: "123 Main Street, City, Country",
      fullName: form.fullName,
      mobile: form.mobile,
      email: form.email,
      roleType: form.roleType,
      dueDate,
      paymentMethod,
      transactionId
    };

    if (form.roleType === "student") {
      invoiceData.degree = form.degree;
      invoiceData.department = form.department;
      invoiceData.yearOfPassing = form.yearOfPassing;
    } else if (form.roleType === "professional") {
      invoiceData.company = form.company;
      invoiceData.role = form.role;
      invoiceData.experience = form.experience;
    }

    const invoice = await Invoice.create(invoiceData);

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
