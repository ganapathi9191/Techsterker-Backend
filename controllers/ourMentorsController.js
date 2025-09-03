const { OurMentor, MentorExperience ,Mentor} = require("../models/ourMentors");
const { uploadImage } = require("../config/cloudinary");
const bcrypt = require('bcryptjs');
const generateToken = require('../config/token');
const Enrollment = require('../models/enrollment');
const mongoose = require('mongoose'); 


// REGISTER MENTOR
exports.registerMentor = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, confirmpassword, expertise, assignedCourses } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmpassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingMentor = await Mentor.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingMentor) {
      return res.status(400).json({ success: false, message: 'Email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMentor = await Mentor.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      expertise,
      assignedCourses
    });

    res.status(201).json({
      success: true,
      message: 'Mentor registered successfully',
      data: {
        _id: newMentor._id,
        name: `${newMentor.firstName} ${newMentor.lastName}`,
        email: newMentor.email,
        phoneNumber: newMentor.phoneNumber,
        token: generateToken(newMentor._id),
        assignedCourses: newMentor.assignedCourses
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// LOGIN MENTOR
exports.loginMentor = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const mentor = await Mentor.findOne({ phoneNumber });
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    const isMatch = await bcrypt.compare(password, mentor.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: mentor._id,
        name: `${mentor.firstName} ${mentor.lastName}`,
        email: mentor.email,
        phoneNumber: mentor.phoneNumber,
        token: generateToken(mentor._id),
        assignedCourses: mentor.assignedCourses
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET ALL MENTORS
exports.getAll = async (req, res) => {
  try {
    // Populate assignedCourses
    const mentors = await Mentor.find()
      .select('-password')
      .populate({
        path: 'assignedCourses', // populate assignedCourses
        populate: {
          path: 'enrolledUsers', // populate enrolledUsers inside each course
          model: 'userRegister', // reference to user model
          select: 'firstName lastName email phoneNumber' // only required fields
        }
      });

    res.status(200).json({ success: true, data: mentors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET MENTOR BY ID
exports.getById = async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'assignedCourses',
        populate: {
          path: 'enrolledUsers',
          model: 'userRegister',
          select: 'firstName lastName email phoneNumber'
        }
      });

    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

    res.status(200).json({ success: true, data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE MENTOR
exports.update = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, expertise, assignedCourses } = req.body;

    const mentor = await Mentor.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phoneNumber, expertise, assignedCourses },
      { new: true }
    )
    .select('-password')
    .populate({
      path: 'assignedCourses',
      populate: {
        path: 'enrolledUsers',
        model: 'userRegister',
        select: 'firstName lastName email phoneNumber'
      }
    });

    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

    res.status(200).json({ success: true, message: 'Mentor updated successfully', data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE MENTOR
exports.delete= async (req, res) => {
  try {
    const mentor = await Mentor.findByIdAndDelete(req.params.id)
      .populate({
        path: 'assignedCourses',
        populate: {
          path: 'enrolledUsers',
          model: 'userRegister',
          select: 'firstName lastName email phoneNumber'
        }
      });

    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

    res.status(200).json({ success: true, message: 'Mentor deleted successfully', data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
// CREATE
exports.createMentor = async (req, res) => {
  try {
    const { name, role, content } = req.body;

    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const imageUrl = await uploadImage(req.file.buffer);

    const mentor = await OurMentor.create({
      image: imageUrl,
      name,
      role,
      content
    });

    res.status(201).json({ message: "Mentor created", data: mentor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET ALL
exports.getAllMentors = async (req, res) => {
  try {
    const mentors = await OurMentor.find();
    res.status(200).json({ data: mentors });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET BY ID
exports.getMentorById = async (req, res) => {
  try {
    const mentor = await OurMentor.findById(req.params.id);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    res.status(200).json({ data: mentor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// UPDATE
exports.updateMentor = async (req, res) => {
  try {
    const { name, role, content } = req.body;
    let updateData = { name, role, content };

    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer);
      updateData.image = imageUrl;
    }

    const updatedMentor = await OurMentor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedMentor) return res.status(404).json({ message: "Mentor not found" });

    res.status(200).json({ message: "Mentor updated", data: updatedMentor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE
exports.deleteMentor = async (req, res) => {
  try {
    const deleted = await OurMentor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Mentor not found" });
    res.status(200).json({ message: "Mentor deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// CREATE
exports.createMentorExperience = async (req, res) => {
  try {
    const { name, content } = req.body;

    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const imageUrl = await uploadImage(req.file.buffer);

    const mentor = await MentorExperience.create({
      name,
      image: imageUrl,
      content
    });

    res.status(201).json({ message: "Mentor experience created", data: mentor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// READ ALL
exports.getAllMentorExperiences = async (req, res) => {
  try {
    const data = await MentorExperience.find();
    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// READ BY ID
exports.getMentorExperienceById = async (req, res) => {
  try {
    const data = await MentorExperience.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// UPDATE
exports.updateMentorExperience = async (req, res) => {
  try {
    const { name, content } = req.body;
    let updateData = { name, content };

    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer);
      updateData.image = imageUrl;
    }

    const updated = await MentorExperience.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });

    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE
exports.deleteMentorExperience = async (req, res) => {
  try {
    const deleted = await MentorExperience.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
