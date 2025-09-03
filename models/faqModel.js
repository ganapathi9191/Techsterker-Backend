const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  image: { type: String }, // optional
  faq: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("FAQ", faqSchema);
