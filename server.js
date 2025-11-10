const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require("path");

// Import routes
const aboutRoutes = require("./routes/AboutUSRoute");
const enquiryRoutes = require('./routes/EnquiryRoutes');
const contentRoutes = require("./routes/contentRoutes");
const mentorRoutes = require("./routes/ourMentorRoute");
const faqRoutes = require("./routes/faqRoutes");
const courseRoutes = require("./routes/courseRoutes");
const user = require('./routes/registerUserRoute');
const details = require('./routes/detailsRoute');  
const interviewRoutes = require("./routes/interviewRoute");
const courseModuleRoutes = require('./routes/courseModuleRoutes');
const HomeScreenRoute = require('./routes/homeScreenRoutes');
const calendarRoutes = require("./routes/calendarRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const adminRoutes = require("./routes/AdminRoute");
const chat = require("./routes/chatRoute");

// Import utils
const cleanupLegacyIndexes = require('./utils/invoiceTemplate');

// Initialize environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  },
  transports: ['websocket', 'polling']
});

// ✅ CRITICAL: Configure CORS before other middleware
app.use(cors({
  origin: "*",
  credentials: true
}));

// ✅ Parse JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ REMOVED express-fileupload - it conflicts with multer
// Multer will handle file uploads in specific routes

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch((err) => {
    console.log('❌ Mongo Connection Error:', err);
  });

// MongoDB Event Handlers
mongoose.connection.on('connected', async () => {
  console.log('✅ MongoDB connected successfully');
  try {
    await cleanupLegacyIndexes();
  } catch (error) {
    console.error('❌ Error during legacy index cleanup:', error);
  }
});

mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Attach Socket.IO to app
app.set('io', io);

// Serve static files from multiple directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/invoices', express.static(path.join(__dirname, 'uploads/invoices')));

// ✅ Request logging middleware (helps with debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ Routes
app.use("/api", aboutRoutes);
app.use('/api', enquiryRoutes);
app.use("/api", contentRoutes);
app.use("/api/our-mentor", mentorRoutes);
app.use("/api", faqRoutes);
app.use("/api", courseRoutes);
app.use('/api', user);
app.use('/api', details);
app.use("/api", interviewRoutes);
app.use("/api", courseModuleRoutes);
app.use('/api', HomeScreenRoute);
app.use("/api", calendarRoutes);
app.use("/api", invoiceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", chat); // Chat routes - multer is configured in chatRoute.js

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    message: `The requested route ${req.originalUrl} does not exist` 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  // Handle multer errors specifically
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: err.message,
      code: err.code
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' 
  });
});

// ===== SOCKET.IO IMPLEMENTATION =====
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  // User joins the app
  socket.on('user-connected', ({ userId, userType }) => {
    activeUsers.set(userId, { socketId: socket.id, userType });
    console.log(`✅ User ${userId} (${userType}) connected`);
  });

  // Join a specific chat group room
  socket.on('join-group', ({ groupId, userId }) => {
    socket.join(groupId);
    console.log(`✅ User ${userId} joined group ${groupId}`);
    
    socket.to(groupId).emit('user-joined-group', {
      userId,
      groupId,
      timestamp: new Date()
    });
  });

  // Leave a chat group room
  socket.on('leave-group', ({ groupId, userId }) => {
    socket.leave(groupId);
    console.log(`⚠️ User ${userId} left group ${groupId}`);
    
    socket.to(groupId).emit('user-left-group', {
      userId,
      groupId,
      timestamp: new Date()
    });
  });

  // Send message (real-time broadcast)
  socket.on('send-message', ({ groupId, message, sender }) => {
    console.log(`📨 Message sent to group ${groupId} by ${sender}`);
    
    socket.to(groupId).emit('receive-message', {
      groupId,
      message,
      sender,
      timestamp: new Date()
    });
  });

  // Typing indicator
  socket.on('typing', ({ groupId, userId, userName }) => {
    socket.to(groupId).emit('user-typing', {
      groupId,
      userId,
      userName,
      timestamp: new Date()
    });
  });

  // Stop typing indicator
  socket.on('stop-typing', ({ groupId, userId }) => {
    socket.to(groupId).emit('user-stop-typing', {
      groupId,
      userId,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
    
    for (const [userId, userData] of activeUsers.entries()) {
      if (userData.socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`⚠️ User ${userId} removed from active users`);
        break;
      }
    }
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('⚠️ Shutting down gracefully...');
  io.close();
  await mongoose.connection.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});