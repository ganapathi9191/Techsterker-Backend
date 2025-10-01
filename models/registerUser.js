const mongoose = require('mongoose');

const userRegisterSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
  password: { type: String },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }],
  recommendedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  interviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Interview" }],
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
  userId: { type: String },
  name: { type: String },
  mobile: { type: String },
  email: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },  // Referring to the Course model
  course: { type: String },
  degree: { type: String },
  department: { type: String },
  yearOfPassedOut: { type: Number },
  company: { type: String },
  role: { type: String },
  experience: { type: String },
  password: { type: String },
  generatedPassword: { type: String },
  paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  advancePayment: { type: Number, default: 0 },
  totalPrice: { type: Number, },  // Total price of course with GST
  remainingPayment: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('UserRegister', userRegisterSchema);
