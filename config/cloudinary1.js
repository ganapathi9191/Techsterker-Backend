const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const streamifier = require("streamifier");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Choose resource type dynamically
function getResourceType(fileName = "") {
  if (fileName.toLowerCase().endsWith(".pdf")) {
    return "raw"; // Must be raw for PDFs
  }
  return "auto"; // auto works for images and videos
}


const uploadImage = (fileBuffer, folderName = "uploads", fileName = "") => {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(fileName);
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url); // This URL works for PDFs as well
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const uploadToCloudinary = async (fileBuffer, folderName = "uploads", fileName = "") => {
  try {
    return await uploadImage(fileBuffer, folderName, fileName || "");
  } catch (error) {
    throw error;
  }
};

const uploadImages = (fileBuffer, fileName = "") => {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(fileName);
    const stream = cloudinary.uploader.upload_stream(
      { folder: "uploads", resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const uploadToCloudinarys = async (filePath, folderName = "uploads") => {
  try {
    const resourceType = filePath.toLowerCase().endsWith(".pdf") ? "raw" : "auto";
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
      resource_type: resourceType,
    });
    return result.secure_url;
  } catch (error) {
    throw error;
  }
};

module.exports = { cloudinary, uploadImage, uploadToCloudinary, uploadImages, uploadToCloudinarys };
