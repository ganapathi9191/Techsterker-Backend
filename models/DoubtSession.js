const mongoose = require("mongoose");

const doubtSessionSchema = new mongoose.Schema({
  enrolledcourses: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
    required: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  mentor: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String // image URL (e.g., from Cloudinary)
  }
}, { timestamps: true });

module.exports = mongoose.model("DoubtSession", doubtSessionSchema);
