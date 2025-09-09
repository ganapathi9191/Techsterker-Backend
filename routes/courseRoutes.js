const express = require('express');
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const enrollmentController = require('../controllers/enrollmentController');

// Enrollment routes
router.post('/enrollments', enrollmentController.createEnrollment);
router.get('/enrollments', enrollmentController.getAllEnrollments);
router.get("/enrollment/:id", enrollmentController.getEnrollmentById);
router.put('/enrollments/:id', enrollmentController.updateEnrolledByUserId);
router.delete('/enrollments/:id', enrollmentController.deleteEnrollmentById);

// User enrollment routes
router.post('/enrollments/add-user', enrollmentController.addEnrollmentToUser);
router.get('/user/:userId/enrollments', enrollmentController.getEnrollmentsByUserId);

// Mentor enrollment routes
// ➕ Add mentor to enrollment
router.post('/mentor/enrollment/add', enrollmentController.addMentorToEnrollment);

// 🗑️ Remove mentor from enrollment
router.post('/mentor/enrollment/remove', enrollmentController.removeMentorFromEnrollment);// 📋 Get all enrollments for a specific mentor
router.get('/mentor/:mentorId/enrollments', enrollmentController.getEnrollmentsByMentorId);
router.get('/enrollment/:enrollmentId/mentors', enrollmentController.getEnrollmentMentors);

// 👥 Get all mentors with their batch information
router.get('/mentors/with-batches', enrollmentController.getAllMentorsWithBatches);
router.get('/mentor/:mentorId/details', enrollmentController.getMentorWithDetailedBatches);



// Create certificates for all users in enrollment (single file applies to all)
router.post('/certificate', upload.single('certificateFile'), enrollmentController.createCertificate);

// Get all certificates
router.get('/certificates', enrollmentController.getAllCertificates);

// Get certificates by user ID
router.get('/certificate/user/:userId', enrollmentController.getCertificatesByUserId);

// Get certificates by enrolledId
router.get('/certificate/enrolled/:enrolledId', enrollmentController.getCertificatesByEnrolledId);

// Update certificate by ID (file and/or status)
router.put('/certificate/:id', enrollmentController.updateCertificateById);

// Update all certificates for a user by status
router.put('/certificate/user/:userId/status', enrollmentController.updateCertificateStatusByUserId);

// Update all certificates for an enrollment by status
router.put('/certificate/enrolled/:enrolledId/status', enrollmentController.updateCertificateStatusByEnrolledId);

// Update certificate status
router.put('/certificate/:id/status', enrollmentController.updateCertificateStatus);

// Delete certificate
router.delete('/certificate/:id', enrollmentController.deleteCertificate);



// Routes
router.post("/OurCertificate", upload.single("certificateImage"), enrollmentController.createCertificate);
router.get("/OurCertificates", enrollmentController.getAllCertificates);
router.get("/OurCertificate/:id", enrollmentController.getCertificateById);
router.put("/OurCertificate/:id", upload.single("certificateImage"), enrollmentController.updateCertificate);
router.delete("/OurCertificate/:id", enrollmentController.deleteCertificate);



// Routes
router.post("/community", enrollmentController.createCommunity);
router.get("/communitys", enrollmentController.getAllCommunities);
router.get("/community/:id", enrollmentController.getCommunityById);
router.put("/community/:id", enrollmentController.updateCommunity);
router.delete("/community/:id", enrollmentController.deleteCommunity);




module.exports = router;