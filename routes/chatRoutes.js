const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // for handling file uploads in memory

const chatController = require("../controllers/chatController");

/* ========================================================================== */
/*                              GROUP CHAT ROUTES                             */
/* ========================================================================== */

// ✅ Create Group Chat
router.post("/g-chats", chatController.createGroupChat);

// 📨 Send Group Message (supports text + file uploads)
router.post("/group-messages", upload.array("files"), chatController.sendGroupMessage);

// 📋 Get All Group Chats for a User/Mentor
router.get("/group-chats/:userId", chatController.getAllGroupChats);

// 💬 Get All Messages for a Specific Group Chat
router.get("/group-messages/:chatGroupId/:userId", chatController.getGroupMessages);


/* ========================================================================== */
/*                          INDIVIDUAL CHAT ROUTES                            */
/* ========================================================================== */

// 🆕 Create Individual Chat
router.post("/individual-chats", chatController.createIndividualChat);

// 📨 Send Individual Message (auto-creates chat if missing)
router.post("/individual-messages", upload.array("files"), chatController.sendIndividualMessage);

// 📋 Get All Individual Chats for a User
router.get("/individual-chats/:userId", chatController.getAllIndividualChats);

// 💬 Get All Messages in an Individual Chat
router.get("/individual-messages/:userId/:mentorId", chatController.getIndividualMessages);

// ✏️ Edit Message (Works for both group & individual chats)
router.put("/messages/edit", chatController.editMessage);

/* ========================================================================== */
/*                          COMMON MESSAGE ROUTES                             */
/* ========================================================================== */

// 🗑️ Delete Message
router.delete("/messages/:messageId/:userId", chatController.deleteMessage);

// 📝 Get Message by ID
router.get("/messages/:messageId", chatController.getMessageById);



router.get("/group-all", chatController.getAllGroupChatsAll);
router.get("/individual-all", chatController.getAllIndividualChatsAll);
module.exports = router;
