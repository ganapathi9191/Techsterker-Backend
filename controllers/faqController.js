const FAQ = require("../models/faqModel");
const { uploadImage } = require("../config/cloudinary");

// CREATE
exports.createFAQ = async (req, res) => {
  try {
    const { faq } = req.body;
    let image = "";

    if (req.file) {
      image = await uploadImage(req.file.buffer);
    }

    const parsedFAQ = JSON.parse(faq); // if sent as string

    const newFAQ = await FAQ.create({ image, faq: parsedFAQ });
    res.status(201).json({ message: "FAQ created", data: newFAQ });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET ALL
exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.status(200).json({ data: faqs });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET BY ID
exports.getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.status(200).json({ data: faq });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// UPDATE
exports.updateFAQ = async (req, res) => {
  try {
    const { faq } = req.body;
    const id = req.params.id;

    let image = undefined;
    if (req.file) {
      image = await uploadImage(req.file.buffer);
    }

    const parsedFAQ = JSON.parse(faq); // if stringified

    const updated = await FAQ.findByIdAndUpdate(
      id,
      { image, faq: parsedFAQ },
      { new: true }
    );

    res.status(200).json({ message: "FAQ updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE
exports.deleteFAQ = async (req, res) => {
  try {
    const id = req.params.id;
    await FAQ.findByIdAndDelete(id);
    res.status(200).json({ message: "FAQ deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
