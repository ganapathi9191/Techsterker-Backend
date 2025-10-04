const mongoose = require('mongoose');

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  batchNumber: { type: String, },
  batchName: { type: String, },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", },
  startDate: { type: Date, },
  timings: { type: String,  },
  duration: { type: String, },
  category: { type: String, },
  assignedMentors: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Mentor"
  }],
  enrolledUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister" }
  ],
   status: { 
    type: String, 
    enum: ['Upcoming', 'Ongoing', 'Completed'], 
    default: 'Upcoming' // Default is "Upcoming"
  },
}, { timestamps: true });

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  enrolledId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegister', required: true },
  certificateFile: { type: String, required: true }, // Cloudinary URL
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  }
}, { timestamps: true });



const OurCertificateSchema = new mongoose.Schema(
  {
    certificateImage: { type: String, required: true }, // Cloudinary URL
    description: { type: String, required: true },
  },
  { timestamps: true }
);


const CommunitySchema = new mongoose.Schema(
  {
    slack: { type: String, required: true },
    discord: { type: String, required: true },
    whatsapp: { type: String, required: true }
  },
  { timestamps: true }
);


// Make sure you're exporting both models correctly
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const OurCertificate = mongoose.model("OurCertificate", OurCertificateSchema);
const Community = mongoose.model("Community", CommunitySchema);




// Export both models
module.exports = {
  Enrollment,
  Certificate,
  OurCertificate,
  Community
};