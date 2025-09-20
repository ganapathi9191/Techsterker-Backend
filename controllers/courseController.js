const {Course,DownloadUser,GetInTouch} = require("../models/coursesModel");
const { uploadToCloudinary} = require("../config/cloudinary1");
const mongoose = require("mongoose");
require("dotenv").config();
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET_KEY; 

// Twilio credentials
const TWILIO_SID = "AC6dbc0f86b6481658d4b4bc471d1dfb32";
const TWILIO_AUTH_TOKEN = "c623dd368248f84be06e643750fae2f0";
const TWILIO_PHONE = "+19123489710";

const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);



exports.createCourse = async (req, res) => {
  try {
    const {
      name,
      description,
      mode,
      category,
      price,
      duration,
      faq,
      features,
      reviews,
      toolsImages,
      noOfLessons = 0,
      noOfStudents = 0
    } = req.body;

    // Parse JSON fields
    const faqArray = faq ? JSON.parse(faq) : [];
    const featuresArray = features ? JSON.parse(features) : [];
    let reviewsArray = reviews ? JSON.parse(reviews) : [];

    // Extract files
    const files = req.files || [];
    console.log("Uploaded files:", files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));

    const mainImageFile = files.find(file => file.fieldname === "image");
    const logoFile = files.find(file => file.fieldname === "logoImage");
    const pdfFile = files.find(file => file.fieldname === "pdf");
    const featureFiles = files.filter(file => file.fieldname === "featureImages" || file.fieldname === "featureImages[]");
    const toolsFiles = files.filter(file => file.fieldname === "toolsImages" || file.fieldname === "toolsImages[]");
    const reviewFiles = files.filter(file =>
      file.fieldname === "reviewImages" ||
      file.fieldname === "reviewImages[]" ||
      file.fieldname === "reviewImage" ||
      file.fieldname === "reviewImage[]"
    );

    // Upload main image (required)
    if (!mainImageFile) {
      return res.status(400).json({ success: false, message: "Main image is required" });
    }
    const courseImageUrl = await uploadToCloudinary(mainImageFile.buffer, "courses/main", mainImageFile.originalname);

    // Upload logo image (optional)
    let logoImageUrl = null;
    if (logoFile) {
      logoImageUrl = await uploadToCloudinary(logoFile.buffer, "courses/logo", logoFile.originalname);
    }

    // Upload pdf (optional)
    let pdfUrl = null;
    if (pdfFile) {
      if (pdfFile.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF format is allowed for course PDF"
        });
      }
      pdfUrl = await uploadToCloudinary(pdfFile.buffer, "courses/pdf", pdfFile.originalname);
    }

    // Upload feature images
    const featureImageUrls = [];
    for (const file of featureFiles) {
      const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/features", file.originalname);
      featureImageUrls.push(uploadedUrl);
    }
    const featuresWithImages = featuresArray.map((feature, index) => ({
      ...feature,
      image: featureImageUrls[index] || null
    }));

    // Upload tools images
    const toolsImageUrls = [];
    for (const file of toolsFiles) {
      const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/tools", file.originalname);
      toolsImageUrls.push(uploadedUrl);
    }

    // Upload review images
    const reviewImageUrls = [];
    for (const file of reviewFiles) {
      const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/reviews", file.originalname);
      reviewImageUrls.push(uploadedUrl);
    }

    // Map review images to reviews
    reviewsArray = reviewsArray.map((review, index) => ({
      ...review,
      image: reviewImageUrls[index] || null
    }));

    // Validate reviews
    const reviewsWithoutImages = reviewsArray.filter(r => !r.image);
    if (reviewsWithoutImages.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Each review must have an image uploaded",
        missingImagesForReviews: reviewsWithoutImages.map(r => r.name)
      });
    }
    if (reviewImageUrls.length !== reviewsArray.length) {
      return res.status(400).json({
        success: false,
        message: "Number of review images must match number of reviews",
        reviewsCount: reviewsArray.length,
        reviewImagesCount: reviewImageUrls.length
      });
    }

    // Create course
    const course = new Course({
      name,
      description,
      mode,
      category,
      price,
      duration,
      faq: faqArray,
      features: featuresWithImages,
      reviews: reviewsArray,
      image: courseImageUrl,
      logoImage: logoImageUrl,
      pdf: pdfUrl,
      toolsImages: toolsImageUrls,
      noOfLessons,
      noOfStudents
    });

    await course.save();

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    console.error("Error creating course:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating course",
      error: error.message
    });
  }
};
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({ success: false, message: "Error fetching courses", error: error.message });
  }
};

