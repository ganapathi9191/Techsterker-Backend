const Interview = require('../models/interviewModel');  // adjust path
const { Enrollment } = require('../models/enrollment');
const User = require('../models/registerUser');

exports.createInterview = async (req, res) => {
  try {
    const { enrolledId, companyName, role, experience, location } = req.body;

    // Find the enrollment and populate enrolled users
    const enrollment = await Enrollment.findById(enrolledId).populate('enrolledUsers');
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (!enrollment.enrolledUsers || enrollment.enrolledUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'No users enrolled in this batch' });
    }

    // Create interview for each enrolled user
    const interviewDocs = [];
    for (const user of enrollment.enrolledUsers) {
      const interview = await Interview.create({
        enrolledId,
        companyName,
        role,
        experience,
        location,
        user: user._id
      });

      // Push interview ref into user model
      user.interviews.push(interview._id);
      await user.save();

      interviewDocs.push(interview);
    }

    res.status(201).json({
      success: true,
      message: 'Interview(s) created successfully',
      data: interviewDocs
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// GET ALL INTERVIEWS
exports.getAllInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('enrolledId', 'batchName batchNumber');
    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET INTERVIEW BY ID
exports.getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('enrolledId', 'batchName batchNumber');
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    res.status(200).json({ success: true, data: interview });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET INTERVIEWS BY ENROLLED ID
exports.getInterviewsByEnrolledId = async (req, res) => {
  try {
    const interviews = await Interview.find({ enrolledId: req.params.enrolledId })
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('enrolledId', 'batchName batchNumber');
    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET INTERVIEWS BY USER ID
exports.getInterviewsByUserId = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.params.userId })
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('enrolledId', 'batchName batchNumber');
    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE INTERVIEW BY ID
exports.updateInterviewById = async (req, res) => {
  try {
    const { companyName, role, experience, location } = req.body;
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { companyName, role, experience, location },
      { new: true }
    );
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    res.status(200).json({ success: true, message: 'Interview updated', data: interview });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE INTERVIEW BY ID
exports.deleteInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Remove interview ref from user
    const user = await User.findById(interview.user);
    if (user) {
      user.interviews.pull(interview._id);
      await user.save();
    }

    await interview.deleteOne();
    res.status(200).json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};