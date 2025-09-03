const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent
} = require("../controllers/ContentController")

router.post("/content", upload.single("image"), createContent);               // POST
router.get("/content", getAllContent);                                       // GET ALL
router.get("/content/:id", getContentById);                                  // GET BY ID
router.put("/content/:id", upload.single("image"), updateContent);          // PUT
router.delete("/content/:id", deleteContent);                                // DELETE

module.exports = router;
