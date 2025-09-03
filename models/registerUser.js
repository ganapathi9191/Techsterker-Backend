const mongoose = require('mongoose');

const userRegisterSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }], // <-- add this
  recommendedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }], // <-- add this
  interviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Interview" }],  // <-- new
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }]
}, { timestamps: true });


module.exports = mongoose.model('userRegister', userRegisterSchema);
