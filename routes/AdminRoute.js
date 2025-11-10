const express = require('express');
const { registerAdmin, loginAdmin, createChatGroup, sendMessage, getAllChatGroups } = require('../controllers/AdminController'); 
const router = express.Router();

// Admin registration route
router.post('/register', registerAdmin);

// Admin login route
router.post('/login', loginAdmin);
router.post('/registeruserbyadmin', registerAdmin);

// Create a new group (POST)
router.post('/create', createChatGroup);

// Send message in a group (POST)
router.post('/message', sendMessage);
router.get('/getallgroups', getAllChatGroups);

module.exports = router;
