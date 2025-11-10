const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // using memory storage for Cloudinary uploads
const chatController = require("../controllers/chatController");

/* -------------------------------------------------------------------------- */
/* 🧑‍🤝‍🧑 GROUP CHAT ROUTES                                                  */
/* -------------------------------------------------------------------------- */

// ✅ Create new group chat
router.post("/create-group", chatController.createGroupChat);

// ✅ Send message in a group chat (text / files)
router.post("/send-message", upload.array("files"), chatController.sendMessage);

// ✅ Get all group chats for a user or mentor
router.get("/group-chats/:userId", chatController.getAllGroupChats);

// ✅ Get messages by groupId (for user or mentor)
router.get("/group-messages/:chatGroupId/:userId", chatController.getGroupMessagesById);

/* -------------------------------------------------------------------------- */
/* 👥 INDIVIDUAL CHAT ROUTES (User ↔ Mentor)                                  */
/* -------------------------------------------------------------------------- */

// ✅ Create new individual chat (manual)
router.post("/create-individual", chatController.createIndividualChat);

// ✅ Send message between user and mentor
router.post("/individual-message", upload.array("files"), chatController.sendIndividualMessage);

// ✅ Get all individual chats for a user or mentor
router.get("/individual-chats/:userId", chatController.getAllIndividualChats);

// ✅ Get all messages between user ↔ mentor
router.get("/individual-messages/:userId/:mentorId", chatController.getIndividualMessages);

module.exports = router;
