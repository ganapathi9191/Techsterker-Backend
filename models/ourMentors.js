const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String },
  expertise: { type: String }, // Add expertise area
  subjects: [String],
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }],
  enrolledBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }] // NEW: Track batches mentor is enrolled in
}, { timestamps: true });

// OurMentor Schema
const ourMentorSchema = new mongoose.Schema({
  image: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

// MentorExperience Schema
const mentorExperienceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

// Export both models
const OurMentor = mongoose.model("OurMentor", ourMentorSchema);
const MentorExperience = mongoose.model("MentorExperience", mentorExperienceSchema);
const Mentor = mongoose.model('Mentor', mentorSchema);

module.exports = {
  OurMentor,
  MentorExperience,
  Mentor
};
