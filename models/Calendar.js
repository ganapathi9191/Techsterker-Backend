const mongoose = require("mongoose");

const calendarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["holiday", "event"], // Only these two allowed
      required: true
    },
    date: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Calendar", calendarSchema);
