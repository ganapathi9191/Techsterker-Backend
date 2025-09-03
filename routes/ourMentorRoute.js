const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const mentorController = require("../controllers/ourMentorsController");

// REGISTER & LOGIN
router.post('/mentor/register', mentorController.registerMentor);
router.post('/mentor/login', mentorController.loginMentor);

// READ
router.get('/mentors', mentorController.getAll);
router.get('/mentor/:id', mentorController.getById);

// UPDATE
router.put('/mentor/:id', mentorController.update);

// DELETE
router.delete('/mentor/:id', mentorController.delete);


// 🔥 EXPERIENCE ROUTES - define FIRST to avoid :id conflicts
router.post("/experience", upload.single("image"), mentorController.createMentorExperience);
router.get("/experience", mentorController.getAllMentorExperiences);
router.get("/experience/:id", mentorController.getMentorExperienceById);
router.put("/experience/:id", upload.single("image"), mentorController.updateMentorExperience);
router.delete("/experience/:id", mentorController.deleteMentorExperience);

// 🔧 OUR MENTOR ROUTES - define AFTER specific routes
router.post("/Mentor", upload.single("image"), mentorController.createMentor);
router.get("/Mentor", mentorController.getAllMentors);
router.get("/Mentor/:id", mentorController.getMentorById);
router.put("/Mentor/:id", upload.single("image"), mentorController.updateMentor);
router.delete("/Mentor/:id", mentorController.deleteMentor);

module.exports = router;