// Get Course By ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({ success: false, message: "Error fetching course", error: error.message });
  }
};

// Get Courses By Category (based on category name)
exports.getCourseByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const courses = await Course.find({ category: { $regex: new RegExp(category, 'i') } });
    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error("Error fetching courses by category:", error);
    return res.status(500).json({ success: false, message: "Error fetching courses by category", error: error.message });
  }
};


exports.updateCourseById = async (req, res) => {
   try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const {
      name,
      description,
      mode,
      category,
      price,
      duration,
      faq,
      features,
      reviews,
      toolsImages,
      noOfLessons = 0,
      noOfStudents = 0
    } = req.body;

    // Parse JSON fields
    const faqArray = faq ? JSON.parse(faq) : [];
    const featuresArray = features ? JSON.parse(features) : [];
    let reviewsArray = reviews ? JSON.parse(reviews) : [];

    // Extract files
    const files = req.files || [];
    console.log("Uploaded files:", files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));

    const mainImageFile = files.find(file => file.fieldname === "image");
    const logoFile = files.find(file => file.fieldname === "logoImage");
    const pdfFile = files.find(file => file.fieldname === "pdf");
    const featureFiles = files.filter(file => file.fieldname === "featureImages" || file.fieldname === "featureImages[]");
    const toolsFiles = files.filter(file => file.fieldname === "toolsImages" || file.fieldname === "toolsImages[]");
    const reviewFiles = files.filter(file =>
      file.fieldname === "reviewImages" ||
      file.fieldname === "reviewImages[]" ||
      file.fieldname === "reviewImage" ||
      file.fieldname === "reviewImage[]"
    );

    // Fetch existing course
    let course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Upload new main image if provided (otherwise keep old)
    let courseImageUrl = course.image;
    if (mainImageFile) {
      courseImageUrl = await uploadToCloudinary(mainImageFile.buffer, "courses/main", mainImageFile.originalname);
    }

    // Upload new logo if provided
    let logoImageUrl = course.logoImage || null;
    if (logoFile) {
      logoImageUrl = await uploadToCloudinary(logoFile.buffer, "courses/logo", logoFile.originalname);
    }

    // Upload new pdf if provided
    let pdfUrl = course.pdf || null;
    if (pdfFile) {
      if (pdfFile.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF format is allowed for course PDF"
        });
      }
      pdfUrl = await uploadToCloudinary(pdfFile.buffer, "courses/pdf", pdfFile.originalname);
    }

    // Upload new feature images if provided, else keep existing
    const featureImageUrls = [];
    for (const file of featureFiles) {
      const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/features", file.originalname);
      featureImageUrls.push(uploadedUrl);
    }
    const featuresWithImages = featuresArray.map((feature, index) => ({
      ...feature,
      image: featureImageUrls[index] || (course.features[index] ? course.features[index].image : null)
    }));

    // Upload new tools images if provided, else keep old
    let toolsImageUrls = course.toolsImages || [];
    if (toolsFiles.length > 0) {
      toolsImageUrls = [];
      for (const file of toolsFiles) {
        const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/tools", file.originalname);
        toolsImageUrls.push(uploadedUrl);
      }
    }

    // Upload new review images if provided, else keep old
    const reviewImageUrls = [];
    for (const file of reviewFiles) {
      const uploadedUrl = await uploadToCloudinary(file.buffer, "courses/reviews", file.originalname);
      reviewImageUrls.push(uploadedUrl);
    }

    // Map review images to reviews (merge with existing if none uploaded)
    reviewsArray = reviewsArray.map((review, index) => ({
      ...review,
      image: reviewImageUrls[index] || (course.reviews[index] ? course.reviews[index].image : null)
    }));

    // Validate reviews
    const reviewsWithoutImages = reviewsArray.filter(r => !r.image);
    if (reviewsWithoutImages.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Each review must have an image uploaded",
        missingImagesForReviews: reviewsWithoutImages.map(r => r.name)
      });
    }
    if (reviewImageUrls.length > 0 && reviewImageUrls.length !== reviewsArray.length) {
      return res.status(400).json({
        success: false,
        message: "Number of review images must match number of reviews when uploading new ones",
        reviewsCount: reviewsArray.length,
        reviewImagesCount: reviewImageUrls.length
      });
    }

    // Update course
    course.name = name || course.name;
    course.description = description || course.description;
    course.mode = mode || course.mode;
    course.category = category || course.category;
    course.price = price || course.price;
    course.duration = duration || course.duration;
    course.faq = faqArray.length > 0 ? faqArray : course.faq;
    course.features = featuresWithImages.length > 0 ? featuresWithImages : course.features;
    course.reviews = reviewsArray.length > 0 ? reviewsArray : course.reviews;
    course.image = courseImageUrl;
    course.logoImage = logoImageUrl;
    course.pdf = pdfUrl;
    course.toolsImages = toolsImageUrls;
    course.noOfLessons = noOfLessons || course.noOfLessons;
    course.noOfStudents = noOfStudents || course.noOfStudents;

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating course",
      error: error.message
    });
  }
};
// Delete Course By ID
exports.deleteCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    return res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({ success: false, message: "Error deleting course", error: error.message });
  }
};

