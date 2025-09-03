const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  image: [
    {
      type: String,
      required: true,
    }
  ]
}, { timestamps: true });


module.exports = mongoose.model('Client', contentSchema);
