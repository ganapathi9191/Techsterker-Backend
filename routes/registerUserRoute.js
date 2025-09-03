const express = require('express');
const router = express.Router();
const users= require('../controllers/registerUserController');
const liveClassController = require("../controllers/liveClassController");


router.post('/userregister',users.register);
router.post('/userlogin', users.login);
// Read
router.get('/userregister', users.getAllUsers);
router.get('/userregister/:id', users.getUserById);

// Update
router.put('/userregister/:id',users.updateUser);

// Delete
router.delete('/userregister/:id', users.deleteUser);

// POST: Add recommended courses
router.post('/recommend-courses', users.addRecommendedCourses);

// GET: Get recommended courses for a user
router.get('/recommend-courses/:userId', users.getRecommendedCourses);



// ➕ CREATE LIVE CLASS
router.post('/liveclass', liveClassController.createLiveClass);
router.get('/liveclass', liveClassController.getAllLiveClasses);
router.get('/liveclass/:id', liveClassController.getLiveClassById);
router.put('/liveclass/:id', liveClassController.updateLiveClassById);
router.delete('/liveclass/:id', liveClassController.deleteLiveClassById);

// Additional routes
router.get('/liveclass/mentor/:mentorId', liveClassController.getLiveClassesByMentorId);
router.get('/liveclass/enrollment/:enrollmentId', liveClassController.getLiveClassesByEnrollmentId);
router.get('/live-classes/user/:userId', liveClassController.getLiveClassesByUserId);


module.exports = router;
