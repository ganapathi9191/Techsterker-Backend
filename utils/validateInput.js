// utils/validateInput.js
module.exports.validateOtpRequest = (req, res, next) => {
  const { name, phoneNumber } = req.body;
  if (!name || !phoneNumber) {
    return res.status(400).json({ success: false, message: "Name and phone number required" });
  }
  next();
};

module.exports.validateOtpVerification = (req, res, next) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ success: false, message: "Phone number and OTP required" });
  }
  next();
};
