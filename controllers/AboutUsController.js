const { AboutUs, AboutPage,TechnicalTeam } = require("../models/AboutUsModel"); 
const { cloudinary, uploadImage  } = require('../config/cloudinary1');

// ✅ Create About (POST)
const createAbout = async (req, res) => {
  try {
    const { title1, content1 } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer); // Make sure this function returns a Cloudinary image URL
    }

    const about = new AboutUs({
      title1,
      content1,
      image1: imageUrl,
    });

    await about.save();

    res.status(201).json({ message: 'About created', data: about });
  } catch (error) {
    console.error('Create Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message || error });
  }
};

// ✅ Get All About Entries (GET)
const getAbout = async (req, res) => {
  try {
    const abouts = await  AboutUs.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Fetched successfully", data: abouts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Update About by ID (PUT)
const updateAbout = async (req, res) => {
  try {
    const { title1, content1 } = req.body;
    const { id } = req.params;

    const updateData = { title1, content1 };

    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "about" },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ message: "Cloudinary upload error", error });
          }

          updateData.image1 = result.secure_url;
          const updated = await  AboutUs.findByIdAndUpdate(id, updateData, { new: true });

          if (!updated) {
            return res.status(404).json({ message: "About not found" });
          }

          res.status(200).json({ message: "Updated successfully", data: updated });
        }
      );

      req.file.stream.pipe(uploadStream);
    } else {
      const updated = await  AboutUs.findByIdAndUpdate(id, updateData, { new: true });

      if (!updated) {
        return res.status(404).json({ message: "About not found" });
      }

      res.status(200).json({ message: "Updated successfully", data: updated });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Delete About by ID (DELETE)
const deleteAbout = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await  AboutUs.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "About not found" });
    }
    res.status(200).json({ message: "Deleted successfully", data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
// 🔹 Create Leadership (POST)
const createLeadership = async (req, res) => {
  try {
    const { name, role, content } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const uploaded = await uploadImage(req.file.buffer); // this uses your helper correctly

    const newLeader = {
      name,
      role,
      content,
      image: uploaded
    };

    // 🔹 Check if a document exists
    let aboutPage = await AboutPage.findOne();

    if (!aboutPage) {
      // Create new AboutPage document with first leadership member
      aboutPage = new AboutPage({
        leadership: [newLeader],
      });
    } else {
      // Push new leader into the existing leadership array
      aboutPage.leadership.push(newLeader);
    }

    // Save the document
    await aboutPage.save();

    res.status(201).json({ success: true, data: newLeader });
  } catch (error) {
    console.error("Create Leadership Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};
// 🔹 Get Leadership (GET)
const getLeadership = async (req, res) => {
  try {
    const aboutPage = await AboutPage.find();
    res.status(200).json(aboutPage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Update Leadership (PUT)
const updateLeadership = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, content } = req.body;

    let imageUrl;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(req.file.buffer);
      });

      imageUrl = result.secure_url;
    }

    const update = {
      'leadership.0.name': name,
      'leadership.0.role': role,
      'leadership.0.content': content
    };

    if (imageUrl) update['leadership.0.image'] = imageUrl;

    const updated = await AboutPage.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ message: "Leadership not found" });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Delete Leadership (DELETE)
const deleteLeadership = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AboutPage.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create Technical Team Member (POST)
const createTechnicalTeam = async (req, res) => {
  try {
    const { title2, description2 } = req.body;
    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer);
    }

    const newMember = await TechnicalTeam.create({
      title2,
      description2,
      image2: imageUrl
    });

    res.status(201).json({ success: true, message: "Member created", data: newMember });
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Get All Technical Team Members (GET)
const getAllTechnicalTeam = async (req, res) => {
  try {
    const members = await TechnicalTeam.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Get Technical Team Member by ID (GET)
const getTechnicalTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TechnicalTeam.findById(id);

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Update Technical Team Member by ID (PUT)
const updateTechnicalTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title2, description2 } = req.body;

    // Validate required fields
    if (!title2 || !description2) {
      return res.status(400).json({
        success: false,
        message: "title2 and description2 are required",
      });
    }

    const updateData = { title2, description2 };

    // ✅ Handle image upload if file is present
    if (req.file) {
      console.log("Image received in req.file:", req.file.originalname);
      const imageUrl = await uploadImage(req.file.buffer); // Upload image and get URL
      updateData.image2 = imageUrl;
    }

    // ✅ Update member by ID
    const updatedMember = await TechnicalTeam.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: "Technical team member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Technical team member updated successfully",
      data: updatedMember,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message || error,
    });
  }
};
// ✅ Delete Technical Team Member by ID (DELETE)
const deleteTechnicalTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await TechnicalTeam.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    res.status(200).json({ success: true, message: "Deleted successfully", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// ✅ Export All Methods
module.exports = {
  createAbout,
  getAbout,
  updateAbout,
  deleteAbout,
  createLeadership,
  getLeadership,
  updateLeadership,
  deleteLeadership,
  createTechnicalTeam,
  getAllTechnicalTeam,
  getTechnicalTeamById,
  updateTechnicalTeam,
  deleteTechnicalTeam

};
