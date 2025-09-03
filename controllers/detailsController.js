const { ContactDetails, SocialMedia } = require('../models/details');
const { uploadImage } = require('../config/cloudinary');



// ====================== Contact Details ======================

// CREATE
// CREATE Contact
exports.createContact = async (req, res) => {
  try {
    const { title, branch, address, phone, email, description } = req.body;

    let logoimage = null;
    if (req.file) {
      logoimage = await uploadImage(req.file.buffer); // Upload to Cloudinary
    }

    const newContact = await ContactDetails.create({
      title,
      branch,
      address,
      phone: Array.isArray(phone) ? phone : JSON.parse(phone), // Support form-data string
      email,
      description,
      logoimage
    });

    res.status(201).json({ success: true, message: "Contact created", data: newContact });
  } catch (error) {
    res.status(500).json({ success: false, message: "Create error", error: error.message });
  }
};

// READ ALL Contacts
exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await ContactDetails.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Fetch error", error: error.message });
  }
};

// READ Contact by ID
exports.getContactById = async (req, res) => {
  try {
    const contact = await ContactDetails.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: "Fetch error", error: error.message });
  }
};

// UPDATE Contact
exports.updateContact = async (req, res) => {
  try {
    const { title, branch, address, phone, email, description } = req.body;

    let updatedFields = {
      title,
      branch,
      address,
      phone: Array.isArray(phone) ? phone : JSON.parse(phone),
      email,
      description
    };

    if (req.file) {
      const logoimage = await uploadImage(req.file.buffer);
      updatedFields.logoimage = logoimage;
    }

    const updated = await ContactDetails.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update error", error: error.message });
  }
};

// DELETE Contact
exports.deleteContact = async (req, res) => {
  try {
    const deleted = await ContactDetails.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete error", error: error.message });
  }
};
// ====================== Social Media ======================

// 👉 Create SocialMedia
exports.createSocialMedia = async (req, res) => {
  try {
    const social = await SocialMedia.create(req.body);
    res.status(201).json({ success: true, message: "Social media created", data: social });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 👉 Get All SocialMedia
exports.getAllSocialMedia = async (req, res) => {
  try {
    const social = await SocialMedia.find();
    res.status(200).json({ success: true, data: social });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 👉 Get SocialMedia by ID
exports.getSocialMediaById = async (req, res) => {
  try {
    const social = await SocialMedia.findById(req.params.id);
    if (!social) {
      return res.status(404).json({ success: false, message: "Social media not found" });
    }
    res.status(200).json({ success: true, data: social });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 👉 Update SocialMedia
exports.updateSocialMedia = async (req, res) => {
  try {
    const social = await SocialMedia.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!social) {
      return res.status(404).json({ success: false, message: "Social media not found" });
    }
    res.status(200).json({ success: true, message: "Social media updated", data: social });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 👉 Delete SocialMedia
exports.deleteSocialMedia = async (req, res) => {
  try {
    const social = await SocialMedia.findByIdAndDelete(req.params.id);
    if (!social) {
      return res.status(404).json({ success: false, message: "Social media not found" });
    }
    res.status(200).json({ success: true, message: "Social media deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
