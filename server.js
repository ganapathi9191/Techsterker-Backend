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
const invoiceRoutes = require("./routes/invoiceRoutes"); // Fixed variable name
const adminRoutes = require("./routes/AdminRoute"); // Fixed variable name

// Import utils
const cleanupLegacyIndexes = require('./utils/invoiceTemplate');

// Initialize environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving
//app.use('/api/course-module/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch((err) => {
    console.log('Mongo Connection Error:', err);
  });

// MongoDB Event Handlers
mongoose.connection.on('connected', async () => {
  console.log('MongoDB connected successfully');
  try {
    await cleanupLegacyIndexes();
  } catch (error) {
    console.error('Error during legacy index cleanup:', error);
  }
});

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Attach Socket.IO to app
app.set('io', io);


// Serve static files from multiple directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/invoices', express.static(path.join(__dirname, 'uploads/invoices')));




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
app.use("/api", invoiceRoutes); // Use the correct variable name
app.use("/api/admin", adminRoutes); // Use the correct variable name

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

// 404 handler - FIXED: Remove the '*' path parameter
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    message: `The requested route ${req.originalUrl} does not exist` 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' 
  });
});



// Serve static files (like PDFs) from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});