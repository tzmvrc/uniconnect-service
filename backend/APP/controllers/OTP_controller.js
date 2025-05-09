/** @format */

require("dotenv").config();
const OTP = require("../models/otp_model");
const School = require("../models/schools_model");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/users_model");
const TokenModel = require("../models/token_model");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

// Verify transporter
transporter.verify((error) => {
  if (error) {
    console.error("❌ Transporter Error:", error);
  } else {
    console.log("✅ Transporter Ready to Send Emails");
  }
});

// Generate a 6-digit OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Send OTP Email
const sendOTPEmail = async ({ email }) => {
  try {
    const otpValue = generateOTP();
    console.log(`📨 Sending OTP to: ${email}`);

    const hashedOtp = await bcrypt.hash(otpValue, 10);
    const newOtp = new OTP({
      email,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await newOtp.save();

    await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Uniconnect Verification Code",
      text: `Your verification code is: ${otpValue} This code is valid for 5 minutes. Use this code to verify your account.`,
    });

    console.log(`✅ OTP sent successfully to ${email}`);

    return { status: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return { status: false, message: "Error sending OTP", error };
  }
};

// controller/sendOtpWithSchoolValidation.js
const sendOtpWithSchoolValidation = async (req, res) => {
  try {
    const { email, oldEmail } = req.body;

    // Basic email format check
    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const allSchools = await School.find();
    const matchedSchool = allSchools.find((school) =>
      email.toLowerCase().includes(school.email_domain.toLowerCase())
    );

    if (!matchedSchool) {
      return res.status(400).json({
        success: false,
        message: "Email must be associated with a registered school.",
      });
    }
    // ✅ Delete existing OTPs for this email (cleanup)
    await OTP.deleteMany({ email: oldEmail });

    // ✅ Generate and hash new OTP
    const otpValue = generateOTP();
    const hashedOtp = await bcrypt.hash(otpValue, 10);

    const newOtp = new OTP({
      email: oldEmail,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await newOtp.save();

    // ✅ Send the OTP email
    await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: oldEmail,
      subject: "Uniconnect Change Email Verification Code",
      text: `Your verification code is: ${otpValue}. This code is valid for 5 minutes. Use this code to verify your account.`,
    });

    console.log(`✅ OTP sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error("❌ sendOtpWithSchoolValidation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

const generateAndSendOTP = async (email, callback) => {
  try {
    if (!email) {
      console.error("Error: Email is required for OTP generation.");
      return callback({ status: false, message: "Email is required." });
    }

    console.log("Generating OTP for:", email);
    const otp = generateOTP();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5); // OTP expires in 5 minutes

    console.log("Generated OTP:", otp);

    // Save OTP in the database with expiration time
    await OTP.create({ email, otp, expiresAt: expirationTime });

    console.log("✅ OTP stored in DB successfully");

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp);
      console.log("📧 OTP sent via email successfully");
      return callback({ status: true, message: "OTP sent successfully" });
    } catch (emailError) {
      console.error("❌ Email Sending Error:", emailError);
      return callback({
        status: false,
        message: "Failed to send OTP email. Try again later.",
      });
    }
  } catch (error) {
    console.error("Error generating OTP:", error);
    callback({
      status: false,
      message: "Error generating OTP",
      error: error.message,
    });
    console.error("🚨 Unexpected Error:", error);
    return callback({
      status: false,
      message: `Unexpected error: ${error.message}`,
    });
  }
};

const forgotPasswordOtp = async ({ email }) => {
  try {
    // Check if email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return {
        status: false,
        message: "Email not found. Please sign up first.",
      };
    }

    // Delete any existing OTP for this email
    await OTP.deleteOne({ email });

    // Generate new OTP
    const otpValue = generateOTP();
    console.log(`📨 Sending OTP to: ${email}`);

    // Hash the OTP
    const hashedOtp = await bcrypt.hash(otpValue, 10);

    // Save new OTP
    const newOtp = new OTP({
      email,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await newOtp.save();

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Uniconnect Forgot Password Code",
      text: `Your verification code is: ${otpValue}. This code is valid for 5 minutes. Use this code to verify your email.`,
    });

    console.log(`✅ OTP sent successfully to ${email}`);

    return { status: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return { status: false, message: "Error sending OTP", error };
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp, purpose } = req.body; // Added purpose

  if (!otp || !email) {
    return res
      .status(400)
      .json({ error: true, message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: true, message: "User not found" });
    }

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        error: true,
        message: "OTP not found, expired, or already verified",
      });
    }

    if (otpRecord.expiresAt < Date.now()) {
      await OTP.deleteOne({ email: email });
      return res
        .status(400)
        .json({ error: true, message: "OTP expired, request a new one" });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return res
        .status(400)
        .json({ error: true, message: "Incorrect Code, Try Again" });
    }

    // ✅ Mark user as verified
    await User.updateOne({ email }, { isVerified: true });

    // ✅ Delete OTP record after successful verification
    await OTP.deleteOne({ email });

    // ✅ Skip token generation if purpose is "forgot"
    if (purpose === "forgot") {
      return res.json({
        error: false,
        message: "OTP verified for password reset",
      });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7h" }
    );

    // Save or update token in separate token DB
   await TokenModel.findOneAndUpdate(
     { userId: user._id },
     { token, email: user.email },
     { upsert: true, new: true }
   );

    // Set token as HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 7 * 60 * 60 * 1000, // 7 hours
    });

    return res.json({
      error: false,
      message: "OTP verified, account is now active",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json({ error: true, message: "Server error during OTP verification" });
  }
};


const resendOTP = async (req, res) => {
  const { email } = req.body; // Extract userId from params
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: true, message: "User not found" });
    }

    // 🗑 Delete any existing OTP for the user
    await OTP.deleteOne({ email });

    // 🔢 Generate a new 6-digit OTP
    const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;

    // 🔒 Hash the new OTP before storing
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otpCode, saltRounds);

    // 📌 Save the new OTP to the database
    const newOtpVerification = new OTP({
      email,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await newOtpVerification.save();

    // 📧 Send the new OTP via email
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "New Verification Code",
      text: `Your new verification code is: ${otpCode}`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: "A new OTP has been sent to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res
      .status(500)
      .json({ error: true, message: "Server error during OTP resend" });
  }
};



module.exports = {
  generateAndSendOTP,
  sendOtpWithSchoolValidation,
  forgotPasswordOtp,
  verifyOTP,
  sendOTPEmail,
  resendOTP,
};
