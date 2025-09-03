const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  course: [
    {
      name: { type: String, required: true }
    }
  ],
  city: { type: String, required: true },
  message: { type: String }
}, { timestamps: true });


const contactEnquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  enquiryType: { type: String, required: true, trim: true }, // String, not enum
  message: { type: String, trim: true },
}, {
  timestamps: true
});

const ContactEnquiry = mongoose.model("ContactEnquiry", contactEnquirySchema);
const Enquiry = mongoose.model("Enquiry", enquirySchema);


module.exports = {ContactEnquiry,Enquiry}