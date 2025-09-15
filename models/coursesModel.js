const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

const featureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String } // optional if you want
});

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, required: true }  // REQUIRED!
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  mode: { type: String, default: 'Online' },
  category: { type: String, required: true },
  price: { type: Number},
  duration: { type: String, required: true },
   noOfLessons: { type: String, default: 0 }, 
  noOfStudents: { type: String, default: 0 }, 
  faq: [faqSchema],
  features: [featureSchema],
  reviews: [reviewSchema],
  image: { type: String, required: true }, // main course image
  toolsImages: [String],                 // store feature image URLs
  pdf: { type: String },        // syllabus or related PDF file URL
    logoImage: { type: String }   // course logo image URL
}, { timestamps: true });

const downloadSchema = new mongoose.Schema({
    name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  syllabus:{type:String},
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
  // OTP expires in 90 seconds automatically
});


const getInTouchSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  iAm: { type: String, enum: ["select", "student", "professional"], required: true },

  // For students
  collegeName: { type: String },
  branch: { type: String },
  yearOfPassedOut: { type: Number },

  // For professionals
  companyName: { type: String },
  role: { type: String },
  experienceInYears: { type: Number }
}, { timestamps: true });

// Correct way: export both models together
const GetInTouch = mongoose.model("GetInTouch", getInTouchSchema);
const Course = mongoose.model("Course", courseSchema);
const DownloadUser = mongoose.model("DownloadUser", downloadSchema);

module.exports = { Course, DownloadUser,GetInTouch };