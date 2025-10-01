const mongoose = require("mongoose");

const liveClassSchema = new mongoose.Schema({
  className: { type: String,  },
  enrollmentIdRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor", // ✅ Add this line with ref
  },
  subjectName: { type: String,},
  date: { type: Date,  },
  timing: { type: String, },
  link: { type: String,  }
}, { timestamps: true });

module.exports = mongoose.model("LiveClass", liveClassSchema);
