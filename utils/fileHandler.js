const { IncomingForm } = require('formidable');
const fs = require('fs');
const path = require('path');

const processFiles = (req, res, next) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  const form = new IncomingForm({
    keepExtensions: true,
    multiples: true,
    uploadDir: path.join(__dirname, '../temp_uploads') // Create this directory
  });

  // Ensure temp directory exists
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir);
  }

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error parsing form data' 
      });
    }

    // Convert files to consistent format
    const processedFiles = {};
    Object.entries(files).forEach(([fieldName, fileArray]) => {
      processedFiles[fieldName] = fileArray.map(file => ({
        originalname: file.originalFilename,
        path: file.filepath,
        mimetype: file.mimetype,
        size: file.size
      }));
    });

    req.body = fields.data ? JSON.parse(fields.data) : {};
    req.files = processedFiles;
    next();
  });
};

module.exports = { processFiles };