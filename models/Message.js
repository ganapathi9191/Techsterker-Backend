// // models/Message.js
// const mongoose = require('mongoose');

// const messageSchema = new mongoose.Schema({
//   chatGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', },
//   sender: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegister', },
//   text: { type: String, },
//   createdAt: { type: Date, default: Date.now },
//    media: { type: String, default: null }, // Cloudinary media URL (image/video/pdf)
// }, { timestamps: true });

// module.exports = mongoose.model('Message', messageSchema);
