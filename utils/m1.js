const multer = require("multer");

// Memory storage for buffer uploads (suitable for Cloudinary)
const storage = multer.memoryStorage();

// Only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Configure multer with limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max per file
  }
});

module.exports = upload;
