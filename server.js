const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const aboutRoutes = require("./routes/AboutUSRoute");
const enquiryRoutes = require('./routes/EnquiryRoutes');
const contentRoutes = require("./routes/contentRoutes");
const mentorRoutes = require("./routes/ourMentorRoute");
const faqRoutes = require("./routes/faqRoutes");
const courseRoutes = require("./routes/courseRoutes");
const user = require('./routes/registerUserRoute');
const details =require('./routes/detailsRoute');  
const interviewRoutes = require("./routes/interviewRoute");
const courseModuleRoutes = require('./routes/courseModuleRoutes');
const HomeScreenRoute =require('./routes/homeScreenRoutes')
const calendarRoutes = require("./routes/calendarRoutes");





const path = require("path");
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: "*" }
});
app.use('/api/course-module/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));


// Attach Socket.IO to app
app.set('io', io);

app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected')
  })
  .catch((err) => {
    console.log('Mongo Error:', err)}
);



// ✅ Routes
app.use("/api", aboutRoutes);
app.use('/api', enquiryRoutes);
app.use("/api", contentRoutes);
app.use("/api/our-mentor", mentorRoutes);
app.use("/api", faqRoutes);
app.use("/api", courseRoutes);
app.use('/api', user);
app.use('/api',details);
app.use("/api", interviewRoutes);
app.use("/api", courseModuleRoutes);
app.use('/api',HomeScreenRoute);
app.use("/api", calendarRoutes);







// Socket.IO connection
io.on('connection', (socket) => {
  console.log(' Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log(' Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`🚀 server running on port ${PORT}`)
});
