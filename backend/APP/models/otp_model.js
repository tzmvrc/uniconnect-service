const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const OTPSchema = new Schema(
  {
  

  email: {
    type: String,
    required: [true, "email is required"],
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    
  },
  expiresAt: {
    type: Date,
  }
  },
);

const otps = mongoose.model("otps", OTPSchema);

module.exports = otps;
