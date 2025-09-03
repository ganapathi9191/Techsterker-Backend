const mongoose = require("mongoose");

// 🔹 Section 1 Schema
const aboutUsSchema = new mongoose.Schema({
  title1: { type: String, required: true },
  content1: { type: String, required: true },
  image1: { type: String, required: true },
}, { timestamps: true });

// 🔹 Leadership Schema
const leadershipSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Leadership image is required']
  },
  name: {
    type: String,
    required: [true, 'Leader name is required']
  },
  role: {
    type: String,
    required: [true, 'Leader role is required']
  },
  content: {
    type: String,
    required: [true, 'Leader content is required']
  }
}, { _id: false });

// 🔹 Section 2: Leadership array schema
const aboutPageSchema = new mongoose.Schema({
  leadership: {
    type: [leadershipSchema],
    required: true
  }
}, { timestamps: true });

// 🔹 Technical Team Schema
const technicalTeamSchema = new mongoose.Schema({
  title2: { type: String, required: true },
  description2: { type: String, required: true },
  image2: { type: String, required: true },
}, { timestamps: true });





// ✅ Export both models
const AboutUs = mongoose.model("AboutUs", aboutUsSchema);
const AboutPage = mongoose.model("AboutPage", aboutPageSchema);
const TechnicalTeam = mongoose.model("TechnicalTeam", technicalTeamSchema);


module.exports = {
  AboutUs,
  AboutPage,
  TechnicalTeam
};
