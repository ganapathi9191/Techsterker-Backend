const bcrypt = require('bcryptjs');
const UserRegister = require('../models/registerUser');  // Correct reference
const generateToken = require('../config/token');
const Enrollment = require('../models/enrollment');
const {Course} = require('../models/coursesModel');
const mongoose = require('mongoose'); 


// REGISTER USER
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, confirmpassword } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmpassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingUser = await UserRegister.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserRegister.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: newUser._id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        token: generateToken(newUser._id),
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await UserRegister.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber,
        token: generateToken(user._id),
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await UserRegister.find().select('-password');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    const user = await UserRegister.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    const user = await UserRegister.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phoneNumber },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await UserRegister.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add recommended courses to a user
exports.addRecommendedCourses = async (req, res) => {
try {
    const { userId, courseIds } = req.body; // courseIds: array of ObjectIds

    if (!userId || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userId and non-empty courseIds[] required' });
    }

    // Validate ObjectIds
    const badIds = courseIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (!mongoose.Types.ObjectId.isValid(userId) || badIds.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid ObjectId(s): ${[
          !mongoose.Types.ObjectId.isValid(userId) ? userId : null,
          ...badIds
        ].filter(Boolean).join(', ')}`
      });
    }

    // Ensure all courses exist
    const foundIds = await Course.find({ _id: { $in: courseIds } }).distinct('_id');
    const missing = courseIds.filter(id => !foundIds.map(String).includes(String(id)));
    if (missing.length) {
      return res.status(404).json({ success: false, message: `Courses not found: ${missing.join(', ')}` });
    }

    // Add without duplicates
    const user = await UserRegister.findByIdAndUpdate(
      userId,
      { $addToSet: { recommendedCourses: { $each: courseIds } } },
      { new: true }
    ).populate('recommendedCourses');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({
      success: true,
      message: 'Recommended courses updated',
      data: user.recommendedCourses
    });
  } catch (err) {
    console.error('Error adding recommended courses:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// Get recommended courses for a user
exports.getRecommendedCourses = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserRegister.findById(userId)
      .populate('recommendedCourses');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Recommended courses fetched successfully",
      data: user.recommendedCourses
    });

  } catch (error) {
    console.error("Error fetching recommended courses:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

