const {Enquiry,ContactEnquiry,Apply } = require('../models/EnquiryModel');
const { uploadToCloudinary } = require("../config/cloudinary1"); // adjust path


function formatPhoneNumber(phone) {
  let clean = phone.toString().trim();
  if (!clean.startsWith('+')) {
    clean = '+91' + clean; // Default to India
  }
  return clean;
}


// Create Enquiry
exports.createEnquiry = async (req, res) => {
  try {
    const { name, phoneNumber, email, courses, city, message } = req.body;

    const newEnquiry = new Enquiry({
      name,
      phoneNumber,
      email,
      courses,
      city,
      message
    });

    await newEnquiry.save();

    res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: newEnquiry
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Get All Enquiries
exports.getEnquiries = async (req, res) => {
  try {
    // Sorting by the 'createdAt' field in descending order (-1).
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get One Enquiry by ID
exports.getEnquiryById = async (req, res) => {
   try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }
    res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Update Enquiry
exports.updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }
    res.status(200).json({
      success: true,
      message: "Enquiry updated successfully",
      data: enquiry
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Delete Enquiry
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }
    res.status(200).json({ success: true, message: "Enquiry deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Add Enquiry
exports.addEnquiry = async (req, res) => {
  try {
    const { name, email, phoneNumber, enquiryType, message } = req.body;

    if (!name || !email || !phoneNumber || !enquiryType || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate that phoneNumber is in E.164 format: starts with + and only digits after
    const phoneRegex = /^\+[1-9]\d{7,14}$/; // +<country><number>, 8–15 digits total
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must include country code, e.g. +919398459192"
      });
    }

    const enquiry = new ContactEnquiry({ 
      name, 
      email, 
      phoneNumber,  // store exactly as given
      enquiryType, 
      message 
    });
    await enquiry.save();

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry
    });
  } catch (error) {
    console.error("Error adding enquiry:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error adding enquiry", 
      error: error.message 
    });
  }
};

// Get All Enquiries
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await ContactEnquiry.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Enquiries fetched successfully",
      data: enquiries
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching enquiries",
      error: error.message
    });
  }
};

// Get Enquiry By ID
exports.getcontactenqById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const enquiry = await ContactEnquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry fetched successfully",
      data: enquiry
    });
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching enquiry",
      error: error.message
    });
  }
};


// Update Enquiry By ID
exports.updateEnquiryById = async (req, res) => {
try {
    const { id } = req.params;
    const { name, email, phoneNumber, enquiryType, message } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    // Optional validation only if phoneNumber is provided
    if (phoneNumber) {
      const phoneRegex = /^\+[1-9]\d{7,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must include country code, e.g. +919398459192"
        });
      }
    }

    const updatedEnquiry = await ContactEnquiry.findByIdAndUpdate(
      id,
      { name, email, phoneNumber, enquiryType, message },
      { new: true, runValidators: true }
    );

    if (!updatedEnquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry updated successfully",
      data: updatedEnquiry
    });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating enquiry",
      error: error.message
    });
  }
};

// Delete Enquiry By ID
exports.deleteEnquiryById = async (req, res) => {
   try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const deletedEnquiry = await ContactEnquiry.findByIdAndDelete(id);

    if (!deletedEnquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully",
      data: deletedEnquiry
    });
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting enquiry",
      error: error.message
    });
  }
};




// Create Apply
exports.createApply = async (req, res) => {
  try {
    const { fullname, email, mobile, experties, experience, message } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume file is required" });
    }

    const resumeUrl = await uploadToCloudinary(req.file.buffer, "resumes", req.file.originalname);

    const newApply = new Apply({
      fullname, email, mobile, experties, experience, message, resume: resumeUrl
    });

    await newApply.save();
    return res.status(201).json({ success: true, message: "Application submitted successfully", data: newApply });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Applications
exports.getAllApplies = async (req, res) => {
  try {
    // Get sorting field and order from query parameters, default to 'createdAt' and '-1' (descending)
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const applies = await Apply.find().sort({ [sortField]: sortOrder });
    
    return res.status(200).json({
      success: true,
      count: applies.length,
      data: applies
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// Get Application By ID
exports.getApplyById = async (req, res) => {
  try {
    const apply = await Apply.findById(req.params.id);
    if (!apply) return res.status(404).json({ success: false, message: "Application not found" });
    return res.status(200).json({ success: true, data: apply });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Application By ID (handles optional resume re-upload)
exports.updateApplyById = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, mobile, experties, experience, message } = req.body;

    // Build update object only with provided fields
    const updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (experties !== undefined) updateData.experties = experties;
    if (experience !== undefined) updateData.experience = experience;
    if (message !== undefined) updateData.message = message;

    // If resume file provided, upload and set resume url
    if (req.file) {
      const resumeUrl = await uploadToCloudinary(req.file.buffer, "resumes", req.file.originalname);
      updateData.resume = resumeUrl;
    }

    const updated = await Apply.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Application not found" });

    return res.status(200).json({ success: true, message: "Application updated successfully", data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Application By ID
exports.deleteApply = async (req, res) => {
  try {
    const deleted = await Apply.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Application not found" });
    return res.status(200).json({ success: true, message: "Application deleted successfully", data: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

