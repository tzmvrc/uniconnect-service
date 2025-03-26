const express = require("express");
const router = express.Router();
const {
  verifyOTP,
  sendOTPEmail,
  resendOTP,
  sendOtpWithSchoolValidation,
} = require("../controllers/OTP_controller");

//router - VARIABLE USED TO HOLD THE ROUTER OBJECT
//post - HTTP METHOD OF THE API.
//PARAMETER ARGUMENTS SHOULD BE THE ENDPOINT, AND THE CONTROLLER
router.post("/verify-otp", verifyOTP);
router.put("/resend-otp", resendOTP);
router.post("/send-otp", sendOtpWithSchoolValidation);
//http://localhost:8000/users/1
//TAKE NOTE: MULTIPLE ROUTERS WITH SAME ENDPOINTS ARE ALLOWED ONLY IF THE HTTP METHODS ARE DIFFERENT FOR EACH.

//EXPORTS THE ROUTER OBJECT.
module.exports = router;