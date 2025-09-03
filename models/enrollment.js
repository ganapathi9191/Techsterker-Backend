const mongoose = require('mongoose');

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  batchName: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  startDate: { type: Date, required: true },
  duration: { type: String, required: true },
  category: { type: String, required: true },
  assignedMentors: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Mentor"
  }],
  enrolledUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "userRegister" }
  ]
}, { timestamps: true });

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  enrolledId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'userRegister', required: true },
  certificateFile: { type: String, required: true }, // Cloudinary URL
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  }
}, { timestamps: true });

// Make sure you're exporting both models correctly
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);

// Export both models
module.exports = {
  Enrollment,
  Certificate
};