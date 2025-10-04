const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  enrolledId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
  companyName: { type: String, required: true },
  role: { type: String, required: true },
  experience: { type: String, required: true },
  location: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true } // auto-filled
}, { timestamps: true });

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;
