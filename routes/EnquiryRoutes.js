const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware'); // multer middleware

const contactus = require('../controllers/EnquiryController');
const doubtSessionController = require("../controllers/doubtSessionController");
const form=require('../controllers/formController');

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


// Create (with resume)
router.post("/apply", upload.single("resume"), contactus.createApply);

// Read all
router.get("/apply", contactus.getAllApplies);

// Read one
router.get("/apply/:id", contactus.getApplyById);

// Update (optional resume re-upload)
router.put("/apply/:id", upload.single("resume"), contactus.updateApplyById);

// Delete
router.delete("/apply/:id", contactus.deleteApply);


router.post("/form", form.createForm);               // Create
router.get("/forms", form.getAllForms);               // Get All
router.get("/form/:id", form.getFormById);            // Get By ID
router.put("/form/:id", form.updateFormById);         // Update By ID
router.delete("/form/:id", form.deleteFormById);      // Delete By ID


// formId in params, mobile in body
router.post("/generate/:formId", form.generateOtp);
router.post("/verify/:formId", form.verifyOtp);


router.post("/payment-create", form.createPayment);
router.post("/payment-update", form.updatePaymentStatus);


module.exports = router;
