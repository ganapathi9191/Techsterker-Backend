const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file (PDF or image) to Cloudinary.
 * @param {string} filePath - Local file path.
 * @param {string} folderName - Cloudinary folder (default: uploads).
 * @param {string} fileName - File name to save as (default: original).
 */
const uploadToCloudinary = async (filePath, folderName = "uploads", fileName = "") => {
  try {
    const isPDF = fileName.toLowerCase().endsWith(".pdf") || filePath.toLowerCase().endsWith(".pdf");

    const options = {
      folder: folderName,
      public_id: fileName ? fileName.replace(".pdf", "") : undefined,
      resource_type: isPDF ? "raw" : "auto",  // ✅ raw for PDF, auto for others
      use_filename: true,
      unique_filename: false,
    };

    if (isPDF) {
      options.format = "pdf"; // ✅ Force PDF extension
    }

    const result = await cloudinary.uploader.upload(filePath, options);

    // ✅ Always return a .pdf URL
    return isPDF && !result.secure_url.endsWith(".pdf")
      ? result.secure_url + ".pdf"
      : result.secure_url;

  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    throw err;
  }
};

module.exports = { cloudinary, uploadToCloudinary };
