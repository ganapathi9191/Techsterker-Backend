const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');

// CREATE INTERVIEW based on enrolledId (auto-links to user)
router.post('/add-interview', interviewController.createInterview);
// GET ALL INTERVIEWS
router.get('/interviews', interviewController.getAllInterviews);

// GET INTERVIEW BY ID
router.get('/interview/:id', interviewController.getInterviewById);

// GET INTERVIEWS BY ENROLLED ID
router.get('/interview/enrolled/:enrolledId', interviewController.getInterviewsByEnrolledId);

// GET INTERVIEWS BY USER ID
router.get('/interview/user/:userId', interviewController.getInterviewsByUserId);

// UPDATE INTERVIEW BY ID
router.put('/interview/:id', interviewController.updateInterviewById);

// DELETE INTERVIEW BY ID
router.delete('/interview/:id', interviewController.deleteInterviewById);



module.exports = router;
