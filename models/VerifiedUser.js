const mongoose = require("mongoose");

const verifiedUserSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
    },
    otp: {
      type: String,
    },
    verifyStatus: {
      type: Boolean,
      default: false, // Default to false, meaning unverified
    },
  },
  { timestamps: true }
);

const VerifiedUser = mongoose.model("VerifiedUser", verifiedUserSchema);

module.exports = VerifiedUser;
