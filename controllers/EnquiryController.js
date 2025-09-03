const {Enquiry,ContactEnquiry } = require('../models/EnquiryModel');
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
    const enquiry = new Enquiry(req.body);
    const saved = await enquiry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Enquiries
exports.getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find();
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get One Enquiry by ID
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Enquiry
exports.updateEnquiry = async (req, res) => {
  try {
    const updated = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Enquiry not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Enquiry
exports.deleteEnquiry = async (req, res) => {
  try {
    const deleted = await Enquiry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Enquiry not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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