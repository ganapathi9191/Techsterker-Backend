const mongoose = require('mongoose');

/* ========================================================================== */
/* 📦 CHAT GROUP SCHEMA (supports both group + individual chats)              */
/* ========================================================================== */

const chatGroupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ Admin is optional for individual chats
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: false, // changed from true
      default: null,   // added default
    },

    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: null,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },

    // ✅ Enrolled users (students)
    enrolledUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserRegister',
      },
    ],

    // ✅ Mentors — can belong to Mentor, UserRegister, or Admin dynamically
    mentors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'mentorModel',
      },
    ],

    // Dynamic model reference for mentor
    mentorModel: {
      type: String,
      enum: ['Mentor', 'UserRegister', 'Admin'], // added Admin
      default: 'Mentor',
    },

    // ✅ Chat type
    groupType: {
      type: String,
      enum: ['group', 'individual'],
      default: 'group',
    },

    // ✅ Last message cache
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserRegister',
      },
      timestamp: Date,
    },

    status: {
      type: String,
      enum: ['Active', 'Archived', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

/* ========================================================================== */
/* 🧠 MESSAGE SCHEMA                                                          */
/* ========================================================================== */
const messageSchema = new mongoose.Schema(
  {
    chatGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserRegister',
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ['image', 'video', 'pdf', 'document'],
        },
        fileName: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegister' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/* ========================================================================== */
/* 💬 USER CHAT PREFERENCES                                                   */
/* ========================================================================== */
const userChatPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserRegister',
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserRegister',
      required: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: null,
    },
    chatGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
      required: true,
    },
    isPinned: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ========================================================================== */
/* 🔔 NOTIFICATION SCHEMA                                                     */
/* ========================================================================== */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserRegister',
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'new_message',
        'group_created',
        'user_added',
        'user_removed',
        'mention',
      ],
      required: true,
    },
    isRead: { type: Boolean, default: false },
    relatedGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
    },
    relatedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

/* ========================================================================== */
/* ⚙️ INDEXES                                                                 */
/* ========================================================================== */
chatGroupSchema.index({ enrollmentId: 1, groupName: 1 });
chatGroupSchema.index({ courseId: 1, mentors: 1, groupName: 1 });
chatGroupSchema.index({ enrolledUsers: 1, status: 1 });
chatGroupSchema.index({ mentors: 1, status: 1 });
messageSchema.index({ chatGroupId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
userChatPreferenceSchema.index(
  { userId: 1, mentorId: 1, enrollmentId: 1 },
  { unique: true }
);
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

/* ========================================================================== */
/* 🏁 MODEL EXPORTS                                                           */
/* ========================================================================== */
const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);
const Message = mongoose.model('Message', messageSchema);
const UserChatPreference = mongoose.model(
  'UserChatPreference',
  userChatPreferenceSchema
);
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { ChatGroup, Message, UserChatPreference, Notification };
