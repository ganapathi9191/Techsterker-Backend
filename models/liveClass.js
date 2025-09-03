const mongoose = require("mongoose");

const liveClassSchema = new mongoose.Schema({
  className: { type: String, required: true },
  enrollmentIdRef: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
  subjectName: { type: String, required: true },
  date: { type: Date, required: true },
  timing: { type: String, required: true },
  link: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("LiveClass", liveClassSchema);
