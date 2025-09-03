const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware'); // multer middleware

const contactus = require('../controllers/EnquiryController');
const doubtSessionController = require("../controllers/doubtSessionController");


router.post('/Enquiry', contactus.createEnquiry);
router.get('/Enquiry', contactus.getEnquiries);
router.get('/Enquiry/:id', contactus.getEnquiryById);
router.put('/Enquiry/:id', contactus.updateEnquiry);
router.delete('/Enquiry/:id', contactus.deleteEnquiry);

// ➕ Create doubt session
router.post("/doubtSession", upload.single("image"), doubtSessionController.createDoubtSession);

// 📖 Get all doubt sessions
router.get("/doubtSession", doubtSessionController.getAllDoubtSessions);

// 📖 Get a single doubt session by ID
router.get("/doubtSession/:id", doubtSessionController.getDoubtSessionById);

// ✏️ Update doubt session
router.put("/doubtSession/:id", upload.single("image"), doubtSessionController.updateDoubtSession);

// ❌ Delete doubt session
router.delete("/doubtSession/:id", doubtSessionController.deleteDoubtSession);



router.post("/contactus", contactus.addEnquiry);
router.get("/contactus", contactus.getAllEnquiries);
router.get("/contactus/:id", contactus.getcontactenqById);
router.put("/contactus/:id", contactus.updateEnquiryById);
router.delete("/contactus/:id", contactus.deleteEnquiryById);


module.exports = router;
