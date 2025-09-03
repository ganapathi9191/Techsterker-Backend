const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createFAQ, getAllFAQs, getFAQById, updateFAQ, deleteFAQ } = require("../controllers/faqController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.post("/faq", upload.single("image"), createFAQ);
router.get("/faq", getAllFAQs);
router.get("/faq/:id", getFAQById);
router.put("/faq/:id", upload.single("image"), updateFAQ);
router.delete("/:id", deleteFAQ);

module.exports = router;
