const Content = require("../models/content");
const { cloudinary, uploadImage } = require('../config/cloudinary');

// POST: Create Content
const createContent = async (req, res) => {
  try {
    const { title, heading, description } = req.body;

    if (!title || !heading || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Image is required" });
    }

    const imageUrl = await uploadImage(req.file.buffer);

    const content = await Content.create({ title, heading, description, image: imageUrl });

    res.status(201).json({ message: "Content created", data: content });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET: All Content
const getAllContent = async (req, res) => {
  try {
    const contents = await Content.find().sort({ _id: -1 });
    res.status(200).json({ message: "All content fetched", data: contents });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET: Content by ID
const getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) return res.status(404).json({ message: "Content not found" });

    res.status(200).json({ message: "Content found", data: content });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT: Update Content
const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, heading, description } = req.body;

    const updateData = { title, heading, description };

    if (req.file && req.file.buffer) {
      const imageUrl = await uploadImage(req.file.buffer);
      updateData.image = imageUrl;
    }

    const updated = await Content.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) return res.status(404).json({ message: "Content not found" });

    res.status(200).json({ message: "Content updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE: Remove Content
const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Content.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Content not found" });

    res.status(200).json({ message: "Content deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent
};
