const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware'); // multer middleware
const {
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
  deleteTechnicalTeam,

} = require("../controllers/AboutUsController");
const upcomingBatchController = require("../controllers/upcomingBatchController");

// ==============================
// 🔹 ABOUT ROUTES
// ==============================

// 📌 POST - Create About
// Form-data: title1, content1, image1 (file)
router.post("/about", upload.single("image1"), createAbout);

// 📌 GET - Get About
router.get("/about", getAbout);

// 📌 PUT - Update About
// Form-data: title1, content1, image1 (file)
router.put("/about/:id", upload.single("image1"), updateAbout);

// 📌 DELETE - Delete About
router.delete("/about/:id", deleteAbout);

// ==============================
// 🔹 LEADERSHIP ROUTES
// ==============================

// 📌 POST - Create Leadership Member
// Form-data: name, role, content, image (file)
router.post('/leadership', upload.single('image'), createLeadership);

// 📌 GET - Get All Leadership
router.get('/leadership', getLeadership);

// 📌 PUT - Update Leadership by ID
// Form-data: name, role, content, image (file)
router.put('/leadership/:id', upload.single('image'), updateLeadership);

// 📌 DELETE - Delete Leadership by ID
router.delete('/leadership/:id', deleteLeadership);

router.post("/technical-team", upload.single("image2"), createTechnicalTeam);
router.get("/technical-team", getAllTechnicalTeam);
router.get('/technical-team/:id', getTechnicalTeamById);
router.put("/technical-team/:id", upload.single("image2"), updateTechnicalTeam );
router.delete("/technical-team/:id", deleteTechnicalTeam);




router.post("/upcomingBatch", upcomingBatchController.createUpcomingBatch);
router.get("/upcomingBatch", upcomingBatchController.getAllUpcomingBatches);
router.get("/upcomingBatch/categorie/:categorie", upcomingBatchController.getBatchesByCategorie);
router.get("/upcomingBatch/:batchId", upcomingBatchController.getSingleBatchByIdOnly);

router.get("/upcomingBatch/:id", upcomingBatchController.getUpcomingBatchById);
router.put("/upcomingBatch/:id", upcomingBatchController.updateUpcomingBatch);
router.delete("/upcomingBatch/:id", upcomingBatchController.deleteUpcomingBatch);



// Add Abroad Student
router.post("/abrodstudents", upload.any(), upcomingBatchController.addAbrodStudent);
router.get("/abrodstudents", upcomingBatchController.getAllAbrodStudents);
router.get("/abrodstudents/:id", upcomingBatchController.getAbrodStudentById);
router.put("/abrodstudents/:id", upload.any(), upcomingBatchController.updateAbrodStudentById);
router.delete("/abrodstudents/:id", upcomingBatchController.deleteAbrodStudentById);



module.exports = router;
