const {UpcomingBatch,AbrodStudent} = require("../models/upcomingBatchModel");
const { uploadImage,uploadToCloudinary,uploadImages,uploadToCloudinarys  } = require('../config/cloudinary1');



// ➕ Create
exports.createUpcomingBatch = async (req, res) => {
  try {
    const { allbatches } = req.body;
    if (!allbatches || !Array.isArray(allbatches) || allbatches.length === 0) {
      return res.status(400).json({ success: false, message: "allbatches is required and must be an array." });
    }

    const batch = await UpcomingBatch.create({ allbatches });
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 📥 Read all
exports.getAllUpcomingBatches = async (req, res) => {
  try {
    const batches = await UpcomingBatch.find();
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// 📥 Read one
exports.getUpcomingBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await UpcomingBatch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// 🔍 Get batches by categorie (Regular or Weekend)
exports.getBatchesByCategorie = async (req, res) => {
  try {
    const { categorie } = req.params;

    if (!["Regular", "Weekend"].includes(categorie)) {
      return res.status(400).json({ success: false, message: "Invalid categorie value. Use 'Regular' or 'Weekend'." });
    }

    // Find all upcomingBatch documents, but filter only matching batches inside
    const batches = await UpcomingBatch.find({
      "allbatches.categorie": categorie
    });

    // Extract only batches where categorie matches
    const filtered = batches.flatMap(batchDoc =>
      batchDoc.allbatches.filter(batch => batch.categorie === categorie)
    );

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 🔍 Get a single batch by only its own batchId (from any UpcomingBatch document)
exports.getSingleBatchByIdOnly = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find the document where allbatches._id matches
    const batchDoc = await UpcomingBatch.findOne({ "allbatches._id": batchId });

    if (!batchDoc) {
      return res.status(404).json({ success: false, message: "Batch not found." });
    }

    // Extract the matching batch from allbatches
    const batch = batchDoc.allbatches.id(batchId);

    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




// ✏️ Update
exports.updateUpcomingBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await UpcomingBatch.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Batch not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ❌ Delete
exports.deleteUpcomingBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await UpcomingBatch.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Batch not found" });
    res.status(200).json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

 // Add Abroad Student
exports.addAbrodStudent = async (req, res) => {
  try {
    const { title, description, details } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Images are required" });
    }

    // Separate files manually based on fieldname
    const mainImgFile = req.files.find(file => file.fieldname === "mainImage");
    if (!mainImgFile) {
      return res.status(400).json({ success: false, message: "mainImage is required" });
    }
    const mainImage = await uploadImage(mainImgFile.buffer, "abrodstudents");

    // Parse details array from JSON text
    let detailsArr = [];
    if (details) {
      detailsArr = JSON.parse(details); // e.g. [{ "content": "..." }, { "content": "..." }]
    }

    // Get detail images in order
    const detailFiles = req.files.filter(file => file.fieldname === "detailsImages");
    if (detailFiles.length !== detailsArr.length) {
      return res.status(400).json({ 
        success: false, 
        message: "detailsImages count must match details content count" 
      });
    }

    const uploadedDetailImages = await Promise.all(
      detailFiles.map(file => uploadImage(file.buffer, "abrodstudents"))
    );

    const finalDetails = detailsArr.map((item, index) => ({
      image: uploadedDetailImages[index],
      content: item.content
    }));

    const newStudent = await AbrodStudent.create({
      mainImage,
      title,
      description,
      details: finalDetails
    });

    res.status(201).json({
      success: true,
      message: "Abroad Student entry added successfully",
      data: newStudent
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// GET All Abroad Students
exports.getAllAbrodStudents = async (req, res) => {
  try {
    const students = await AbrodStudent.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET Abroad Student By ID
exports.getAbrodStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const student = await AbrodStudent.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Record not found" });

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// UPDATE Abroad Student By ID
exports.updateAbrodStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, details } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const student = await AbrodStudent.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Record not found" });

    // Update main image if uploaded
    const mainImgFile = req.files.find(file => file.fieldname === "mainImage");
    if (mainImgFile) {
      student.mainImage = await uploadImage(mainImgFile.buffer, "abrodstudents");
    }

    // Update text fields
    if (title) student.title = title;
    if (description) student.description = description;

    // If details are provided, replace them fully
    if (details) {
      const detailsArr = JSON.parse(details);
      const detailFiles = req.files.filter(file => file.fieldname === "detailsImages");
      if (detailFiles.length !== detailsArr.length) {
        return res.status(400).json({
          success: false,
          message: "detailsImages count must match details content count"
        });
      }

      const uploadedDetailImages = await Promise.all(
        detailFiles.map(file => uploadImage(file.buffer, "abrodstudents"))
      );

      student.details = detailsArr.map((item, index) => ({
        image: uploadedDetailImages[index],
        content: item.content
      }));
    }

    const updatedStudent = await student.save();
    res.status(200).json({
      success: true,
      message: "Abroad Student updated successfully",
      data: updatedStudent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// DELETE Abroad Student By ID
exports.deleteAbrodStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const student = await AbrodStudent.findByIdAndDelete(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Record not found" });

    res.status(200).json({ success: true, message: "Abroad Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};