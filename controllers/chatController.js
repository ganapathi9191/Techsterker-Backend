const { ChatGroup, Message, UserChatPreference, Notification } = require("../models/ChatGroup");
const { Enrollment } = require("../models/enrollment");
const UserRegister = require("../models/registerUser");
const { uploadImage } = require("../config/cloudinary1");
const mongoose = require("mongoose");

/**
 * 🆕 CREATE GROUP CHAT
 */
exports.createGroupChat = async (req, res) => {
  try {
    const { groupName, enrollmentId, courseId, mentorId } = req.body;

    if (!groupName)
      return res.status(400).json({ success: false, message: "groupName is required" });

    let enrolledUsers = [];
    let mentors = [];

    // For enrollment-based group
    if (enrollmentId) {
      const enrollment = await Enrollment.findById(enrollmentId).populate("courseId");
      if (!enrollment)
        return res.status(404).json({ success: false, message: "Enrollment not found" });
      enrolledUsers = enrollment.enrolledUsers || [];
      mentors = enrollment.mentors || [];
    }

    // For course-based group
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

    res.status(201).json({
      success: true,
      message: "Group chat created successfully",
      data: populatedGroup,
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * 🆕 CREATE INDIVIDUAL CHAT
 */
exports.createIndividualChat = async (req, res) => {
  try {
    const { userId, mentorId, groupName } = req.body;

    if (!userId || !mentorId) {
      return res.status(400).json({
        success: false,
        message: "userId and mentorId are required",
      });
    }

    let user = await UserRegister.findById(userId);
    let mentor = await UserRegister.findById(mentorId);

    // ✅ Automatically create user if not found
    if (!user) {
      console.log("⚠️ User not found, creating new test user...");
      user = new UserRegister({
        _id: userId,
        name: `User-${userId.slice(-5)}`,
        email: `user${userId.slice(-5)}@example.com`,
        password: "123456",
        role: "student",
        profileImage: "https://res.cloudinary.com/demo/image/upload/v1730999999/default-user.jpg",
      });
      await user.save();
    }

    // ✅ Automatically create mentor if not found
    if (!mentor) {
      console.log("⚠️ Mentor not found, creating new test mentor...");
      mentor = new UserRegister({
        _id: mentorId,
        name: `Mentor-${mentorId.slice(-5)}`,
        email: `mentor${mentorId.slice(-5)}@example.com`,
        password: "123456",
        role: "mentor",
        profileImage: "https://res.cloudinary.com/demo/image/upload/v1730999999/default-mentor.jpg",
      });
      await mentor.save();
    }

    // ✅ Prevent duplicate chats between same user and mentor
    const existingChat = await ChatGroup.findOne({
      enrolledUsers: userId,
      mentors: mentorId,
      groupName,
    }).populate("enrolledUsers mentors", "name email profileImage");

    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: "Individual chat already exists",
        data: existingChat,
      });
    }

    // ✅ Create new chat
    const chatGroup = new ChatGroup({
      groupName: groupName || `${user.name} ↔ ${mentor.name}`,
      enrolledUsers: [userId],
      mentors: [mentorId],
      status: "Active",
    });

    await chatGroup.save();

    // ✅ Populate full info for response
    const populatedGroup = await ChatGroup.findById(chatGroup._id)
      .populate("enrolledUsers", "name email profileImage")
      .populate("mentors", "name email profileImage");

    return res.status(201).json({
      success: true,
      message: "Individual chat created successfully",
      data: populatedGroup,
    });
  } catch (error) {
    console.error("Error creating individual chat:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * 📨 SEND MESSAGE - Fixed to match schema and handle file uploads properly
 */
exports.sendMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { chatGroupId, senderId, text } = req.body;

    console.log("📨 Received message request");
    console.log("Body:", req.body);
    console.log("Files:", req.files);

    // Validate required fields
    if (!chatGroupId || !senderId) {
      return res.status(400).json({
        success: false,
        message: "chatGroupId and senderId are required",
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(chatGroupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chatGroupId format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid senderId format",
      });
    }

    // Validate chat group exists
    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (!chatGroup) {
      return res.status(404).json({ 
        success: false, 
        message: "Chat group not found" 
      });
    }

    // Validate sender exists
    const sender = await UserRegister.findById(senderId);
    if (!sender) {
      return res.status(404).json({ 
        success: false, 
        message: "Sender not found" 
      });
    }

    let uploadedMedia = [];

    /**
     * ✅ Handle file uploads from form-data
     */
    if (req.files && req.files.length > 0) {
      console.log(`📁 Processing ${req.files.length} file(s)...`);

      for (const file of req.files) {
        try {
          console.log(`⬆️ Uploading: ${file.originalname} (${file.mimetype})`);

          // Determine file type based on mimetype
          let fileType = "document"; // default
          if (file.mimetype.startsWith("image/")) {
            fileType = "image";
          } else if (file.mimetype.startsWith("video/")) {
            fileType = "video";
          } else if (file.mimetype === "application/pdf") {
            fileType = "pdf";
          }

          // Upload to Cloudinary
          const uploadedUrl = await uploadImage(
            file.buffer, 
            "chat_files", 
            file.originalname
          );

          uploadedMedia.push({
            url: uploadedUrl,
            type: fileType,
            fileName: file.originalname,
          });

          console.log(`✅ Uploaded: ${file.originalname} -> ${uploadedUrl}`);
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.originalname}:`, uploadError);
          return res.status(500).json({
            success: false,
            message: `Failed to upload file: ${file.originalname}`,
            error: uploadError.message,
          });
        }
      }
    }

    // Validate at least text or files are present
    if (!text && uploadedMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message must contain either text or files",
      });
    }

    /**
     * ✅ SAVE MESSAGE TO DATABASE (using correct field names)
     */
    const message = new Message({
      chatGroupId,
      sender: senderId,  // ✅ Changed from senderId to sender
      text: text || "",
      media: uploadedMedia,  // ✅ Changed from files to media
    });

    await message.save();

    // Populate sender details
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",  // ✅ Changed from senderId to sender
      "name email profileImage"
    );

    // Update last message in chat group
    await ChatGroup.findByIdAndUpdate(chatGroupId, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: senderId,
        timestamp: new Date()
      }
    });

    /**
     * ✅ EMIT REAL-TIME MESSAGE VIA SOCKET.IO
     */
    if (io) {
      io.to(chatGroupId).emit("newMessage", {
        chatGroupId,
        message: populatedMessage,
      });
    }

    console.log("✅ Message sent successfully");

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


/**
 * 📨 SEND INDIVIDUAL MESSAGE (User ↔ Mentor)
 */
exports.sendIndividualMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { userId, mentorId, text } = req.body;

    console.log("📨 Individual message request:", req.body);

    if (!userId || !mentorId) {
      return res.status(400).json({
        success: false,
        message: "userId and mentorId are required",
      });
    }

    const user = await UserRegister.findById(userId);
    const mentor = await UserRegister.findById(mentorId);
    if (!user || !mentor)
      return res.status(404).json({ success: false, message: "User or mentor not found" });

    // ✅ Find existing individual chat between user and mentor
    let chatGroup = await ChatGroup.findOne({
      enrolledUsers: userId,
      mentors: mentorId,
      groupType: "individual",
    });

    // ✅ Create one if not found
    if (!chatGroup) {
      chatGroup = new ChatGroup({
        groupName: `${user.name} ↔ ${mentor.name}`,
        enrolledUsers: [userId],
        mentors: [mentorId],
        status: "Active",
        groupType: "individual", // mark as 1-on-1 chat
      });
      await chatGroup.save();
    }

    let uploadedMedia = [];

    // ✅ Handle file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let fileType = "document";
        if (file.mimetype.startsWith("image/")) fileType = "image";
        else if (file.mimetype.startsWith("video/")) fileType = "video";
        else if (file.mimetype === "application/pdf") fileType = "pdf";

        const uploadedUrl = await uploadImage(file.buffer, "chat_files", file.originalname);

        uploadedMedia.push({
          url: uploadedUrl,
          type: fileType,
          fileName: file.originalname,
        });
      }
    }

    if (!text && uploadedMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message must contain either text or files",
      });
    }

    // ✅ Save message in DB
    const message = new Message({
      chatGroupId: chatGroup._id,
      sender: userId,
      text: text || "",
      media: uploadedMedia,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email profileImage"
    );

    // ✅ Update last message for chatGroup
    await ChatGroup.findByIdAndUpdate(chatGroup._id, {
      lastMessage: {
        text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
        sender: userId,
        timestamp: new Date(),
      },
    });

    // ✅ Emit real-time event
    if (io) {
      io.to(chatGroup._id.toString()).emit("newIndividualMessage", {
        chatGroupId: chatGroup._id,
        message: populatedMessage,
      });
    }

    console.log("✅ Individual message sent successfully");

    return res.status(201).json({
      success: true,
      message: "Individual message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("❌ Error sending individual message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * 📜 GET INDIVIDUAL CHAT MESSAGES (User ↔ Mentor)
 */
exports.getIndividualMessages = async (req, res) => {
  try {
    const { userId, mentorId } = req.params;

    if (!userId || !mentorId) {
      return res.status(400).json({
        success: false,
        message: "userId and mentorId are required",
      });
    }

    const chatGroup = await ChatGroup.findOne({
      enrolledUsers: userId,
      mentors: mentorId,
      groupType: "individual",
    });

    if (!chatGroup)
      return res.status(404).json({ success: false, message: "Chat not found" });

    const messages = await Message.find({ chatGroupId: chatGroup._id })
      .populate("sender", "name email profileImage")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Chat messages fetched successfully",
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

/**
 * 📋 GET ALL INDIVIDUAL CHATS (For User or Mentor)
 */
exports.getAllIndividualChats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required" });

    const chats = await ChatGroup.find({
      $or: [{ enrolledUsers: userId }, { mentors: userId }],
      groupType: "individual",
    })
      .populate("enrolledUsers mentors", "name email profileImage")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Individual chats fetched successfully",
      data: chats,
    });
  } catch (error) {
    console.error("❌ Error fetching individual chats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * 📋 GET ALL GROUP CHATS (for User or Mentor)
 */
exports.getAllGroupChats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId (or mentorId) is required in params",
      });
    }

    // ✅ Fetch all chat groups where the user is either student or mentor
    const groups = await ChatGroup.find({
      $or: [{ enrolledUsers: userId }, { mentors: userId }],
      groupType: { $ne: "individual" }, // exclude 1-on-1 chats
    })
      .populate("enrolledUsers mentors", "name email profileImage role")
      .populate("courseId", "courseName")
      .populate("enrollmentId", "batchName batchNumber")
      .sort({ updatedAt: -1 });

    if (!groups.length) {
      return res.status(404).json({
        success: false,
        message: "No group chats found for this user or mentor",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group chats fetched successfully",
      totalGroups: groups.length,
      data: groups.map(g => ({
        _id: g._id,
        groupName: g.groupName,
        courseName: g.courseId?.courseName || null,
        batchName: g.enrollmentId?.batchName || null,
        enrolledUsers: g.enrolledUsers,
        mentors: g.mentors,
        lastMessage: g.lastMessage || null,
        updatedAt: g.updatedAt,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching group chats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


/**
 * 💬 GET GROUP MESSAGES BY GROUP ID (User or Mentor)
 */
exports.getGroupMessagesById = async (req, res) => {
  try {
    const { chatGroupId, userId } = req.params;

    if (!chatGroupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "chatGroupId and userId are required in params",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatGroupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const chatGroup = await ChatGroup.findById(chatGroupId)
      .populate("enrolledUsers mentors", "name email profileImage role")
      .populate("courseId", "courseName")
      .populate("enrollmentId", "batchName batchNumber");

    if (!chatGroup) {
      return res.status(404).json({
        success: false,
        message: "Chat group not found",
      });
    }

    // ✅ Check if user (student or mentor) is part of this group
    const isMember =
      chatGroup.enrolledUsers.some(u => u._id.toString() === userId) ||
      chatGroup.mentors.some(m => m._id.toString() === userId);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this group.",
      });
    }

    // ✅ Fetch all messages in that group
    const messages = await Message.find({ chatGroupId })
      .populate("sender", "name email profileImage role")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Group messages fetched successfully",
      totalMessages: messages.length,
      groupDetails: {
        _id: chatGroup._id,
        groupName: chatGroup.groupName,
        courseName: chatGroup.courseId?.courseName || null,
        batchName: chatGroup.enrollmentId?.batchName || null,
        mentors: chatGroup.mentors,
      },
      messages,
    });
  } catch (error) {
    console.error("❌ Error fetching group messages:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

