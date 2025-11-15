// ==========================
// ✅ IMPORTS
// ==========================
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// ==========================
// ✅ ROUTE IMPORTS
// ==========================
// Make sure these filenames EXACTLY match your /routes folder file names on disk
const aboutRoutes = require('./routes/AboutUSRoute');
const enquiryRoutes = require('./routes/EnquiryRoutes');
const contentRoutes = require('./routes/contentRoutes');
const mentorRoutes = require('./routes/ourMentorRoute');
const faqRoutes = require('./routes/faqRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/registerUserRoute');
const detailsRoutes = require('./routes/detailsRoute');
const interviewRoutes = require('./routes/interviewRoute');
const courseModuleRoutes = require('./routes/courseModuleRoutes');
const homeScreenRoutes = require('./routes/homeScreenRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const adminRoutes = require('./routes/AdminRoute');

// ✅ FIXED: Ensure correct case and filename for chat routes
// Change this path if your file name differs (for example ChatRoute.js or chatRoutes.js)
const chatRoutes = require('./routes/chatRoutes'); 

// ==========================
// ✅ UTILITIES
// ==========================
const cleanupLegacyIndexes = require('./utils/invoiceTemplate');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ==========================
// ✅ SOCKET.IO CONFIG
// ==========================
const io = require('socket.io')(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  transports: ['websocket', 'polling']
});

// ==========================
// ✅ MIDDLEWARES
// ==========================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.set('io', io); // Attach socket instance

// Serve static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/invoices', express.static(path.join(__dirname, 'uploads/invoices')));

// ✅ Log all incoming requests (for Render debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================
// ✅ ROOT ROUTE (MUST BE BEFORE /api ROUTES)
// ==========================
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HiCap Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses',
      users: '/api/users',
      mentors: '/api/our-mentor',
      admin: '/api/admin',
      chat: '/api/group-chats'
    },
    documentation: 'All API endpoints are prefixed with /api',
    timestamp: new Date().toISOString()
  });
});

// ==========================
// ✅ HEALTH CHECK
// ==========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ==========================
// ✅ REGISTER ROUTES
// ==========================
app.use('/api', aboutRoutes);
app.use('/api', enquiryRoutes);
app.use('/api', contentRoutes);
app.use('/api/our-mentor', mentorRoutes);
app.use('/api', faqRoutes);
app.use('/api', courseRoutes);
app.use('/api', userRoutes);
app.use('/api', detailsRoutes);
app.use('/api', interviewRoutes);
app.use('/api', courseModuleRoutes);
app.use('/api', homeScreenRoutes);
app.use('/api', calendarRoutes);
app.use('/api', invoiceRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Ensure Chat Routes loaded before 404
app.use('/api', chatRoutes);
console.log('✅ Chat routes registered successfully');

// ✅ Safe route logger (won't crash if router not ready)
setTimeout(() => {
  if (app._router && app._router.stack) {
    console.log('🛣️ Loaded routes:');
    app._router.stack
      .filter(r => r.route)
      .forEach(r => {
        console.log(`➡️ [${Object.keys(r.route.methods).join(', ')}] ${r.route.path}`);
      });
  } else {
    console.warn('⚠️ No routes registered yet when logging attempted.');
  }
}, 3000);

// ==========================
// ❌ 404 HANDLER
// ==========================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// ==========================
// ⚠️ GLOBAL ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

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
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong'
  });
});

// ==========================
// ✅ SOCKET.IO EVENTS
// ==========================
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('user-connected', ({ userId, userType }) => {
    activeUsers.set(userId, { socketId: socket.id, userType });
    console.log(`✅ User ${userId} (${userType}) connected`);
  });

  socket.on('join-group', ({ groupId, userId }) => {
    socket.join(groupId);
    console.log(`✅ User ${userId} joined group ${groupId}`);
    socket.to(groupId).emit('user-joined-group', { userId, groupId, timestamp: new Date() });
  });

  socket.on('leave-group', ({ groupId, userId }) => {
    socket.leave(groupId);
    console.log(`⚠️ User ${userId} left group ${groupId}`);
    socket.to(groupId).emit('user-left-group', { userId, groupId, timestamp: new Date() });
  });

  socket.on('send-message', ({ groupId, message, sender }) => {
    console.log(`📨 Message sent to group ${groupId} by ${sender}`);
    socket.to(groupId).emit('receive-message', { groupId, message, sender, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
    for (const [userId, data] of activeUsers.entries()) {
      if (data.socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`⚠️ User ${userId} removed from active users`);
        break;
      }
    }
  });

  socket.on('error', (error) => console.error('❌ Socket error:', error));
});

// ==========================
// ✅ MONGODB CONNECTION
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ Mongo Connection Error:', err));

mongoose.connection.on('connected', async () => {
  console.log('✅ MongoDB connected successfully');
  try {
    await cleanupLegacyIndexes();
  } catch (error) {
    console.error('❌ Error during legacy index cleanup:', error);
  }
});
mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));

// ==========================
// ✅ START SERVER
// ==========================
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 Root: http://31.97.206.144:${PORT}/`);
  console.log(`🔗 Health: http://31.97.206.144:${PORT}/api/health`);
});