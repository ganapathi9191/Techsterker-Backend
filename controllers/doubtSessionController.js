const DoubtSession = require("../models/DoubtSession");
const { uploadImage } = require("../config/cloudinary"); // Adjust path as needed

// ➕ Create a new doubt session
exports.createDoubtSession = async (req, res) => {
  try {
    const { enrolledcourses, batchNumber, mentor, date, description } = req.body;

    if (!enrolledcourses || !batchNumber || !mentor || !date || !description) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer);
    }

    const newSession = await DoubtSession.create({
      enrolledcourses,
      batchNumber,
      mentor,
      date,
      description,
      image: imageUrl
    });

    res.status(201).json({ success: true, message: "Doubt session created", data: newSession });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 📖 Get all doubt sessions
exports.getAllDoubtSessions = async (req, res) => {
  try {
    const sessions = await DoubtSession.find().populate("enrolledcourses");
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 📖 Get a single doubt session by ID
exports.getDoubtSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await DoubtSession.findById(id).populate("enrolledcourses");

    if (!session) {
      return res.status(404).json({ success: false, message: "Doubt session not found" });
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✏️ Update doubt session
exports.updateDoubtSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchNumber, mentor, date, description } = req.body;

    const updateData = {};
    if (batchNumber) updateData.batchNumber = batchNumber;
    if (mentor) updateData.mentor = mentor;
    if (date) updateData.date = date;
    if (description) updateData.description = description;

    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer);
      updateData.image = imageUrl;
    }

    const updatedSession = await DoubtSession.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedSession) {
      return res.status(404).json({ success: false, message: "Doubt session not found" });
    }

    res.status(200).json({ success: true, message: "Doubt session updated", data: updatedSession });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ❌ Delete doubt session
exports.deleteDoubtSession = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DoubtSession.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Doubt session not found" });
    }

    res.status(200).json({ success: true, message: "Doubt session deleted", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
