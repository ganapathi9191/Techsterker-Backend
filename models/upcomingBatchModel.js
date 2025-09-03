const mongoose = require("mongoose");

// Batch Schema
const batchSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  batchNo: { type: String, required: true },
  date: { type: Date, required: true },
  timing: { type: String, required: true },
  duration: { type: String, required: true },
  type: { type: String },
  categorie: { type: String, enum: ['Regular', 'Weekend'], required: true }
});

// Upcoming Batch Schema
const upcomingBatchSchema = new mongoose.Schema({
  allbatches: [batchSchema]
}, { timestamps: true });


const detailSchema = new mongoose.Schema({
  image: { type: String, required: true },
  content: { type: String, required: true },
});

const abrodStudentSchema = new mongoose.Schema({
  mainImage: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  details: { type: [detailSchema], default: [] },
}, { timestamps: true });



// Models
const UpcomingBatch = mongoose.model("UpcomingBatch", upcomingBatchSchema);
const AbrodStudent = mongoose.model("AbrodStudent", abrodStudentSchema);

module.exports = { UpcomingBatch,AbrodStudent };
