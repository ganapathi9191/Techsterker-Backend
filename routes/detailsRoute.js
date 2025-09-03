const express = require('express');
const router = express.Router();
const controller = require('../controllers/detailsController');
const upload = require('../utils/uploadMiddleware');


// ===== ContactDetails =====
// Routes
router.post("/contact-details", upload.single("logoimage"), controller.createContact);
router.get("/contact-details", controller.getAllContacts);
router.get("/contact-details/:id", controller.getContactById);
router.put("/contact-details/:id", upload.single("logoimage"), controller.updateContact);
router.delete("/contact-details/:id", controller.deleteContact);
// ===== SocialMedia =====
router.post('/social-media', controller.createSocialMedia);
router.get('/social-media', controller.getAllSocialMedia);
router.get('/social-media/:id', controller.getSocialMediaById);
router.put('/social-media/:id', controller.updateSocialMedia);
router.delete('/social-media/:id', controller.deleteSocialMedia);

module.exports = router;
