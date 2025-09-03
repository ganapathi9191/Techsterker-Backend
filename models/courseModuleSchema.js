const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, required: true } // Cloudinary PDF URL
});

const lessonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  videoId: { type: String, required: true }, // YouTube video ID as string
  duration: { type: String }, // auto-fetched
  resources: [resourceSchema]
});

const topicSchema = new mongoose.Schema({
  topicName: { type: String, required: true },
  lessons: [lessonSchema]
});

const moduleSchema = new mongoose.Schema({
  subjectName: { type: String, required: true },
  topics: [topicSchema]
});

const courseModuleSchema = new mongoose.Schema({
  enrolledId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  courseName: { type: String },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor"},
  mentorName: { type: String },
  modules: [moduleSchema]
}, { timestamps: true });

module.exports = mongoose.model("CourseModule", courseModuleSchema);
