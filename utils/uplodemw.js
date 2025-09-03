const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Custom file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware to process dynamic fields
const processFormData = (req, res, next) => {
  // Parse JSON fields
  if (req.body.faq) {
    try {
      req.body.faq = JSON.parse(req.body.faq);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid FAQ format' });
    }
  }
  
  if (req.body.courseObject) {
    try {
      req.body.courseObject = JSON.parse(req.body.courseObject);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid courseObject format' });
    }
  }
  
  // Process features array
  if (req.body.featureCount) {
    const count = parseInt(req.body.featureCount);
    req.body.features = [];
    
    for (let i = 0; i < count; i++) {
      const feature = {
        title: req.body[`features[${i}][title]`]
      };
      
      // Find the corresponding file
      if (req.files) {
        const fileKey = `features[${i}][image]`;
        const file = req.files.find(f => f.fieldname === fileKey);
        if (file) {
          feature.image = file.path;
        }
      }
      
      req.body.features.push(feature);
    }
  }
  
  next();
};

module.exports = { upload, processFormData };