// POST /api/send-otp
exports.sendOtp = async (req, res) => {
    try {
    const { name, phoneNumber, syllabus } = req.body;
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Name and phone number required" });
    }

    // Generate 4-digit random OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds

    // Save OTP in DB
    await DownloadUser.findOneAndUpdate(
      { phoneNumber },
      { name, syllabus, otp, expiresAt, verified: false },
      { upsert: true, new: true }
    );

    // Send OTP via SMS
    await client.messages.create({
      body: `Your OTP is ${otp}. It will expire in 90 seconds.`,
      from: TWILIO_PHONE,
      to: phoneNumber, // phone number must be in E.164 format (+91XXXXXXXXXX)
    });

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully via SMS" });
  } catch (error) {
    console.error("Error generating OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// POST /api/verify-otp
exports.verifyOtp = async (req, res) => {
   try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number and OTP required" });
    }

    const record = await DownloadUser.findOne({ phoneNumber });
    if (!record)
      return res
        .status(400)
        .json({ success: false, message: "No OTP found for this phone" });

    if (record.verified)
      return res
        .status(400)
        .json({ success: false, message: "OTP already used" });

    if (record.expiresAt < new Date())
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });

    if (otp !== record.otp)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });

    // Mark as verified
    record.verified = true;
    await record.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: record._id, phoneNumber: record.phoneNumber },
      JWT_SECRET,
      { expiresIn: "1h" } // 1 hour token
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: record._id,
        name: record.name,
        phoneNumber: record.phoneNumber,
        syllabus: record.syllabus
      }
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await DownloadUser.find().select("-otp -expiresAt"); // hide sensitive fields
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Add Get In Touch Entry
exports.addGetInTouch = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      message,
      iAm,
      collegeName,
      branch,
      yearOfPassedOut,
      companyName,
      role,
      experienceInYears
    } = req.body;

    // Validate required common fields
    if (!fullName || !email || !phoneNumber || !message || !iAm) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled."
      });
    }

    // Validate based on iAm value
    if (iAm === "student") {
      if (!collegeName || !branch || !yearOfPassedOut) {
        return res.status(400).json({
          success: false,
          message: "For student, collegeName, branch, and yearOfPassedOut are required."
        });
      }
    } else if (iAm === "professional") {
      if (!companyName || !role || !experienceInYears) {
        return res.status(400).json({
          success: false,
          message: "For professional, companyName, role, and experienceInYears are required."
        });
      }
    }

    const newEntry = await GetInTouch.create({
      fullName,
      email,
      phoneNumber,
      message,
      iAm,
      collegeName,
      branch,
      yearOfPassedOut,
      companyName,
      role,
      experienceInYears
    });

    res.status(201).json({
      success: true,
      message: "Get In Touch form submitted successfully.",
      data: newEntry
    });

  } catch (error) {
    console.error("Error adding GetInTouch:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not submit form.",
      error: error.message
    });
  }
};

// Get all Get In Touch Entries
exports.getAllGetInTouch = async (req, res) => {
  try {
    const entries = await GetInTouch.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    console.error("Error fetching GetInTouch:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not fetch entries.",
      error: error.message
    });
  }
};

// Get Entry By ID
exports.getGetInTouchById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await GetInTouch.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    res.status(200).json({
      success: true,
      data: entry
    });

  } catch (error) {
    console.error("Error fetching GetInTouch by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not fetch entry.",
      error: error.message
    });
  }
};

// Update Entry By ID
exports.updateGetInTouchById = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedEntry = await GetInTouch.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Get In Touch entry updated successfully.",
      data: updatedEntry
    });

  } catch (error) {
    console.error("Error updating GetInTouch:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not update entry.",
      error: error.message
    });
  }
};

// Delete Entry By ID
exports.deleteGetInTouchById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEntry = await GetInTouch.findByIdAndDelete(id);

    if (!deletedEntry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Get In Touch entry deleted successfully."
    });

  } catch (error) {
    console.error("Error deleting GetInTouch:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not delete entry.",
      error: error.message
    });
  }
};