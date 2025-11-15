const { ChatGroup, Message, UserChatPreference, Notification } = require("../models/ChatGroup");
const { Enrollment } = require("../models/enrollment");
const UserRegister = require("../models/registerUser");
const Admin = require("../models/Admin");
const { uploadImage } = require("../config/cloudinary1");
const { Mentor } = require("../models/ourMentors");
const mongoose = require("mongoose");

// ✅ Helper function: validate and clean ObjectIds
const cleanObjectId = (id) => {
    if (!id) return null;
    const trimmed = String(id).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) return trimmed;
    const match = trimmed.match(/[a-f\d]{24}/i);
    return match ? match[0] : null;
};

// ✅ Helper function: Format user name properly
const formatUserName = (user) => {
    if (!user) return "Unknown User";

    // Check for firstName/lastName
    if (user.firstName || user.lastName) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    // Check for name field
    if (user.name) {
        return user.name;
    }

    // Fallback
    return user.email || "Unknown User";
};

/* ========================================================================== */
/*                            GROUP CHAT SECTION                              */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* 🆕 CREATE GROUP CHAT                                                       */
/* -------------------------------------------------------------------------- */
exports.createGroupChat = async (req, res) => {
    try {
        const { groupName, adminId, enrollmentId } = req.body;

        if (!groupName || !adminId || !enrollmentId) {
            return res.status(400).json({
                success: false,
                message: "groupName, adminId, and enrollmentId are required.",
            });
        }

        const cleanAdminId = cleanObjectId(adminId);
        const cleanEnrollmentId = cleanObjectId(enrollmentId);

        // ✅ Validate Admin
        const admin = await Admin.findById(cleanAdminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // ✅ Validate Enrollment
        const enrollment = await Enrollment.findById(cleanEnrollmentId)
            .populate("courseId")
            .populate("assignedMentors", "firstName lastName email phoneNumber expertise subjects profileImage")
            .populate("enrolledUsers", "firstName lastName name email phoneNumber profileImage");

        if (!enrollment) {
            return res.status(404).json({ success: false, message: "Enrollment not found" });
        }

        // ✅ Extract enrolled users
        const enrolledUsers = (enrollment.enrolledUsers || []).map((u) => u._id);

        // ✅ Extract mentors safely (handles populated or plain ObjectIds)
        let mentors = [];
        if (Array.isArray(enrollment.assignedMentors) && enrollment.assignedMentors.length > 0) {
            mentors = enrollment.assignedMentors.map((m) => m._id || m);
        } else {
            console.warn(`⚠️ No mentors found in enrollment ${cleanEnrollmentId}`);
        }

        if (enrolledUsers.length === 0 && mentors.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No enrolled users or mentors found in this enrollment.",
            });
        }

        // ✅ Create new group
        const chatGroup = new ChatGroup({
            groupName,
            adminId: cleanAdminId,
            enrollmentId: cleanEnrollmentId,
            courseId: enrollment.courseId || null,
            enrolledUsers,
            mentors,
            groupType: "group",
            status: "Active",
        });

        await chatGroup.save();

        // ✅ Populate for response
        const populatedGroup = await ChatGroup.findById(chatGroup._id)
            .populate("adminId", "name email role")
            .populate("enrollmentId", "batchName batchNumber")
            .populate("courseId", "courseName")
            .populate("enrolledUsers", "firstName lastName name email phoneNumber profileImage")
            .populate("mentors", "firstName lastName name email phoneNumber profileImage expertise subjects");

        return res.status(201).json({
            success: true,
            message: "Group chat created successfully by admin",
            data: populatedGroup,
        });
    } catch (error) {
        console.error("❌ Error creating admin group chat:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while creating group chat",
            error: error.message,
        });
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

        const chatGroup = await ChatGroup.findById(cleanChatGroupId)
            .populate("adminId", "name email role")
            .populate("enrolledUsers", "firstName lastName name email")
            .populate("mentors", "firstName lastName name email");

        if (!chatGroup)
            return res.status(404).json({ success: false, message: "Chat group not found" });

        // ✅ Verify sender is part of group or is admin
        const isMember =
            chatGroup.enrolledUsers.some(u => u._id.toString() === cleanSenderId) ||
            chatGroup.mentors.some(m => m._id.toString() === cleanSenderId) ||
            (chatGroup.adminId && chatGroup.adminId._id.toString() === cleanSenderId);

        if (!isMember)
            return res.status(403).json({ success: false, message: "You are not a member or admin of this group" });

        // ✅ Upload files if attached
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

        // ✅ Save message
        const message = new Message({
            chatGroupId: cleanChatGroupId,
            sender: cleanSenderId,
            text: text || "",
            media: uploadedMedia,
        });
        await message.save();

        // ✅ Manually fetch sender details
        let senderDetails = null;
        let sender = await UserRegister.findById(cleanSenderId).select("firstName lastName name email profileImage role");

        if (!sender) {
            sender = await Mentor.findById(cleanSenderId).select("firstName lastName name email profileImage role");
        }

        if (!sender) {
            sender = await Admin.findById(cleanSenderId).select("name email role");
        }

        if (sender) {
            senderDetails = {
                _id: sender._id,
                name: formatUserName(sender),
                email: sender.email || "",
                profileImage: sender.profileImage || "",
                role: sender.role || "User",
            };
        }

        const populatedMessage = {
            _id: message._id,
            chatGroupId: message.chatGroupId,
            sender: senderDetails,
            text: message.text || "",
            media: message.media || [],
            isEdited: false,
            editedAt: null,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        };

        // ✅ Update last message in group
        await ChatGroup.findByIdAndUpdate(cleanChatGroupId, {
            lastMessage: {
                text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
                sender: cleanSenderId,
                timestamp: new Date(),
            },
        });

        // ✅ Emit via Socket.io
        if (io)
            io.to(cleanChatGroupId).emit("newGroupMessage", {
                chatGroupId: cleanChatGroupId,
                message: populatedMessage,
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

        const userObjectId = new mongoose.Types.ObjectId(cleanUserId);

        // ✅ Find all group chats where user is enrolled, mentor, or admin
        const chats = await ChatGroup.find({
            groupType: "group",
            $or: [
                { enrolledUsers: userObjectId },
                { mentors: userObjectId },
                { adminId: userObjectId },
            ],
        })
            .populate("adminId", "name email role")
            .populate("enrolledUsers", "firstName lastName name email phoneNumber profileImage")
            .populate("mentors", "firstName lastName name email phoneNumber profileImage expertise subjects")
            .populate("lastMessage.sender", "firstName lastName name email profileImage")
            .populate("courseId", "courseName")
            .populate("enrollmentId", "batchName batchNumber")
            .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

        if (!chats.length) {
            return res.status(200).json({
                success: true,
                message: "No group chats found for this user, mentor, or admin.",
                totalGroups: 0,
                data: [],
            });
        }

        // ✅ Add extra info (total messages, mentors, etc.)
        const chatsWithDetails = await Promise.all(
            chats.map(async (chat) => {
                const totalMessages = await Message.countDocuments({ chatGroupId: chat._id });

                // 🧩 Format mentors list with proper names
                const mentorDetails = (chat.mentors || []).map((m) => ({
                    _id: m._id,
                    name: formatUserName(m),
                    email: m.email || "",
                    phoneNumber: m.phoneNumber || "",
                    expertise: m.expertise || "",
                    subjects: m.subjects || [],
                    profileImage: m.profileImage || "",
                    role: "Mentor",
                }));

                // 🧩 Format enrolled users with proper names
                const enrolledUserDetails = (chat.enrolledUsers || []).map((u) => ({
                    _id: u._id,
                    name: formatUserName(u),
                    email: u.email || "",
                    phoneNumber: u.phoneNumber || "",
                    profileImage: u.profileImage || "",
                    role: "Student",
                }));

                // 🧩 Format last message sender
                let lastMessageFormatted = null;
                if (chat.lastMessage) {
                    lastMessageFormatted = {
                        text: chat.lastMessage.text || "",
                        timestamp: chat.lastMessage.timestamp || null,
                        sender: chat.lastMessage.sender ? {
                            _id: chat.lastMessage.sender._id,
                            name: formatUserName(chat.lastMessage.sender),
                            email: chat.lastMessage.sender.email || "",
                            profileImage: chat.lastMessage.sender.profileImage || "",
                        } : null,
                    };
                }

                return {
                    _id: chat._id,
                    groupName: chat.groupName || "Unnamed Group",
                    admin: chat.adminId || null,
                    courseName: chat.courseId?.courseName || "No Course",
                    batchName: chat.enrollmentId?.batchName || "No Batch",
                    groupType: chat.groupType,
                    enrolledUsers: enrolledUserDetails,
                    mentors: mentorDetails,
                    totalMessages,
                    lastMessage: lastMessageFormatted,
                    membersCount:
                        (chat.enrolledUsers?.length || 0) +
                        (chat.mentors?.length || 0) +
                        (chat.adminId ? 1 : 0),
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Group chats fetched successfully",
            totalGroups: chatsWithDetails.length,
            data: chatsWithDetails,
        });
    } catch (error) {
        console.error("❌ Error fetching group chats:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching group chats",
            error: error.message,
        });
    }
};

exports.getGroupMessages = async (req, res) => {
    try {
        const { chatGroupId, userId } = req.params;

        const cleanChatGroupId = cleanObjectId(chatGroupId);
        const cleanUserId = cleanObjectId(userId);

        if (!cleanChatGroupId || !cleanUserId)
            return res.status(400).json({ success: false, message: "Invalid chatGroupId or userId" });

        const chatGroup = await ChatGroup.findById(cleanChatGroupId)
            .populate("adminId", "name email role")
            .populate("enrolledUsers", "firstName lastName name email profileImage role")
            .populate("mentors", "firstName lastName name email profileImage role")
            .populate("courseId", "courseName")
            .populate("enrollmentId", "batchName batchNumber");

        if (!chatGroup)
            return res.status(404).json({ success: false, message: "Chat group not found" });

        // ✅ Check if user is admin, mentor, or enrolled user
        const isMember =
            chatGroup.enrolledUsers.some(u => u._id.toString() === cleanUserId) ||
            chatGroup.mentors.some(m => m._id.toString() === cleanUserId) ||
            (chatGroup.adminId && chatGroup.adminId._id.toString() === cleanUserId);

        if (!isMember)
            return res.status(403).json({ success: false, message: "Access denied. Not a member or admin of this group." });

        // ✅ Fetch messages WITHOUT populate first
        const messages = await Message.find({ chatGroupId: cleanChatGroupId })
            .sort({ createdAt: 1 });

        // ✅ Manually fetch sender details from appropriate collections
        const formattedMessages = await Promise.all(messages.map(async (msg) => {
            let senderDetails = null;

            if (msg.sender) {
                const senderId = msg.sender.toString();

                // Try UserRegister first
                let sender = await UserRegister.findById(senderId).select("firstName lastName name email profileImage role");

                // If not found, try Mentor
                if (!sender) {
                    sender = await Mentor.findById(senderId).select("firstName lastName name email profileImage role expertise subjects");
                }

                // If still not found, try Admin
                if (!sender) {
                    sender = await Admin.findById(senderId).select("name email role");
                }

                if (sender) {
                    senderDetails = {
                        _id: sender._id,
                        name: formatUserName(sender),
                        email: sender.email || "",
                        profileImage: sender.profileImage || "",
                        role: sender.role || "User",
                    };
                }
            }

            return {
                _id: msg._id,
                chatGroupId: msg.chatGroupId,
                sender: senderDetails,
                text: msg.text || "",
                media: msg.media || [],
                isEdited: msg.isEdited || false,
                editedAt: msg.editedAt || null,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            };
        }));

        // ✅ Format group details with proper names
        const groupDetails = {
            _id: chatGroup._id,
            groupName: chatGroup.groupName || "Unnamed Group",
            groupType: chatGroup.groupType || "group",
            admin: chatGroup.adminId || null,
            courseName: chatGroup.courseId?.courseName || "No Course",
            batchName: chatGroup.enrollmentId?.batchName || "No Batch",
            enrolledUsers: (chatGroup.enrolledUsers || []).map(u => ({
                _id: u._id,
                name: formatUserName(u),
                email: u.email || "",
                profileImage: u.profileImage || "",
                role: u.role || "Student",
            })),
            mentors: (chatGroup.mentors || []).map(m => ({
                _id: m._id,
                name: formatUserName(m),
                email: m.email || "",
                profileImage: m.profileImage || "",
                role: m.role || "Mentor",
            })),
            createdAt: chatGroup.createdAt,
            updatedAt: chatGroup.updatedAt,
        };

        return res.status(200).json({
            success: true,
            message: "Group messages fetched successfully",
            totalMessages: formattedMessages.length,
            groupDetails,
            data: formattedMessages,
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
        const { userId, mentorId, groupName, enrollmentId } = req.body;

        if (!userId || !mentorId) {
            return res.status(400).json({
                success: false,
                message: "userId and mentorId are required",
            });
        }

        const cleanUserId = cleanObjectId(userId);
        const cleanMentorId = cleanObjectId(mentorId);
        const cleanEnrollmentId = enrollmentId ? cleanObjectId(enrollmentId) : null;

        if (!cleanUserId || !cleanMentorId) {
            return res.status(400).json({
                success: false,
                message: "Invalid ObjectId format",
            });
        }

        console.log("🔍 Creating individual chat for:", cleanUserId, "and", cleanMentorId);

        // ✅ Fetch user
        const user = await UserRegister.findById(cleanUserId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        // ✅ Fetch mentor
        let mentor = null;
        let mentorModelType = "Mentor";

        mentor = await Mentor.findById(cleanMentorId);
        if (!mentor) {
            mentor = await UserRegister.findById(cleanMentorId);
            if (mentor) mentorModelType = "UserRegister";
        }
        if (!mentor) {
            mentor = await Admin.findById(cleanMentorId);
            if (mentor) mentorModelType = "Admin";
        }

        if (!mentor)
            return res.status(404).json({
                success: false,
                message: "Mentor not found in system",
            });

        // ✅ Auto-fetch enrollment if not provided
        let finalEnrollmentId = cleanEnrollmentId;
        if (!finalEnrollmentId) {
            const existingEnrollment = await Enrollment.findOne({
                enrolledUsers: cleanUserId,
                assignedMentors: cleanMentorId,
            });
            if (existingEnrollment) {
                finalEnrollmentId = existingEnrollment._id;
                console.log("✅ Auto-linked enrollment:", finalEnrollmentId);
            } else {
                console.warn("⚠️ No matching enrollment found for user + mentor pair");
            }
        }

        // ✅ Check for existing chat
        let existingChat = await ChatGroup.findOne({
            $and: [
                { groupType: "individual" },
                {
                    $or: [
                        { enrolledUsers: cleanUserId, mentors: cleanMentorId },
                        { enrolledUsers: cleanMentorId, mentors: cleanUserId },
                    ],
                },
            ],
        });

        // ✅ If chat exists but enrollmentId is missing, update it
        if (existingChat) {
            if (!existingChat.enrollmentId && finalEnrollmentId) {
                existingChat.enrollmentId = finalEnrollmentId;
                await existingChat.save();
                console.log("✅ Updated existing chat with enrollmentId:", finalEnrollmentId);
            }

            const populatedExisting = await ChatGroup.findById(existingChat._id)
                .populate("enrolledUsers", "firstName lastName name email role")
                .populate({
                    path: "mentors",
                    model: mentorModelType,
                    select: "firstName lastName name email profileImage role",
                })
                .populate("enrollmentId", "batchName batchNumber courseId");

            return res.status(200).json({
                success: true,
                message: "Individual chat already exists",
                data: populatedExisting,
            });
        }

        // ✅ Create new chat group with proper name
        const chatGroup = new ChatGroup({
            groupName: groupName || `${formatUserName(user)} ↔ ${formatUserName(mentor)}`,
            enrolledUsers: [cleanUserId],
            mentors: [cleanMentorId],
            mentorModel: mentorModelType,
            enrollmentId: finalEnrollmentId || null,
            groupType: "individual",
            status: "Active",
        });

        await chatGroup.save();

        const populatedGroup = await ChatGroup.findById(chatGroup._id)
            .populate("enrolledUsers", "firstName lastName name email role")
            .populate({
                path: "mentors",
                model: mentorModelType,
                select: "firstName lastName name email profileImage role",
            })
            .populate("enrollmentId", "batchName batchNumber courseId");

        return res.status(201).json({
            success: true,
            message: "Individual chat created successfully",
            data: populatedGroup,
        });
    } catch (error) {
        console.error("❌ Error creating individual chat:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while creating individual chat",
            error: error.message,
        });
    }
};






/* -------------------------------------------------------------------------- */
/* 📨 SEND INDIVIDUAL MESSAGE (Auto-create chat if missing)                   */
/* -------------------------------------------------------------------------- */






exports.sendIndividualMessage = async (req, res) => {
     try {
        const io = req.app.get("io");
        let { userId, mentorId, senderId, text } = req.body;

        // ✅ Remove quotes if present
        userId = String(userId || "").replace(/['"]/g, "").trim();
        mentorId = String(mentorId || "").replace(/['"]/g, "").trim();
        senderId = String(senderId || "").replace(/['"]/g, "").trim();

        console.log("📥 Received IDs:", { userId, mentorId, senderId });

        const cleanUserId = cleanObjectId(userId);
        const cleanMentorId = cleanObjectId(mentorId);
        const cleanSenderId = cleanObjectId(senderId);

        console.log("🧹 Cleaned IDs:", { cleanUserId, cleanMentorId, cleanSenderId });

        if (!cleanUserId || !cleanMentorId) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid userId or mentorId format",
                debug: { userId, mentorId, cleanUserId, cleanMentorId }
            });
        }

        if (!cleanSenderId) {
            return res.status(400).json({ 
                success: false, 
                message: "senderId is required or invalid",
                debug: { senderId, cleanSenderId }
            });
        }

        // ✅ Find user in UserRegister
        let user = await UserRegister.findById(cleanUserId);
        
        console.log("👤 User lookup:", { 
            searchId: cleanUserId, 
            found: !!user,
            userName: user ? formatUserName(user) : "Not found"
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found in UserRegister collection",
                debug: { cleanUserId }
            });
        }

        // ✅ Find mentor - check Mentor collection first, then UserRegister, then Admin
        let mentor = await Mentor.findById(cleanMentorId);
        let mentorModelType = "Mentor";

        console.log("🔍 Mentor lookup in Mentor collection:", {
            searchId: cleanMentorId,
            found: !!mentor
        });

        if (!mentor) {
            mentor = await UserRegister.findById(cleanMentorId);
            if (mentor) {
                mentorModelType = "UserRegister";
                console.log("🔍 Mentor found in UserRegister collection");
            }
        }

        if (!mentor) {
            mentor = await Admin.findById(cleanMentorId);
            if (mentor) {
                mentorModelType = "Admin";
                console.log("🔍 Mentor found in Admin collection");
            }
        }

        if (!mentor) {
            console.error("❌ Mentor not found in any collection:", cleanMentorId);
            return res.status(404).json({ 
                success: false, 
                message: "Mentor not found in any collection (Mentor, UserRegister, Admin)",
                debug: { 
                    cleanMentorId,
                    searchedIn: ["Mentor", "UserRegister", "Admin"]
                }
            });
        }

        console.log("✅ User found:", formatUserName(user));
        console.log("✅ Mentor found:", formatUserName(mentor), "- Model:", mentorModelType);

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
            console.log("⚠️ Chat not found, creating new chat...");
            
            chatGroup = new ChatGroup({
                groupName: `${formatUserName(user)} ↔ ${formatUserName(mentor)}`,
                enrolledUsers: [cleanUserId],
                mentors: [cleanMentorId],
                mentorModel: mentorModelType,
                groupType: "individual",
                status: "Active",
            });
            await chatGroup.save();
            console.log("✅ New chat created:", chatGroup._id);
        }

        // ✅ Handle file uploads
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

        // ✅ Create message
        const message = new Message({
            chatGroupId: chatGroup._id,
            sender: cleanSenderId,
            text: text || "",
            media: uploadedMedia,
        });
        await message.save();

        // ✅✅✅ CRITICAL: DETERMINE SENDER DETAILS - CHECK IN PRIORITY ORDER ✅✅✅
        // Priority: Admin > Mentor > User
        let senderDetails = null;

        console.log("🔍 Starting sender detection for ID:", cleanSenderId);

        // 🥇 FIRST: Check Admin collection
        let adminSender = await Admin.findById(cleanSenderId).lean();
        if (adminSender) {
            senderDetails = {
                _id: adminSender._id,
                name: formatUserName(adminSender),
                email: adminSender.email || "",
                profileImage: adminSender.profileImage || adminSender.image || ""
            };
            console.log("✅ Sender found in Admin collection");
        }

        // 🥈 SECOND: Check Mentor collection (only if not found as Admin)
        if (!senderDetails) {
            let mentorSender = await Mentor.findById(cleanSenderId).lean();
            if (mentorSender) {
                senderDetails = {
                    _id: mentorSender._id,
                    name: formatUserName(mentorSender),
                    email: mentorSender.email || "",
                    profileImage: mentorSender.profileImage || mentorSender.image || ""
                };
                console.log("✅ Sender found in Mentor collection");
            }
        }

        // 🥉 THIRD: Check UserRegister collection (only if not found as Admin or Mentor)
        if (!senderDetails) {
            let userSender = await UserRegister.findById(cleanSenderId).lean();
            if (userSender) {
                senderDetails = {
                    _id: userSender._id,
                    name: formatUserName(userSender),
                    email: userSender.email || "",
                    profileImage: userSender.profileImage || userSender.image || ""
                };
                console.log("✅ Sender found in UserRegister collection");
            }
        }

        // ❌ If sender not found in any collection
        if (!senderDetails) {
            console.error("❌ Sender not found in any collection:", cleanSenderId);
            return res.status(404).json({
                success: false,
                message: "Sender not found in any collection (Admin, Mentor, UserRegister)",
                debug: { cleanSenderId }
            });
        }

        console.log("✅ Final sender details:", senderDetails);

        // ✅ CRITICAL: Remove any role field if it exists
        if (senderDetails && senderDetails.role) {
            delete senderDetails.role;
        }

        const formattedMessage = {
            _id: message._id,
            chatGroupId: message.chatGroupId,
            sender: senderDetails,
            senderId: cleanSenderId, // ✅ Add senderId for frontend comparison
            text: message.text || "",
            media: message.media || [],
            isEdited: false,
            editedAt: null,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        };

        // ✅ Update last message in chat group
        await ChatGroup.findByIdAndUpdate(chatGroup._id, {
            lastMessage: {
                text: text || (uploadedMedia.length > 0 ? `Sent ${uploadedMedia.length} file(s)` : ""),
                sender: cleanSenderId,
                timestamp: new Date(),
            },
        });

        // ✅ Emit socket event
        if (io)
            io.to(chatGroup._id.toString()).emit("newIndividualMessage", {
                chatGroupId: chatGroup._id,
                message: formattedMessage
            });

        const totalMessages = await Message.countDocuments({ chatGroupId: chatGroup._id });

        return res.status(201).json({
            success: true,
            message: "Individual message sent successfully",
            totalMessages,
            data: formattedMessage
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

        const userObjectId = new mongoose.Types.ObjectId(cleanUserId);

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
            .populate("enrolledUsers", "firstName lastName name email profileImage role")
            .populate("mentors", "firstName lastName name email profileImage role")
            .populate("lastMessage.sender", "firstName lastName name email profileImage")
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

                // ✅ Format last message sender
                let lastMessageFormatted = null;
                if (chat.lastMessage) {
                    lastMessageFormatted = {
                        text: chat.lastMessage.text || "",
                        timestamp: chat.lastMessage.timestamp || null,
                        sender: chat.lastMessage.sender ? {
                            _id: chat.lastMessage.sender._id,
                            name: formatUserName(chat.lastMessage.sender),
                            email: chat.lastMessage.sender.email || "",
                            profileImage: chat.lastMessage.sender.profileImage || "",
                        } : null,
                    };
                }

                return {
                    _id: chat._id,
                    groupName: chat.groupName || "Unnamed Chat",
                    groupType: chat.groupType || "individual",
                    otherUser: otherUser ? {
                        _id: otherUser._id,
                        name: formatUserName(otherUser),
                        email: otherUser.email || "",
                        profileImage: otherUser.profileImage || "",
                        role: otherUser.role || "User",
                    } : null,
                    totalMessages,
                    lastMessage: lastMessageFormatted,
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
            .populate("enrolledUsers", "name email profileImage")
            .populate("mentors", "name email profileImage");

        console.log("✅ Chat found:", chatGroup ? "Yes" : "No");

        if (!chatGroup) {
            return res.status(201).json({
                success: true,
                message: "No individual chat found between these users.",
                totalMessages: 0,
                data: [],
            });
        }

        // ✅ Fetch all messages WITHOUT populate first
        const messages = await Message.find({ chatGroupId: chatGroup._id })
            .sort({ createdAt: 1 });

        console.log("✅ Messages count:", messages.length);

        // ✅✅✅ MANUALLY POPULATE SENDER FROM CORRECT COLLECTION ✅✅✅
        const populatedMessages = await Promise.all(
            messages.map(async (message) => {
                let senderDetails = null;
                const senderId = message.sender?.toString();

                if (senderId) {
                    // 🥇 FIRST: Check Admin collection
                    let adminSender = await Admin.findById(senderId).select("name email profileImage image").lean();
                    if (adminSender) {
                        senderDetails = {
                            _id: adminSender._id,
                            name: formatUserName(adminSender),
                            email: adminSender.email || "",
                            profileImage: adminSender.profileImage || adminSender.image || ""
                        };
                    }

                    // 🥈 SECOND: Check Mentor collection (only if not found as Admin)
                    if (!senderDetails) {
                        let mentorSender = await Mentor.findById(senderId).select("name email profileImage image").lean();
                        if (mentorSender) {
                            senderDetails = {
                                _id: mentorSender._id,
                                name: formatUserName(mentorSender),
                                email: mentorSender.email || "",
                                profileImage: mentorSender.profileImage || mentorSender.image || ""
                            };
                        }
                    }

                    // 🥉 THIRD: Check UserRegister collection (only if not found as Admin or Mentor)
                    if (!senderDetails) {
                        let userSender = await UserRegister.findById(senderId).select("name email profileImage image").lean();
                        if (userSender) {
                            senderDetails = {
                                _id: userSender._id,
                                name: formatUserName(userSender),
                                email: userSender.email || "",
                                profileImage: userSender.profileImage || userSender.image || ""
                            };
                        }
                    }
                }

                // ✅ Remove role if it exists
                if (senderDetails && senderDetails.role) {
                    delete senderDetails.role;
                }

                return {
                    _id: message._id,
                    chatGroupId: message.chatGroupId,
                    sender: senderDetails,
                    senderId: senderId, // ✅ Add senderId for frontend comparison
                    text: message.text || "",
                    media: message.media || [],
                    isRead: message.isRead || false,
                    readBy: message.readBy || [],
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                    __v: message.__v
                };
            })
        );

        // ✅ Remove role from chatDetails if exists
        if (chatGroup.enrolledUsers) {
            chatGroup.enrolledUsers = chatGroup.enrolledUsers.map(user => {
                const userObj = user.toObject ? user.toObject() : user;
                delete userObj.role;
                return userObj;
            });
        }

        if (chatGroup.mentors) {
            chatGroup.mentors = chatGroup.mentors.map(mentor => {
                const mentorObj = mentor.toObject ? mentor.toObject() : mentor;
                delete mentorObj.role;
                return mentorObj;
            });
        }

        // ✅ Return messages with total count
        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            totalMessages: populatedMessages.length,
            chatDetails: {
                _id: chatGroup._id,
                groupName: chatGroup.groupName,
                groupType: chatGroup.groupType || "individual",
                enrolledUsers: chatGroup.enrolledUsers,
                mentors: chatGroup.mentors,
                createdAt: chatGroup.createdAt,
                updatedAt: chatGroup.updatedAt,
            },
            data: populatedMessages,
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


/* -------------------------------------------------------------------------- */
/* ✏️ EDIT MESSAGE (Works for both Group and Individual chats)               */
/* -------------------------------------------------------------------------- */
exports.editMessage = async (req, res) => {
    try {
        const io = req.app.get("io");
        const { messageId, userId, newText } = req.body;

        const cleanMessageId = cleanObjectId(messageId);
        const cleanUserId = cleanObjectId(userId);

        if (!cleanMessageId || !cleanUserId)
            return res.status(400).json({ success: false, message: "Invalid messageId or userId" });

        if (!newText || newText.trim() === "")
            return res.status(400).json({ success: false, message: "New message text is required" });

        const message = await Message.findById(cleanMessageId);
        if (!message)
            return res.status(404).json({ success: false, message: "Message not found" });

        // ✅ Only sender can edit their message
        if (message.sender.toString() !== cleanUserId)
            return res.status(403).json({ success: false, message: "You can only edit your own messages" });

        // ✅ Update message text and mark as edited
        message.text = newText.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        const populatedMessage = await Message.findById(cleanMessageId)
            .populate("sender", "name email profileImage role");

        const chatGroupId = message.chatGroupId;

        // ✅ Update last message if this was the last message
        const chatGroup = await ChatGroup.findById(chatGroupId);
        if (chatGroup && chatGroup.lastMessage) {
            const lastMsg = await Message.findOne({ chatGroupId })
                .sort({ createdAt: -1 });

            if (lastMsg && lastMsg._id.toString() === cleanMessageId) {
                await ChatGroup.findByIdAndUpdate(chatGroupId, {
                    lastMessage: {
                        text: newText.trim(),
                        sender: cleanUserId,
                        timestamp: message.createdAt,
                    },
                });
            }
        }

        // ✅ Emit socket event
        if (io) {
            const eventName = chatGroup?.groupType === "individual"
                ? "messageEdited"
                : "messageEdited";

            io.to(chatGroupId.toString()).emit(eventName, {
                messageId: cleanMessageId,
                chatGroupId,
                message: populatedMessage
            });
        }

        return res.status(200).json({
            success: true,
            message: "Message edited successfully",
            data: populatedMessage,
        });
    } catch (error) {
        console.error("❌ Error editing message:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
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
            message: "🗑️ Message deleted successfully",
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
            return res.status(201).json({ success: true, message: "Message not found" });

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

/* -------------------------------------------------------------------------- */
/* 📋 GET ALL GROUP CHATS (No userId filter — Admin / Global Access)          */
/* -------------------------------------------------------------------------- */
exports.getAllGroupChatsAll = async (req, res) => {
    try {
        const chats = await ChatGroup.find({ groupType: "group" })
            .populate("adminId", "name email role")
            .populate("enrolledUsers", "firstName lastName email profileImage")
            .populate("mentors", "firstName lastName email profileImage")
            .populate("lastMessage.sender", "firstName lastName email profileImage")
            .populate("courseId", "courseName")
            .populate("enrollmentId", "batchName batchNumber")
            .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

        if (!chats.length) {
            return res.status(200).json({
                success: true,
                message: "No group chats found.",
                totalChats: 0,
                data: [],
            });
        }

        const chatsWithDetails = await Promise.all(
            chats.map(async (chat) => {
                const totalMessages = await Message.countDocuments({ chatGroupId: chat._id });
                return {
                    _id: chat._id,
                    groupName: chat.groupName,
                    admin: chat.adminId,
                    groupType: chat.groupType,
                    totalMessages,
                    lastMessage: chat.lastMessage || null,
                    course: chat.courseId || null,
                    enrollment: chat.enrollmentId || null,
                    membersCount:
                        (chat.enrolledUsers?.length || 0) +
                        (chat.mentors?.length || 0) +
                        (chat.adminId ? 1 : 0),
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "All group chats fetched successfully",
            totalChats: chatsWithDetails.length,
            data: chatsWithDetails,
        });
    } catch (error) {
        console.error("❌ Error fetching all group chats:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching group chats",
            error: error.message,
        });
    }
};


/* -------------------------------------------------------------------------- */
/* 📋 GET ALL INDIVIDUAL CHATS (No userId filter — Admin / Global Access)     */
/* -------------------------------------------------------------------------- */
exports.getAllIndividualChatsAll = async (req, res) => {
    try {
        const chats = await ChatGroup.find({
            $or: [
                { groupType: "individual" },
                {
                    groupType: { $exists: false },
                    enrolledUsers: { $size: 1 },
                    mentors: { $size: 1 }
                }
            ]
        })
            .populate("enrolledUsers", "name email profileImage role")
            .populate("mentors", "name email profileImage role")
            .populate("lastMessage.sender", "name email profileImage")
            .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

        if (!chats.length) {
            return res.status(200).json({
                success: true,
                message: "No individual chats found.",
                totalChats: 0,
                data: [],
            });
        }

        const chatsWithDetails = await Promise.all(
            chats.map(async (chat) => {
                const totalMessages = await Message.countDocuments({ chatGroupId: chat._id });

                return {
                    _id: chat._id,
                    groupName: chat.groupName,
                    groupType: chat.groupType || "individual",
                    users: chat.enrolledUsers,
                    mentors: chat.mentors,
                    totalMessages,
                    lastMessage: chat.lastMessage || null,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "All individual chats fetched successfully",
            totalChats: chatsWithDetails.length,
            data: chatsWithDetails,
        });
    } catch (error) {
        console.error("❌ Error fetching all individual chats:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching individual chats",
            error: error.message,
        });
    }
};
