const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
    required: true,
  },
  attendance: [
    {
      className: String,
      subject: String,
      date: Date,
      timing: String,
      studentName: String,
      enrollmentId: String,
      status: {
        type: String,
        enum: ["present", "absent", "Present", "Absent"],
      },
    }
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model("Attendance", attendanceSchema);
