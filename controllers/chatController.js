const { ChatGroup, Message, UserChatPreference, Notification } = require("../models/ChatGroup");
const { Enrollment } = require("../models/enrollment");
const UserRegister = require("../models/registerUser");
const { uploadImage } = require("../config/cloudinary1");
const mongoose = require("mongoose");

// ✅ Helper function: validate and clean ObjectIds
const cleanObjectId = (id) => {
  if (!id) return null;
  const trimmed = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) return trimmed;
  const match = trimmed.match(/[a-f\d]{24}/i);
  return match ? match[0] : null;
};

/* ========================================================================== */
/*                            GROUP CHAT SECTION                              */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* 🆕 CREATE GROUP CHAT                                                       */
/* -------------------------------------------------------------------------- */
exports.createGroupChat = async (req, res) => {
  try {
    const { groupName, enrollmentId, courseId, mentorId } = req.body;

    if (!groupName)
      return res.status(400).json({ success: false, message: "groupName is required" });

    let enrolledUsers = [];
    let mentors = [];

    // Enrollment-based group
    if (enrollmentId) {
      const enrollment = await Enrollment.findById(enrollmentId).populate("courseId");
      if (!enrollment)
        return res.status(404).json({ success: false, message: "Enrollment not found" });

      enrolledUsers = enrollment.enrolledUsers || [];
      mentors = enrollment.mentors || [];
    }

    // Course-based group
    if (courseId && mentorId) {
      const Course = require("../models/course");
      const course = await Course.findById(courseId);
      const mentor = await UserRegister.findById(mentorId);
      if (!course || !mentor)
        return res.status(404).json({ success: false, message: "Course or Mentor not found" });

      const enrollments = await Enrollment.find({ courseId, mentors: mentorId });
      enrolledUsers = [...new Set(enrollments.flatMap(e => e.enrolledUsers || []))];
      mentors = [mentorId];
    }

    const chatGroup = new ChatGroup({
      groupName,
      enrollmentId: enrollmentId || null,
      courseId: courseId || null,
      enrolledUsers,
      mentors,
      groupType: "group",
      status: "Active",
    });

    await chatGroup.save();

    const populatedGroup = await ChatGroup.findById(chatGroup._id)
      .populate("enrollmentId courseId")
      .populate("enrolledUsers", "name email profileImage")
      .populate("mentors", "name email profileImage");

    return res.status(201).json({
      success: true,
      message: "Group chat created successfully",
      data: populatedGroup,
    });
  } catch (error) {
    console.error("❌ Error creating group chat:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📨 SEND GROUP MESSAGE                                                      */
/* -------------------------------------------------------------------------- */
exports.sendGroupMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { chatGroupId, senderId, text } = req.body;

    const cleanChatGroupId = cleanObjectId(chatGroupId);
    const cleanSenderId = cleanObjectId(senderId);

    if (!cleanChatGroupId || !cleanSenderId)
      return res.status(400).json({ success: false, message: "Invalid chatGroupId or senderId" });

    const chatGroup = await ChatGroup.findById(cleanChatGroupId);
    if (!chatGroup) 
      return res.status(404).json({ success: false, message: "Chat group not found" });

    if (chatGroup.groupType === "individual")
      return res.status(400).json({ success: false, message: "Use sendIndividualMessage for one-on-one chats" });

    const sender = await UserRegister.findById(cleanSenderId);
    if (!sender) 
      return res.status(404).json({ success: false, message: "Sender not found" });

    // ✅ Verify sender is a member
    const isMember = 
      chatGroup.enrolledUsers.some(u => u.toString() === cleanSenderId) ||
      chatGroup.mentors.some(m => m.toString() === cleanSenderId);

    if (!isMember)
      return res.status(403).json({ success: false, message: "You are not a member of this group" });

    let uploadedMedia = [];
    if (req.files?.length) {
      for (const file of req.files) {
        let fileType = file.mimetype.startsWith("image/")
          ? "image"
          : file.mimetype.startsWith("video/")
          ? "video"
          : file.mimetype === "application/pdf"
          ? "pdf"
          : "document";

        const url = await uploadImage(file.buffer, "chat_files", file.originalname);
        uploadedMedia.push({ url, type: fileType, fileName: file.originalname });
      }
    }

    if (!text && uploadedMedia.length === 0)
      return res.status(400).json({ success: false, message: "Message must contain text or files" });

    const message = new Message({
      chatGroupId: cleanChatGroupId,
      sender: cleanSenderId,
      text: text || "",
      media: uploadedMedia,
    });
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email profileImage");

    await ChatGroup.findByIdAndUpdate(cleanChatGroupId, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: cleanSenderId,
        timestamp: new Date(),
      },
    });

    if (io) 
      io.to(cleanChatGroupId).emit("newGroupMessage", { 
        chatGroupId: cleanChatGroupId, 
        message: populatedMessage 
      });

    const totalMessages = await Message.countDocuments({ chatGroupId: cleanChatGroupId });

    return res.status(201).json({
      success: true,
      message: "Group message sent successfully",
      totalMessages,
      data: populatedMessage,
    });
  } catch (error) {
    console.error("❌ Error sending group message:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 GET ALL GROUP CHATS (for User or Mentor)                                */
/* -------------------------------------------------------------------------- */
exports.getAllGroupChats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required" });

    const cleanUserId = cleanObjectId(userId);
    if (!cleanUserId)
      return res.status(400).json({ success: false, message: "Invalid userId format" });

    console.log("🔍 Searching chats for user:", cleanUserId);
    console.log("🔍 User ID type:", typeof cleanUserId);

    // First, get ALL individual chats to see what's in DB
    const allChats = await ChatGroup.find({ groupType: "individual" });
    console.log("📊 Total individual chats in DB:", allChats.length);

    // Log first chat structure if exists
    if (allChats.length > 0) {
      console.log("📝 Sample chat structure:");
      console.log("Enrolled Users:", allChats[0].enrolledUsers);
      console.log("Mentors:", allChats[0].mentors);
    }

    // ✅ Try multiple query approaches
    const userObjectId = new mongoose.Types.ObjectId(cleanUserId);

    // Approach 1: Using ObjectId
    let chats = await ChatGroup.find({
      groupType: "individual",
      $or: [
        { enrolledUsers: userObjectId },
        { mentors: userObjectId }
      ]
    })
      .populate("enrolledUsers", "name email profileImage role")
      .populate("mentors", "name email profileImage role")
      .populate("lastMessage.sender", "name email profileImage")
      .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

    console.log("✅ Found chats with ObjectId query:", chats.length);

    // Approach 2: If nothing found, try string comparison
    if (chats.length === 0) {
      console.log("⚠️ Trying string-based query...");
      
      const allIndividualChats = await ChatGroup.find({ groupType: "individual" })
        .populate("enrolledUsers", "name email profileImage role")
        .populate("mentors", "name email profileImage role")
        .populate("lastMessage.sender", "name email profileImage");

      chats = allIndividualChats.filter(chat => {
        const enrolledMatch = chat.enrolledUsers.some(u => u._id.toString() === cleanUserId);
        const mentorMatch = chat.mentors.some(m => m._id.toString() === cleanUserId);
        return enrolledMatch || mentorMatch;
      });

      console.log("✅ Found chats with filter:", chats.length);
    }

    if (!chats.length) {
      return res.status(200).json({
        success: true,
        message: "No individual chats found for this user.",
        totalChats: 0,
        data: [],
        debug: {
          searchedUserId: cleanUserId,
          totalIndividualChatsInDB: allChats.length
        }
      });
    }

    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const totalMessages = await Message.countDocuments({ chatGroupId: chat._id });

        const otherUser =
          chat.enrolledUsers.find(u => u._id.toString() !== cleanUserId) ||
          chat.mentors.find(m => m._id.toString() !== cleanUserId);

        return {
          _id: chat._id,
          groupName: chat.groupName,
          groupType: chat.groupType,
          otherUser: otherUser || null,
          totalMessages,
          lastMessage: chat.lastMessage || null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Individual chats fetched successfully",
      totalChats: chatsWithDetails.length,
      data: chatsWithDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching individual chats:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 💬 GET GROUP MESSAGES BY GROUP ID                                          */
/* -------------------------------------------------------------------------- */
exports.getGroupMessages = async (req, res) => {
  try {
    const { chatGroupId, userId } = req.params;

    const cleanChatGroupId = cleanObjectId(chatGroupId);
    const cleanUserId = cleanObjectId(userId);

    if (!cleanChatGroupId || !cleanUserId)
      return res.status(400).json({ success: false, message: "Invalid chatGroupId or userId" });

    const chatGroup = await ChatGroup.findById(cleanChatGroupId)
      .populate("enrolledUsers mentors", "name email profileImage role")
      .populate("courseId", "courseName")
      .populate("enrollmentId", "batchName batchNumber");

    if (!chatGroup)
      return res.status(404).json({ success: false, message: "Chat group not found" });

    if (chatGroup.groupType === "individual")
      return res.status(400).json({ success: false, message: "Use getIndividualMessages for one-on-one chats" });

    const isMember =
      chatGroup.enrolledUsers.some(u => u._id.toString() === cleanUserId) ||
      chatGroup.mentors.some(m => m._id.toString() === cleanUserId);

    if (!isMember)
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this group." });

    const messages = await Message.find({ chatGroupId: cleanChatGroupId })
      .populate("sender", "name email profileImage role")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Group messages fetched successfully",
      totalMessages: messages.length,
      groupDetails: chatGroup,
      data: messages,
    });
  } catch (error) {
    console.error("❌ Error fetching group messages:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ========================================================================== */
/*                         ONE-ON-ONE CHAT SECTION                            */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* 🆕 CREATE INDIVIDUAL CHAT                                                  */
/* -------------------------------------------------------------------------- */
exports.createIndividualChat = async (req, res) => {
  try {
    const { userId, mentorId, groupName } = req.body;

    if (!userId || !mentorId)
      return res.status(400).json({ success: false, message: "userId and mentorId are required" });

    const cleanUserId = cleanObjectId(userId);
    const cleanMentorId = cleanObjectId(mentorId);

    if (!cleanUserId || !cleanMentorId)
      return res.status(400).json({ success: false, message: "Invalid ObjectId format" });

    let user = await UserRegister.findById(cleanUserId);
    let mentor = await UserRegister.findById(cleanMentorId);

    if (!user || !mentor)
      return res.status(404).json({ success: false, message: "User or mentor not found" });

    // ✅ Check both directions for existing chat
    const existingChat = await ChatGroup.findOne({
      $and: [
        { groupType: "individual" },
        {
          $or: [
            { enrolledUsers: cleanUserId, mentors: cleanMentorId },
            { enrolledUsers: cleanMentorId, mentors: cleanUserId }
          ]
        }
      ]
    }).populate("enrolledUsers mentors", "name email profileImage");

    if (existingChat)
      return res.status(200).json({ 
        success: true, 
        message: "Individual chat already exists", 
        data: existingChat 
      });

    const chatGroup = new ChatGroup({
      groupName: groupName || `${user.name} ↔ ${mentor.name}`,
      enrolledUsers: [cleanUserId],
      mentors: [cleanMentorId],
      status: "Active",
      groupType: "individual",
    });

    await chatGroup.save();

    const populatedGroup = await ChatGroup.findById(chatGroup._id)
      .populate("enrolledUsers", "name email profileImage")
      .populate("mentors", "name email profileImage");

    return res.status(201).json({
      success: true,
      message: "Individual chat created successfully",
      data: populatedGroup,
    });
  } catch (error) {
    console.error("❌ Error creating individual chat:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📨 SEND INDIVIDUAL MESSAGE (Auto-create chat if missing)                   */
/* -------------------------------------------------------------------------- */
exports.sendIndividualMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { userId, mentorId, senderId, text } = req.body;

    const cleanUserId = cleanObjectId(userId);
    const cleanMentorId = cleanObjectId(mentorId);
    const cleanSenderId = cleanObjectId(senderId);

    if (!cleanUserId || !cleanMentorId)
      return res.status(400).json({ success: false, message: "Invalid userId or mentorId" });

    if (!cleanSenderId)
      return res.status(400).json({ success: false, message: "senderId is required" });

    let user = await UserRegister.findById(cleanUserId);
    let mentor = await UserRegister.findById(cleanMentorId);

    if (!user || !mentor)
      return res.status(404).json({ success: false, message: "User or mentor not found" });

    // ✅ Verify senderId is either userId or mentorId
    if (cleanSenderId !== cleanUserId && cleanSenderId !== cleanMentorId) {
      return res.status(403).json({ 
        success: false, 
        message: "Sender must be either the user or mentor in this chat" 
      });
    }

    // ✅ Check both directions when finding chat
    let chatGroup = await ChatGroup.findOne({
      $and: [
        { groupType: "individual" },
        {
          $or: [
            { enrolledUsers: cleanUserId, mentors: cleanMentorId },
            { enrolledUsers: cleanMentorId, mentors: cleanUserId }
          ]
        }
      ]
    });

    // ✅ Auto-create chat if it doesn't exist
    if (!chatGroup) {
      chatGroup = new ChatGroup({
        groupName: `${user.name} ↔ ${mentor.name}`,
        enrolledUsers: [cleanUserId],
        mentors: [cleanMentorId],
        groupType: "individual",
        status: "Active",
      });
      await chatGroup.save();
    }

    let uploadedMedia = [];
    if (req.files?.length) {
      for (const file of req.files) {
        let fileType = file.mimetype.startsWith("image/")
          ? "image"
          : file.mimetype.startsWith("video/")
          ? "video"
          : file.mimetype === "application/pdf"
          ? "pdf"
          : "document";

        const url = await uploadImage(file.buffer, "chat_files", file.originalname);
        uploadedMedia.push({ url, type: fileType, fileName: file.originalname });
      }
    }

    if (!text && uploadedMedia.length === 0)
      return res.status(400).json({ success: false, message: "Message must contain text or files" });

    const message = new Message({
      chatGroupId: chatGroup._id,
      sender: cleanSenderId,
      text: text || "",
      media: uploadedMedia,
    });
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email profileImage");

    await ChatGroup.findByIdAndUpdate(chatGroup._id, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: cleanSenderId,
        timestamp: new Date(),
      },
    });

    if (io) 
      io.to(chatGroup._id.toString()).emit("newIndividualMessage", { 
        chatGroupId: chatGroup._id, 
        message: populatedMessage 
      });

    const totalMessages = await Message.countDocuments({ chatGroupId: chatGroup._id });

    return res.status(201).json({ 
      success: true, 
      message: "Individual message sent successfully", 
      totalMessages,
      data: populatedMessage 
    });
  } catch (error) {
    console.error("❌ Error sending individual message:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 GET ALL INDIVIDUAL CHATS (One-on-One)                                   */
/* -------------------------------------------------------------------------- */
exports.getAllIndividualChats = async (req, res) => {
   try {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required" });

    const cleanUserId = cleanObjectId(userId);
    if (!cleanUserId)
      return res.status(400).json({ success: false, message: "Invalid userId format" });

    console.log("🔍 Searching chats for user:", cleanUserId);

    // ✅ Convert to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(cleanUserId);

    // ✅ Query for individual chats (including those without groupType field)
    const chats = await ChatGroup.find({
      $and: [
        {
          $or: [
            { enrolledUsers: userObjectId },
            { mentors: userObjectId }
          ]
        },
        {
          $or: [
            { groupType: "individual" },
            { 
              groupType: { $exists: false },
              enrolledUsers: { $size: 1 },
              mentors: { $size: 1 }
            }
          ]
        }
      ]
    })
      .populate("enrolledUsers", "name email profileImage role")
      .populate("mentors", "name email profileImage role")
      .populate("lastMessage.sender", "name email profileImage")
      .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

    console.log("✅ Found chats count:", chats.length);

    if (!chats.length) {
      return res.status(200).json({
        success: true,
        message: "No individual chats found for this user.",
        totalChats: 0,
        data: [],
      });
    }

    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const totalMessages = await Message.countDocuments({ chatGroupId: chat._id });

        const otherUser =
          chat.enrolledUsers.find(u => u._id.toString() !== cleanUserId) ||
          chat.mentors.find(m => m._id.toString() !== cleanUserId);

        return {
          _id: chat._id,
          groupName: chat.groupName,
          groupType: chat.groupType || "individual",
          otherUser: otherUser || null,
          totalMessages,
          lastMessage: chat.lastMessage || null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Individual chats fetched successfully",
      totalChats: chatsWithDetails.length,
      data: chatsWithDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching individual chats:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
/* -------------------------------------------------------------------------- */
/* 💬 GET INDIVIDUAL CHAT MESSAGES                                            */
/* -------------------------------------------------------------------------- */
exports.getIndividualMessages = async (req, res) => {
 try {
    const { userId, mentorId } = req.params;

    if (!userId || !mentorId)
      return res.status(400).json({ success: false, message: "userId and mentorId are required" });

    const cleanUserId = cleanObjectId(userId);
    const cleanMentorId = cleanObjectId(mentorId);

    if (!cleanUserId || !cleanMentorId)
      return res.status(400).json({ success: false, message: "Invalid userId or mentorId format" });

    console.log("🔍 Searching chat between:", cleanUserId, "and", cleanMentorId);

    // ✅ Convert to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(cleanUserId);
    const mentorObjectId = new mongoose.Types.ObjectId(cleanMentorId);

    // ✅ Find chat (handles both with and without groupType field)
    const chatGroup = await ChatGroup.findOne({
      $and: [
        {
          $or: [
            { 
              enrolledUsers: userObjectId, 
              mentors: mentorObjectId 
            },
            { 
              enrolledUsers: mentorObjectId, 
              mentors: userObjectId 
            }
          ]
        },
        {
          $or: [
            { groupType: "individual" },
            { 
              groupType: { $exists: false },
              enrolledUsers: { $size: 1 },
              mentors: { $size: 1 }
            }
          ]
        }
      ]
    })
      .populate("enrolledUsers", "name email profileImage role")
      .populate("mentors", "name email profileImage role");

    console.log("✅ Chat found:", chatGroup ? "Yes" : "No");

    if (!chatGroup) {
      return res.status(404).json({
        success: false,
        message: "No individual chat found between these users.",
        totalMessages: 0,
        data: [],
      });
    }

    // ✅ Fetch all messages in this chat
    const messages = await Message.find({ chatGroupId: chatGroup._id })
      .populate("sender", "name email profileImage role")
      .sort({ createdAt: 1 });

    console.log("✅ Messages count:", messages.length);

    // ✅ Return messages with total count
    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      totalMessages: messages.length,
      chatDetails: {
        _id: chatGroup._id,
        groupName: chatGroup.groupName,
        groupType: chatGroup.groupType || "individual",
        enrolledUsers: chatGroup.enrolledUsers,
        mentors: chatGroup.mentors,
        createdAt: chatGroup.createdAt,
        updatedAt: chatGroup.updatedAt,
      },
      data: messages,
    });
  } catch (error) {
    console.error("❌ Error fetching individual messages:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/* ========================================================================== */
/*                         COMMON MESSAGE ACTIONS                             */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* 🗑️ DELETE MESSAGE                                                          */
/* -------------------------------------------------------------------------- */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId, userId } = req.params;
    const io = req.app.get("io");

    const cleanMessageId = cleanObjectId(messageId);
    const cleanUserId = cleanObjectId(userId);

    if (!cleanMessageId || !cleanUserId)
      return res.status(400).json({ success: false, message: "Invalid messageId or userId" });

    const message = await Message.findById(cleanMessageId);
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    // ✅ Only sender can delete their message
    if (message.sender.toString() !== cleanUserId)
      return res.status(403).json({ success: false, message: "You can only delete your own messages" });

    const chatGroupId = message.chatGroupId;

    await Message.findByIdAndDelete(cleanMessageId);

    // ✅ Update last message if this was the last message
    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (chatGroup && chatGroup.lastMessage?.timestamp) {
      const lastMsg = await Message.findOne({ chatGroupId })
        .sort({ createdAt: -1 })
        .populate("sender", "name");

      if (lastMsg) {
        await ChatGroup.findByIdAndUpdate(chatGroupId, {
          lastMessage: {
            text: lastMsg.text || "Media",
            sender: lastMsg.sender._id,
            timestamp: lastMsg.createdAt,
          },
        });
      } else {
        await ChatGroup.findByIdAndUpdate(chatGroupId, {
          lastMessage: null,
        });
      }
    }

    if (io) 
      io.to(chatGroupId.toString()).emit("messageDeleted", { 
        messageId: cleanMessageId, 
        chatGroupId 
      });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📝 GET MESSAGE BY ID                                                       */
/* -------------------------------------------------------------------------- */
exports.getMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId)
      return res.status(400).json({ success: false, message: "messageId is required" });

    const message = await Message.findById(messageId)
      .populate("sender", "name email profileImage role")
      .populate("chatGroupId", "groupName groupType");

    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    return res.status(200).json({
      success: true,
      message: "Message fetched successfully",
      data: message,
    });
  } catch (error) {
    console.error("❌ Error fetching message by ID:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};