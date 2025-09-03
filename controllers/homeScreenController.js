const { HomeScreen, HomeFeature,Client,Review,Counter,HomeDefferschems,HomeCourses} = require("../models/HomeScreen");
const { uploadImage,uploadToCloudinary,uploadImages,uploadToCloudinarys  } = require('../config/cloudinary1');
const mongoose = require('mongoose');


// Create or update home screen banners
exports.createOrUpdateHomeScreen = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one banner image is required" });
    }

    const { titles, contents } = req.body;

    // Ensure arrays are aligned
    if (!Array.isArray(titles) || !Array.isArray(contents) || titles.length !== req.files.length || contents.length !== req.files.length) {
      return res.status(400).json({ success: false, message: "titles, contents, and images must have the same length" });
    }
     
    // Upload images to Cloudinary
    const uploadedUrls = [];
    for (let i = 0; i < req.files.length; i++) {
      const url = await uploadToCloudinary(req.files[i].buffer);
      uploadedUrls.push(url);
    }

    const banners = uploadedUrls.map((url, i) => ({
      image: url,
      title: titles[i],
      content: contents[i]
    }));

    let homeScreen = await HomeScreen.findOne();
    if (!homeScreen) {
      homeScreen = new HomeScreen({ heroBanner: banners });
    } else {
      homeScreen.heroBanner.push(...banners);
    }

    await homeScreen.save();
    res.status(201).json({ success: true, message: "Hero banners added successfully", data: homeScreen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Get all banners
exports.getAllBanners = async (req, res) => {
  try {
    const homeScreen = await HomeScreen.findOne();
    if (!homeScreen || homeScreen.heroBanner.length === 0) {
      return res.status(404).json({ success: false, message: "No hero banners found" });
    }
    res.status(200).json({ success: true, data: homeScreen.heroBanner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Get banner by ID
exports.getBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    const homeScreen = await HomeScreen.findOne({ "heroBanner._id": bannerId }, { "heroBanner.$": 1 });
    if (!homeScreen) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({ success: true, data: homeScreen.heroBanner[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Update banner by ID (supports multiple images)
exports.updateBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { title, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    // Upload image if file is provided
    let uploadedUrl = null;
    if (req.file) {
      uploadedUrl = await uploadToCloudinary(req.file.buffer, "hero-banners");
    }

    // Find the banner inside the array
    const homeScreen = await HomeScreen.findOne({ "heroBanner._id": bannerId });
    if (!homeScreen) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    const banner = homeScreen.heroBanner.id(bannerId);
    if (title) banner.title = title;
    if (content) banner.content = content;
    if (uploadedUrl) banner.image = uploadedUrl;

    await homeScreen.save();

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
// Delete banner by ID
exports.deleteBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    const homeScreen = await HomeScreen.findOneAndUpdate(
      { "heroBanner._id": bannerId },
      { $pull: { heroBanner: { _id: bannerId } } },
      { new: true }
    );

    if (!homeScreen) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({ success: true, message: "Banner deleted successfully", data: homeScreen.heroBanner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.createHomeFeature = async (req, res) => {
  try {
    const { description } = req.body;
    const features = JSON.parse(req.body.features); // features as array of objects

    const uploadedFeatures = [];

    for (let i = 0; i < features.length; i++) {
      const file = req.files[i];
      if (!file) return res.status(400).json({ message: `Image missing for feature ${i + 1}` });

      const imageUrl = await uploadImages(file.buffer);

      uploadedFeatures.push({
        title: features[i].title,
        content: features[i].content,
        image: imageUrl,
      });
    }

    const homeFeature = await HomeFeature.create({ description, features: uploadedFeatures });

    res.status(201).json({ message: "Home feature created", data: homeFeature });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports. getAllHomeFeatures = async (req, res) => {
  try {
    const data = await HomeFeature.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Fetched successfully", data });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateHomeFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const features = JSON.parse(req.body.features); // updated features

    const existing = await HomeFeature.findById(id);
    if (!existing) return res.status(404).json({ message: "Feature not found" });

    const updatedFeatures = [];

    for (let i = 0; i < features.length; i++) {
      let imageUrl = existing.features[i]?.image || "";

      // Replace image if new one is uploaded
      if (req.files[i]) {
        imageUrl = await uploadImages(req.files[i].buffer);
      }

      updatedFeatures.push({
        title: features[i].title,
        content: features[i].content,
        image: imageUrl,
      });
    }

    existing.description = description;
    existing.features = updatedFeatures;
    await existing.save();

    res.status(200).json({ message: "Updated successfully", data: existing });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getHomeFeatureById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await HomeFeature.findById(id);
    if (!data) return res.status(404).json({ message: "Feature not found" });

    res.status(200).json({ message: "Fetched successfully", data });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports. deleteHomeFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await HomeFeature.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Feature not found" });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// CREATE
exports.createReview = async (req, res) => {
  try {
    const { name, rating, content } = req.body;
    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer);
    }

    const newReview = await Review.create({
      image: imageUrl,
      name,
      rating,
      content,
    });

    res.status(201).json({ message: "Review created", data: newReview });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// GET ALL
exports.getAllReviews = async (req, res) => {
  try {
    const Reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "All Reviews", data: Reviews });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// GET BY ID
exports.getReviewById = async (req, res) => {
  try {
    const Reviews = await Review.findById(req.params.id);
    if (!Reviews) return res.status(404).json({ message: "Review not found" });
    res.status(200).json({ message: "Review found", data: Review });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// UPDATE
exports.updateReview = async (req, res) => {
  try {
    const { name, rating, content } = req.body;
    const ratingData = await Review.findById(req.params.id);
    if (!ratingData) return res.status(404).json({ message: "Review not found" });

    let imageUrl = ratingData.image;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer);
    }

    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      {
        image: imageUrl,
        name,
        rating,
        content,
      },
      { new: true }
    );

    res.status(200).json({ message: "Review updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// DELETE
exports.deleteReview = async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Review not found" });

    res.status(200).json({ message: "Review deleted", data: deleted });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


exports.createClient = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const imageUrls = [];

    for (const file of req.files) {
      const imageUrl = await uploadImage(file.buffer);
      imageUrls.push(imageUrl);
    }

    const newClient = await Client.create({
      content: content,
      image: imageUrls,
    });

    res.status(201).json({ message: "Client created", data: newClient });
  } catch (err) {
    res.status(500).json({ message: "Creation failed", error: err.message });
  }
};

// Get All
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get by ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update
exports.updateClient = async (req, res) => {
  try {
    const { content } = req.body;
    const existing = await Client.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Client not found" });

    let imageUrls = existing.image;

    if (req.files && req.files.length > 0) {
      imageUrls = [];

      for (const file of req.files) {
        const imageUrl = await uploadImage(file.buffer);
        imageUrls.push(imageUrl);
      }
    }

    existing.content = content || existing.content;
    existing.image = imageUrls;

    await existing.save();
    res.status(200).json({ message: "Client updated", data: existing });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete
exports.deleteClient = async (req, res) => {
  try {
    const deleted = await Client.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "Client deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Create Counter
exports.createCounter = async (req, res) => {
  try {
    const { counters } = req.body;

    if (!Array.isArray(counters) || counters.length === 0) {
      return res.status(400).json({ success: false, message: "Counters array is required." });
    }

    const newCounterArray = new Counter({ counters });
    await newCounterArray.save();

    res.status(201).json({ success: true, data: newCounterArray });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Get All Counters
exports.getCounters = async (req, res) => {
  try {
    const data = await Counter.find();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Single Counter
exports.getCounterById = async (req, res) => {
  try {
    const { id } = req.params;

    const counterArray = await Counter.findById(id);
    if (!counterArray) {
      return res.status(404).json({ success: false, message: "Counter array not found." });
    }

    res.status(200).json({ success: true, data: counterArray });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Update Counter
exports.updateCounter = async (req, res) => {
  try {
    const { id } = req.params;
    const { counters } = req.body;

    if (!Array.isArray(counters)) {
      return res.status(400).json({ success: false, message: "Counters must be an array." });
    }

    const updated = await Counter.findByIdAndUpdate(
      id,
      { counters },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Counter array not found." });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Counter
exports.deleteCounter = async (req, res) => {
    try {
    const { id } = req.params;
    const deleted = await Counter.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Counter array not found." });
    }

    res.status(200).json({ success: true, message: "Deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Add Home Deffer
exports.addHomeDeffer = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Images are required" });
    }

    // Separate mainImage and deffer files
    const mainImageFile = req.files.find(f => f.fieldname === "mainImage");
    const defferFiles = req.files.filter(f => f.fieldname === "deffer");

    if (!mainImageFile) {
      return res.status(400).json({ success: false, message: "Main image is required" });
    }

    // Upload main image
    const mainImageUrl = await uploadImage(mainImageFile.buffer, "homedeffers");

    // Prepare content array
    let contents = req.body.content || [];
    if (!Array.isArray(contents)) contents = [contents];

    // Upload deffer images with content
    const defferData = [];
    for (let i = 0; i < defferFiles.length; i++) {
      const file = defferFiles[i];
      const content = contents[i] || "";
      const imageUrl = await uploadImage(file.buffer, "homedeffers");
      defferData.push({ image: imageUrl, content });
    }

    // Save to DB
    const newHomeDeffer = new HomeDefferschems({
      mainImage: mainImageUrl,
      deffer: defferData
    });
    await newHomeDeffer.save();

    res.status(201).json({
      success: true,
      message: "Home Deffer added successfully",
      data: newHomeDeffer
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Get All Home Deffers
exports.getAllHomeDeffers = async (req, res) => {
  try {
    const items = await HomeDefferschems.find();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Get Home Deffer By ID
exports.getHomeDefferById = async (req, res) => {
  try {
    const item = await HomeDefferschems.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Home Deffer not found" });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Update Home Deffer By ID
exports.updateHomeDefferById = async (req, res) => {
  try {
    const item = await HomeDefferschems.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Home Deffer not found" });

    const mainImageFile = req.files.find(f => f.fieldname === "mainImage");
    const defferFiles = req.files.filter(f => f.fieldname === "deffer");

    // Update main image if provided
    if (mainImageFile) {
      item.mainImage = await uploadImage(mainImageFile.buffer, "homedeffers");
    }

    // Update deffer array if provided
    if (defferFiles.length > 0) {
      let contents = req.body.content || [];
      if (!Array.isArray(contents)) contents = [contents];

      const defferData = [];
      for (let i = 0; i < defferFiles.length; i++) {
        const file = defferFiles[i];
        const content = contents[i] || "";
        const imageUrl = await uploadImage(file.buffer, "homedeffers");
        defferData.push({ image: imageUrl, content });
      }
      item.deffer = defferData;
    }

    await item.save();
    res.status(200).json({
      success: true,
      message: "Home Deffer updated successfully",
      data: item
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Delete Home Deffer By ID
exports.deleteHomeDefferById = async (req, res) => {
  try {
    const item = await HomeDefferschems.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Home Deffer not found" });
    res.status(200).json({ success: true, message: "Home Deffer deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};


// POST: Create
exports.createHomeCourses = async (req, res) => {
  try {
    const { title, name, content } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image is required' });

    const imageUrl = await uploadImage(req.file.buffer);

    const homeCourses = await HomeCourses.create({ title, name, content, image: imageUrl });
    res.status(201).json({ message: 'Created successfully', data: homeCourses });
  } catch (error) {
    res.status(500).json({ message: 'Creation failed', error: error.message });
  }
};

// GET: All
exports.getAllHomeCourses = async (req, res) => {
  try {
    const data = await HomeCourses.find();
    res.status(200).json({ message: 'Fetched successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Fetch failed', error: error.message });
  }
};

// GET: By ID
exports.getHomeCoursesById = async (req, res) => {
  try {
    const data = await HomeCourses.findById(req.params.id);
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Fetched successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

// PUT: Update
exports.updateHomeCourses = async (req, res) => {
  try {
    const { title, name, content } = req.body;
    const updateData = { title, name, content };

    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer);
      updateData.image = imageUrl;
    }

    const updated = await HomeCourses.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });

    res.status(200).json({ message: 'Updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

// DELETE
exports.deleteHomeCourses = async (req, res) => {
  try {
    const deleted = await HomeCourses.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};
