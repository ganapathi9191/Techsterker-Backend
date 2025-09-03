const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // memory storage
const courseModuleController = require("../controllers/coursemodulecontroller");

router.post("/course-modules", upload.array("files"), courseModuleController.createCourseModule);
// Get all course modules
router.get("/course-modules", courseModuleController.getAllCourseModules);

// Get course module by ID
router.get("/course-modules/:id", courseModuleController.getCourseModuleById);

// Get course modules by enrolledId
router.get("/course-modules/enrolled/:enrolledId", courseModuleController.getCourseModulesByEnrolledId);

// Get course modules by userId
router.get("/course-modules/user/:userId", courseModuleController.getCourseModulesByUserId);

// Update course module by ID
router.put("/course-modules/:id", upload.array("files"), courseModuleController.updateCourseModuleById);

router.put("/course-modules/:moduleId/topics/:topicIndex/lessons/:lessonIndex", courseModuleController.updateLessonInModule);

// Delete course module by ID
router.delete("/course-modules/:id", courseModuleController.deleteCourseModuleById);

module.exports = router;
