const mongoose = require('mongoose');

const contactDetailsSchema = new mongoose.Schema({
  logoimage:{
     type:String
  },
  title: { type: String, required: true },
  branch: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: [String], required: true },
  email: { type: String, required: true },
  description: { type: String, default: "" }
}, { timestamps: true });

const socialMediaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  link: { type: String, required: true }
}, { timestamps: true });


const SocialMedia = mongoose.model('SocialMedia', socialMediaSchema);

const ContactDetails = mongoose.model('ContactDetails', contactDetailsSchema);

module.exports = {ContactDetails,SocialMedia};
