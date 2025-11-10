const express = require("express");
const router = express.Router();
const multer = require("multer");
const chatController = require("../controllers/chatController");

// ✅ Configure multer with memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow all common file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  },
});

// ========== CHAT GROUP ROUTES ==========

// Create group chat
router.post("/group", chatController.createGroupChat);

// Create individual chat
router.post("/individual", chatController.createIndividualChat);

// ========== MESSAGE ROUTES ==========

// Send message with file uploads
router.post(
  "/course-message",
  upload.array("files", 10), // Accept up to 10 files
  chatController.sendMessage
);

// ✅ 3️⃣ Get all group chats for a user or mentor
router.get("/group-chats/:userId", chatController.getAllGroupChats);

// ✅ 4️⃣ Get all messages inside a group by ID (mentor/user)
router.get("/group-messages/:chatGroupId/:userId", chatController.getGroupMessagesById);



// ==================== 👤 INDIVIDUAL CHAT ROUTES ====================

// ✅ 5️⃣ Create an individual chat between user ↔ mentor
router.post("/create-individual", chatController.createIndividualChat);

// ✅ 6️⃣ Send an individual (1-on-1) message
router.post("/individual-message", upload.array("files"), chatController.sendIndividualMessage);

// ✅ 7️⃣ Get all 1-on-1 chats for a user or mentor
router.get("/individual-chats/:userId", chatController.getAllIndividualChats);

// ✅ 8️⃣ Get all messages between user ↔ mentor
router.get("/individual-messages/:userId/:mentorId", chatController.getIndividualMessages);

module.exports = router;