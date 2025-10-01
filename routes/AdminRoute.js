const express = require('express');
const { registerAdmin, loginAdmin } = require('../controllers/AdminController'); 
const router = express.Router();

// Admin registration route
router.post('/register', registerAdmin);

// Admin login route
router.post('/login', loginAdmin);
router.post('/registeruserbyadmin', registerAdmin);

module.exports = router;
