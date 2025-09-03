const multer = require("multer");

const storage = multer.memoryStorage(); // For buffer upload
const upload = multer({ storage });

module.exports = upload;
