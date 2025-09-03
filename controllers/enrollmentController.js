const { Enrollment, Certificate } = require('../models/enrollment');
const { uploadImage, uploadToCloudinary } = require('../config/cloudinary1');
const mongoose = require('mongoose');
const userRegister = require("../models/registerUser"); 
const {Course} = require("../models/coursesModel");
const { OurMentor, MentorExperience ,Mentor} = require("../models/ourMentors");


// ➕ Create new enrollment
exports.createEnrollment = async (req, res) => {
  try {
    const { batchNumber, batchName, courseId, startDate, duration, category } = req.body;

    if (!batchNumber || !batchName || !courseId || !startDate || !timings || !duration || !category) {
      return res.status(400).json({
        success: false,
        message: "batchNumber, batchName, courseId, startDate, timings, duration, and category are required"
      });
    }

    // Validate courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const enrollment = new Enrollment({
      batchNumber,
      batchName,
      courseId,
      startDate,
      duration,
      category
    });

    const savedEnrollment = await enrollment.save();
    const populatedEnrollment = await Enrollment.findById(savedEnrollment._id).populate("courseId");

    return res.status(201).json({
      success: true,
      message: "Enrollment created successfully",
      data: populatedEnrollment
    });
  } catch (error) {
    console.error("Error creating enrollment:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📖 Get all enrollments
exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find().populate("courseId");
    return res.status(200).json({
      success: true,
      message: "All enrollments fetched successfully",
      data: enrollments
    });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// 🔍 Get enrollment by ID
exports.getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id).populate("courseId");
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment fetched successfully",
      data: enrollment
    });
  } catch (error) {
    console.error("Error fetching enrollment by ID:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




// ✏️ Update enrollment
exports.updateEnrolledByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchNumber, batchName, courseId, startDate, duration, category } = req.body;

    const updateData = {};
    if (batchNumber) updateData.batchNumber = batchNumber;
    if (batchName) updateData.batchName = batchName;
    if (startDate) updateData.startDate = startDate;
  
    if (duration) updateData.duration = duration;
    if (category) updateData.category = category;

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
      updateData.courseId = courseId;
    }

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("courseId");

    if (!updatedEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment updated successfully",
      data: updatedEnrollment
    });
  } catch (error) {
    console.error("Error updating enrollment:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// 🗑️ Delete enrollment by ID
exports.deleteEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEnrollment = await Enrollment.findByIdAndDelete(id);
    if (!deletedEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// CREATE CERTIFICATES for all users in an enrollment
exports.createCertificate = async (req, res) => {
  try {
    const { enrolledId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Certificate file required" });
    }

    // Upload directly to Cloudinary using stream upload
    const certificateUrl = await uploadToCloudinary(
      req.file.buffer,
      "certificates",
      req.file.originalname
    );

    // Get enrollment and users (users come from enrolledUsers ref)
    const enrollment = await Enrollment.findById(enrolledId).populate("enrolledUsers");
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }
    if (!enrollment.enrolledUsers || !enrollment.enrolledUsers.length) {
      return res.status(400).json({ success: false, message: "No users enrolled" });
    }

    const createdCertificates = [];
    for (const user of enrollment.enrolledUsers) {
      const certificate = await Certificate.create({
        enrolledId,
        user: user._id,
        certificateFile: certificateUrl,
        status: "Pending" // always default Pending
      });

      // Push the certificate reference to the user
      user.certificates.push(certificate._id);
      await user.save();

      createdCertificates.push(certificate);
    }

    res.status(201).json({
      success: true,
      message: "Certificates created successfully",
      data: createdCertificates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
// GET ALL CERTIFICATES with course name and user details
exports.getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('user', 'firstName lastName email phoneNumber')
      .populate({
        path: 'enrolledId',
        populate: { path: 'courseId', select: 'courseName' }
      });

    res.status(200).json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET CERTIFICATES BY USER ID
exports.getCertificatesByUserId = async (req, res) => {
  try {
    const certificates = await Certificate.find({ user: req.params.userId })
      .populate('user', 'firstName lastName email phoneNumber')
      .populate({
        path: 'enrolledId',
        populate: { path: 'courseId', select: 'courseName' }
      });

    res.status(200).json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET CERTIFICATES BY ENROLLED ID
exports.getCertificatesByEnrolledId = async (req, res) => {
  try {
    const certificates = await Certificate.find({ enrolledId: req.params.enrolledId })
      .populate('user', 'firstName lastName email phoneNumber')
      .populate({
        path: 'enrolledId',
        populate: { path: 'courseId', select: 'courseName' }
      });

    res.status(200).json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE CERTIFICATE BY ID
exports.updateCertificateById = async (req, res) => {
  try {
    const { enrolledId, certificateFile, status } = req.body;
    const updateData = {};

    if (enrolledId) updateData.enrolledId = enrolledId;
    if (certificateFile) updateData.certificateFile = certificateFile;
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) updateData.status = status;

    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });

    res.status(200).json({ success: true, message: 'Certificate updated successfully', data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE CERTIFICATE STATUS BY USER ID
exports.updateCertificateStatusByUserId = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const certificates = await Certificate.updateMany(
      { user: req.params.userId },
      { $set: { status } }
    );

    res.status(200).json({ success: true, message: 'Status updated for all certificates of user', modifiedCount: certificates.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE CERTIFICATE STATUS BY ENROLLED ID
exports.updateCertificateStatusByEnrolledId = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const certificates = await Certificate.updateMany(
      { enrolledId: req.params.enrolledId },
      { $set: { status } }
    );

    res.status(200).json({ success: true, message: 'Status updated for all certificates of enrollment', modifiedCount: certificates.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE CERTIFICATE STATUS
exports.updateCertificateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated', data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE CERTIFICATE
exports.deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });

    const user = await User.findById(certificate.user);
    if (user) {
      user.certificates.pull(certificate._id);
      await user.save();
    }

    await certificate.deleteOne();
    res.status(200).json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};




// 👤 Add User to Enrollment
exports.addEnrollmentToUser = async (req, res) => {
  try {
    const { enrollmentId, userId } = req.body;

    // 1️⃣ Validate user
    const user = await userRegister.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2️⃣ Validate enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    // 3️⃣ Add user to enrollment if not already enrolled
    const alreadyEnrolledInEnrollment = enrollment.enrolledUsers.some(
      (u) => u.toString() === userId
    );
    if (!alreadyEnrolledInEnrollment) {
      enrollment.enrolledUsers.push(userId);
      await enrollment.save();
    }

    // 4️⃣ Add enrollment to user's enrolledCourses if not already there
    const alreadyEnrolledInUser = user.enrolledCourses.some(
      (e) => e.toString() === enrollmentId
    );
    if (!alreadyEnrolledInUser) {
      user.enrolledCourses.push(enrollmentId);
      await user.save();
    }

    // 5️⃣ Populate enrolled users before sending response
    const updatedEnrollment = await Enrollment.findById(enrollmentId)
      .populate('enrolledUsers', 'fullName email');

    res.status(200).json({
      success: true,
      message: alreadyEnrolledInEnrollment
        ? "User already enrolled in this batch"
        : "User successfully added to enrollment",
      data: {
        _id: updatedEnrollment._id,
        batchNumber: updatedEnrollment.batchNumber,
        batchName: updatedEnrollment.batchName,
        enrolledUsers: updatedEnrollment.enrolledUsers,
        userCount: updatedEnrollment.enrolledUsers.length
      }
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// 👤 Get all enrollments for a user
exports.getEnrollmentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user
    const user = await userRegister.findById(userId).populate({
      path: 'enrolledCourses',
      select: 'batchNumber batchName startDate timings duration type categorie courseId',
      populate: {
        path: 'courseId', // populate full course details
        select: '-__v -createdAt -updatedAt' // select all course fields except unnecessary ones
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.firstName + " " + user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber
      },
      enrolledCourses: user.enrolledCourses
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.addMentorToEnrollment = async (req, res) => {
  try {
    const { enrollmentId, mentorId, subjects } = req.body; // <-- subjects array added

    // Validate mentor
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) return res.status(404).json({ success: false, message: "Mentor not found" });

    // Validate enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });

    // Initialize arrays if they don't exist
    if (!enrollment.assignedMentors) enrollment.assignedMentors = [];
    if (!mentor.enrolledBatches) mentor.enrolledBatches = [];
    if (!mentor.assignedCourses) mentor.assignedCourses = [];
    if (!mentor.subjects) mentor.subjects = []; // <-- make sure it's initialized

    // Add mentor to enrollment if not already assigned
    if (!enrollment.assignedMentors.includes(mentorId)) {
      enrollment.assignedMentors.push(mentorId);
      await enrollment.save();
    }

    // Add enrollment to mentor's enrolledBatches if not already there
    if (!mentor.enrolledBatches.includes(enrollmentId)) {
      mentor.enrolledBatches.push(enrollmentId);
    }

    // Add enrollment to mentor's assignedCourses if not already there
    if (!mentor.assignedCourses.includes(enrollmentId)) {
      mentor.assignedCourses.push(enrollmentId);
    }

    // Add subjects to mentor (avoid duplicates)
    if (Array.isArray(subjects) && subjects.length > 0) {
      subjects.forEach(sub => {
        if (!mentor.subjects.includes(sub)) {
          mentor.subjects.push(sub);
        }
      });
    }

    await mentor.save();

    // Populate mentor and enrollment info for response
    const updatedMentor = await Mentor.findById(mentorId)
      .populate('enrolledBatches', 'batchNumber batchName startDate timings duration category')
      .populate('assignedCourses', 'batchNumber batchName startDate timings duration category');

    const updatedEnrollment = await Enrollment.findById(enrollmentId)
      .populate('assignedMentors', 'firstName lastName email phoneNumber expertise subjects');

    res.status(200).json({
      success: true,
      message: "Mentor added to enrollment successfully",
      data: {
        mentor: {
          _id: updatedMentor._id,
          fullName: `${updatedMentor.firstName} ${updatedMentor.lastName}`,
          email: updatedMentor.email,
          phoneNumber: updatedMentor.phoneNumber,
          expertise: updatedMentor.expertise,
          subjects: updatedMentor.subjects, // <-- include subjects in response
          enrolledBatches: updatedMentor.enrolledBatches,
          assignedCourses: updatedMentor.assignedCourses
        },
        enrollment: {
          _id: updatedEnrollment._id,
          batchNumber: updatedEnrollment.batchNumber,
          batchName: updatedEnrollment.batchName,
          assignedMentors: updatedEnrollment.assignedMentors
        }
      }
    });

  } catch (error) {
    console.error("Error adding mentor:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// Remove mentor from enrollment
exports.removeMentorFromEnrollment = async (req, res) => {
   try {
    const { enrollmentId, mentorId } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId);
    const mentor = await Mentor.findById(mentorId);

    if (!enrollment || !mentor) {
      return res.status(404).json({ success: false, message: "Enrollment or Mentor not found" });
    }

    enrollment.assignedMentors = enrollment.assignedMentors.filter(
      id => id.toString() !== mentorId
    );

    mentor.enrolledBatches = mentor.enrolledBatches.filter(
      id => id.toString() !== enrollmentId
    );
    mentor.assignedCourses = mentor.assignedCourses.filter(
      id => id.toString() !== enrollmentId
    );

    await enrollment.save();
    await mentor.save();

    res.status(200).json({
      success: true,
      message: "Mentor removed from enrollment successfully",
      mentorSubjects: mentor.subjects || [] // <-- returning updated subjects
    });

  } catch (error) {
    console.error("Error removing mentor:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
exports.getEnrollmentsByMentorId = async (req, res) => {
  try {
    const { mentorId } = req.params;

    const mentor = await Mentor.findById(mentorId)
      .populate({
        path: 'enrolledBatches',
        select: 'batchNumber batchName startDate timings duration category courseId enrolledUsers',
        populate: [
          { path: 'courseId', select: 'title description price duration level' },
          { path: 'enrolledUsers', model: 'userRegister', select: 'firstName lastName email phoneNumber' }
        ]
      })
      .populate({
        path: 'assignedCourses',
        select: 'batchNumber batchName startDate timings duration category courseId enrolledUsers',
        populate: [
          { path: 'courseId', select: 'title description price duration level' },
          { path: 'enrolledUsers', model: 'userRegister', select: 'firstName lastName email phoneNumber' }
        ]
      });

    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }

    res.status(200).json({
      success: true,
      mentor: {
        _id: mentor._id,
        fullName: `${mentor.firstName} ${mentor.lastName}`,
        email: mentor.email,
        phoneNumber: mentor.phoneNumber,
        expertise: mentor.expertise,
        subjects: mentor.subjects || []  // <-- added subjects
      },
      enrolledBatches: mentor.enrolledBatches,
      assignedCourses: mentor.assignedCourses,
      stats: {
        totalBatches: mentor.enrolledBatches.length,
        totalAssignedCourses: mentor.assignedCourses.length,
        totalStudents: mentor.assignedCourses.reduce((total, course) => 
          total + (course.enrolledUsers ? course.enrolledUsers.length : 0), 0)
      }
    });

  } catch (error) {
    console.error("Error fetching mentor's courses:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all mentors for an enrollment
exports.getEnrollmentMentors = async (req, res) => {
try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('assignedMentors', 'firstName lastName email phoneNumber expertise subjects'); // <-- include subjects

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        enrollmentId: enrollment._id,
        batchName: enrollment.batchName,
        assignedMentors: enrollment.assignedMentors
      }
    });

  } catch (error) {
    console.error("Error fetching enrollment mentors:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all mentors with their batch information
exports.getAllMentorsWithBatches = async (req, res) => {
  try {
    const mentors = await Mentor.find()
      .select('-password')
      .populate({
        path: 'enrolledBatches',
        select: 'batchNumber batchName startDate category',
        populate: { path: 'courseId', select: 'title duration' }
      })
      .populate({
        path: 'assignedCourses',
        select: 'batchNumber batchName',
        populate: {
          path: 'enrolledUsers',
          model: 'userRegister',
          select: 'firstName lastName',
          options: { limit: 5 }
        }
      });

    res.status(200).json({
      success: true,
      data: mentors.map(m => ({
        ...m.toObject(),
        subjects: m.subjects || [] // <-- added subjects in output
      })),
      totalMentors: mentors.length
    });

  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
// Get specific mentor with detailed batch info
exports.getMentorWithDetailedBatches = async (req, res) => {
  try {
    const { mentorId } = req.params;

    const mentor = await Mentor.findById(mentorId)
      .select('-password')
      .populate({
        path: 'enrolledBatches',
        select: 'batchNumber batchName startDate timings duration category courseId enrolledUsers',
        populate: [
          { path: 'courseId', select: 'title description price duration level' },
          { path: 'enrolledUsers', model: 'userRegister', select: 'firstName lastName email phoneNumber' }
        ]
      });

    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }

    res.status(200).json({
      success: true,
      mentor: {
        _id: mentor._id,
        fullName: `${mentor.firstName} ${mentor.lastName}`,
        email: mentor.email,
        phoneNumber: mentor.phoneNumber,
        expertise: mentor.expertise,
        subjects: mentor.subjects || [], // <-- include subjects
        createdAt: mentor.createdAt,
        updatedAt: mentor.updatedAt
      },
      teachingSchedule: mentor.enrolledBatches.map(batch => ({
        batchNumber: batch.batchNumber,
        batchName: batch.batchName,
        startDate: batch.startDate,
        timings: batch.timings,
        duration: batch.duration,
        studentsCount: batch.enrolledUsers ? batch.enrolledUsers.length : 0,
        category: batch.category
      })),
      performanceMetrics: {
        totalBatches: mentor.enrolledBatches.length,
        totalStudents: mentor.enrolledBatches.reduce((total, batch) =>
          total + (batch.enrolledUsers ? batch.enrolledUsers.length : 0), 0)
      }
    });

  } catch (error) {
    console.error("Error fetching mentor details:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};