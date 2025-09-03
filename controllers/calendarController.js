const Calendar = require("../models/Calendar");

// CREATE Calendar entry
exports.createCalendarEntry = async (req, res) => {
  try {
    const { name, type, date } = req.body;

    if (!name || !type || !date) {
      return res.status(400).json({ success: false, message: "Name, type, and date are required" });
    }

    const calendarEntry = await Calendar.create({ name, type, date });
    res.status(201).json({ success: true, message: "Calendar entry created", data: calendarEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET all calendar entries
exports.getAllCalendarEntries = async (req, res) => {
  try {
    const entries = await Calendar.find().sort({ date: 1 });
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET calendar entry by ID
exports.getCalendarById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Calendar.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Calendar entry not found" });
    }
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// UPDATE calendar entry by ID
exports.updateCalendarById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, date } = req.body;

    const updated = await Calendar.findByIdAndUpdate(
      id,
      { name, type, date },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Calendar entry not found" });
    }
    res.status(200).json({ success: true, message: "Calendar entry updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// DELETE calendar entry by ID
exports.deleteCalendarById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Calendar.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Calendar entry not found" });
    }
    res.status(200).json({ success: true, message: "Calendar entry deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
