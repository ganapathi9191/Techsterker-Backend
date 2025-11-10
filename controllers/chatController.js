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

    const existingChat = await ChatGroup.findOne({
      enrolledUsers: cleanUserId,
      mentors: cleanMentorId,
      groupType: "individual",
    }).populate("enrolledUsers mentors", "name email profileImage");

    if (existingChat)
      return res.status(200).json({ success: true, message: "Individual chat already exists", data: existingChat });

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
/* 📨 SEND GROUP MESSAGE                                                      */
/* -------------------------------------------------------------------------- */
exports.sendMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { chatGroupId, senderId, text } = req.body;

    const cleanChatGroupId = cleanObjectId(chatGroupId);
    const cleanSenderId = cleanObjectId(senderId);

    if (!cleanChatGroupId || !cleanSenderId)
      return res.status(400).json({ success: false, message: "Invalid chatGroupId or senderId" });

    const chatGroup = await ChatGroup.findById(cleanChatGroupId);
    if (!chatGroup) return res.status(404).json({ success: false, message: "Chat group not found" });

    const sender = await UserRegister.findById(cleanSenderId);
    if (!sender) return res.status(404).json({ success: false, message: "Sender not found" });

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

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email profileImage"
    );

    await ChatGroup.findByIdAndUpdate(cleanChatGroupId, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: cleanSenderId,
        timestamp: new Date(),
      },
    });

    if (io) io.to(cleanChatGroupId).emit("newMessage", { chatGroupId: cleanChatGroupId, message: populatedMessage });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("❌ Error sending group message:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📨 SEND INDIVIDUAL MESSAGE (Auto-create chat if missing)                   */
/* -------------------------------------------------------------------------- */
exports.sendIndividualMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { userId, mentorId, text } = req.body;

    const cleanUserId = cleanObjectId(userId);
    const cleanMentorId = cleanObjectId(mentorId);

    if (!cleanUserId || !cleanMentorId)
      return res.status(400).json({ success: false, message: "Invalid userId or mentorId" });

    let user = await UserRegister.findById(cleanUserId);
    let mentor = await UserRegister.findById(cleanMentorId);

    if (!user || !mentor)
      return res.status(404).json({ success: false, message: "User or mentor not found" });

    // 🔄 Find or create chat group
    let chatGroup = await ChatGroup.findOne({
      enrolledUsers: cleanUserId,
      mentors: cleanMentorId,
      groupType: "individual",
    });

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
      sender: cleanUserId,
      text: text || "",
      media: uploadedMedia,
    });
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate("sender", "name email profileImage");

    await ChatGroup.findByIdAndUpdate(chatGroup._id, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: cleanUserId,
        timestamp: new Date(),
      },
    });

    if (io) io.to(chatGroup._id.toString()).emit("newIndividualMessage", { chatGroupId: chatGroup._id, message: populatedMessage });

    return res.status(201).json({ success: true, message: "Individual message sent successfully", data: populatedMessage });
  } catch (error) {
    console.error("❌ Error sending individual message:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 💬 GET INDIVIDUAL CHAT MESSAGES (Auto-create chat if missing)              */
/* -------------------------------------------------------------------------- */
exports.getIndividualMessages = async (req, res) => {
  try {
    const { userId, mentorId } = req.params;

    const cleanUserId = cleanObjectId(userId);
    const cleanMentorId = cleanObjectId(mentorId);

    if (!cleanUserId || !cleanMentorId)
      return res.status(400).json({ success: false, message: "Invalid userId or mentorId" });

    let chatGroup = await ChatGroup.findOne({
      enrolledUsers: cleanUserId,
      mentors: cleanMentorId,
      groupType: "individual",
    });

    if (!chatGroup) {
      chatGroup = new ChatGroup({
        groupName: `Chat-${cleanUserId.slice(-4)}↔${cleanMentorId.slice(-4)}`,
        enrolledUsers: [cleanUserId],
        mentors: [cleanMentorId],
        groupType: "individual",
        status: "Active",
      });
      await chatGroup.save();
    }

    const messages = await Message.find({ chatGroupId: chatGroup._id })
      .populate("sender", "name email profileImage")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Chat messages fetched successfully",
      chatGroup,
      totalMessages: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("❌ Error fetching individual messages:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 GET ALL INDIVIDUAL CHATS                                                */
/* -------------------------------------------------------------------------- */
exports.getAllIndividualChats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });

    const chats = await ChatGroup.find({
      $or: [{ enrolledUsers: userId }, { mentors: userId }],
      groupType: "individual",
    })
      .populate("enrolledUsers mentors", "name email profileImage")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, message: "Individual chats fetched successfully", data: chats });
  } catch (error) {
    console.error("❌ Error fetching individual chats:", error);
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
      return res.status(400).json({ success: false, message: "userId (or mentorId) is required in params" });

    const groups = await ChatGroup.find({
      $or: [{ enrolledUsers: userId }, { mentors: userId }],
      groupType: { $ne: "individual" },
    })
      .populate("enrolledUsers mentors", "name email profileImage role")
      .populate("courseId", "courseName")
      .populate("enrollmentId", "batchName batchNumber")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Group chats fetched successfully",
      totalGroups: groups.length,
      data: groups,
    });
  } catch (error) {
    console.error("❌ Error fetching group chats:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 💬 GET GROUP MESSAGES BY GROUP ID                                          */
/* -------------------------------------------------------------------------- */
exports.getGroupMessagesById = async (req, res) => {
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
      messages,
    });
  } catch (error) {
    console.error("❌ Error fetching group messages:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
