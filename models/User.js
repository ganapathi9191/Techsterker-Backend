const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  name: {
    type: String,
  },
  mobile: {
    type: String,
  },
  email: {
    type: String,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  },
  course: {
    type: String,
  },
  degree: {
    type: String,
  },
  department: {
    type: String,
  },
  yearOfPassedOut: {
    type: String,
  },
  company: {
    type: String,
  },
  role: {
    type: String,
  },
  experience: {
    type: String,
  },
  password: {
    type: String,
  },
  generatedPassword: {
    type: String,
  },
  token: {
    type: String,
  },
  paymentStatus: {
    type: String,
    default: 'Pending',
  },
  advancePayment: {  // Added the advancePayment field here
    type: Number,
  },
  isEnrolledStatus: {
    type: Boolean,
    enum: [true, false],  // Only true or false allowed
    default: false,       // Default value is false (not enrolled)
  },
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
