const express = require("express");
const router = express.Router();
const multer = require("multer");
// Multer setup for memory storage (buffer upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });
const courseController = require('../controllers/courseController');
const homeScreenController = require("../controllers/homeScreenController");
const { validateOtpRequest, validateOtpVerification } = require("../utils/validateInput");




router.post("/hero-banners", upload.array("images"), homeScreenController.createOrUpdateHomeScreen);
router.get("/hero-banners", homeScreenController.getAllBanners);
router.get("/hero-banners/:bannerId", homeScreenController.getBannerById);
router.put("/hero-banners/:bannerId", upload.single("image"), homeScreenController.updateBannerById);
router.delete("/hero-banners/:bannerId", homeScreenController.deleteBannerById);





// CREATE (with image uploads)
router.post(
  "/home-features",
  upload.array("images"),
  homeScreenController.createHomeFeature
);

// READ ALL
router.get(
  "/home-features",
  homeScreenController.getAllHomeFeatures
);

// READ ONE BY ID
router.get(
  "/home-features/:id",
  homeScreenController.getHomeFeatureById
);

// UPDATE (with optional new images)
router.put(
  "/home-features/:id",
  upload.array("images"),
  homeScreenController.updateHomeFeature
);

// DELETE
router.delete(
  "/home-features/:id",
  homeScreenController.deleteHomeFeature
);






// CREATE (with optional image)
router.post(
  "/reviews",
  upload.single("image"),
  homeScreenController.createReview
);

// GET ALL
router.get(
  "/reviews",
  homeScreenController.getAllReviews
);

// GET BY ID
router.get(
  "/reviews/:id",
  homeScreenController.getReviewById
);

// UPDATE (with optional new image)
router.put(
  "/reviews/:id",
  upload.single("image"),
  homeScreenController.updateReview
);

// DELETE
router.delete(
  "/reviews/:id",
  homeScreenController.deleteReview
);






// CREATE (with at least one image)
router.post(
  "/clients",
  upload.array("images"), 
  homeScreenController.createClient
);

// READ ALL
router.get(
  "/clients",
  homeScreenController.getAllClients
);

// READ BY ID
router.get(
  "/clients/:id",
  homeScreenController.getClientById
);

// UPDATE (with optional new images)
router.put(
  "/clients/:id",
  upload.array("images"), 
  homeScreenController.updateClient
);

// DELETE
router.delete(
  "/clients/:id",
  homeScreenController.deleteClient
);






// Create
router.post("/count", homeScreenController.createCounter);

// Read
router.get("/counts", homeScreenController.getCounters);
router.get("/count/:id", homeScreenController.getCounterById);

// Update
router.put("/count/:id", homeScreenController.updateCounter);

// Delete
router.delete("/count/:id", homeScreenController.deleteCounter);







// Add Home Deffer
router.post(
  "/deffer",upload.any(),
  homeScreenController.addHomeDeffer
);

// Get All
router.get("/deffers", homeScreenController.getAllHomeDeffers);

// Get By ID
router.get("/deffer/:id", homeScreenController.getHomeDefferById);

// Update By ID
router.put(
  "/deffer/:id",upload.any(),
  homeScreenController.updateHomeDefferById
);

// Delete By ID
router.delete("/deffer/:id", homeScreenController.deleteHomeDefferById);






// ✅ Correct routing for HomeCourses
router.post('/Courses', upload.single('image'), homeScreenController.createHomeCourses);
router.get('/Courses', homeScreenController.getAllHomeCourses);
router.get('/Courses/:id', homeScreenController.getHomeCoursesById);
router.put('/Courses/:id', upload.single('image'), homeScreenController.updateHomeCourses);
router.delete('/Courses/:id', homeScreenController.deleteHomeCourses);






// Routes
router.post(
  "/courseController", upload.any(),
  courseController.createCourse
);
router.get("/courseController", courseController.getAllCourses);
router.get('/courseControllers', courseController.getAllCourses);
router.get('/courseController/:id', courseController.getCourseById);
router.get('/courseController/category/:category', courseController.getCourseByCategory);
router.put("/courseController/:id", upload.any(), courseController.updateCourseById);
router.delete('/courseController/:id', courseController.deleteCourseById);






router.post("/send-otp", validateOtpRequest, courseController.sendOtp);
router.post("/verify-otp", validateOtpVerification, courseController.verifyOtp);




router.post("/getintouch", courseController.addGetInTouch);
router.get("/getintouchs", courseController.getAllGetInTouch);
router.get("/getintouch/:id", courseController.getGetInTouchById);
router.put("/getintouch/:id", courseController.updateGetInTouchById);
router.delete("/getintouch/:id", courseController.deleteGetInTouchById);

router.post("/demo", homeScreenController.createDemo);         // Create
router.get("/demo", homeScreenController.getAllDemos);         // Get all
router.get("/demo/:id", homeScreenController.getDemoById);     // Get by ID
router.put("/demo/:id", homeScreenController.updateDemoById);  // Update by ID
router.delete("/demo/:id", homeScreenController.deleteDemoById);


module.exports = router;
