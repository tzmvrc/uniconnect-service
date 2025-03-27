/** @format */

const UserModel = require("../models/users_model");
const Forum = require("../models/forums_model");
const OTP = require("../models/otp_model");
const SchoolModel = require("../models/schools_model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { forgotPasswordOtp, sendOTPEmail } = require("./OTP_controller");

//Owner user
const getUserInfo = async (req, res) => {
  const userId = req.user.userId;

  try {
    const isUser = await UserModel.findById(userId).populate(
      "school_id",
      "school_name"
    );

    if (!isUser) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    if (isUser.isDeleted) {
      return res.status(403).json({
        error: true,
        message: "This account has been deleted.",
      });
    }

    return res.json({
      user: {
        FirstName: isUser.first_name,
        LastName: isUser.last_name,
        Email: isUser.email,
        Username: isUser.username,
        Points: isUser.points,
        Topics: isUser.topics,
        School: isUser.school_id ? isUser.school_id.school_name : null,
        _id: isUser._id,
        createdOn: isUser.createdOn,
        hasBadge: isUser.has_badge,
      },
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
};

//Other user
const getOtherUserInfo = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await UserModel.findOne({ username })
      .populate("school_id", "school_name")
      .lean()
      .exec();

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        error: true,
        message: "This account has been deleted.",
      });
    }

    // Fetch additional forums created by the user
    const forums = await getForumsByUser(user._id);

    return res.json({
      user: {
        FirstName: user.first_name,
        LastName: user.last_name,
        Email: user.email,
        Username: user.username,
        Points: user.points,
        Topics: user.topics,
        School: user.school_id ? user.school_id.school_name : null,
        createdOn: user.createdOn,
        hasBadge: user.has_badge,
        Forums: forums,
      },
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
};

const getForumsByUser = async (userId) => {
  try {
    const forums = await Forum.find({ created_by: userId, isArchived: false })
      .select("title description createdAt")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return forums;
  } catch (error) {
    console.error("Error fetching forums:", error);
    return [];
  }
};

// Signup function
const signup = async (req, res) => {
  try {
    const { school_name, first_name, last_name, username, password, email } =
      req.body;

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        successful: false,
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character.",
      });
    }

    // Check if the school exists
    const school = await SchoolModel.findOne({ school_name });

    // Check if email or username already exists, excluding soft-deleted users
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
      isDeleted: { $ne: true }, // Exclude soft-deleted users
    });

    if (existingUser) {
      return res.status(400).json({
        successful: false,
        message:
          existingUser.email === email
            ? "Email already exists. Login Instead."
            : "Username already exists.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new UserModel({
      school_id: school._id,
      first_name,
      last_name,
      username,
      password: hashedPassword,
      email,
      isDeleted: false, // Ensure new users start as active
    });

    await newUser.save();
    await sendOTPEmail({ email });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7h" }
    );

    return res.status(201).json({
      successful: true,
      newUser,
      message: "Account created successfully.",
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

const checkIfVerified = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await UserModel.findOne({ email });
    if (user.isVerified) {
      return res.status(200).send({
        successful: true,
        message: "Email is verified.",
      });
    }
    return res.status(200).json({
      successful: false,
      message: "Email is not verified.",
    });
  } catch (error) {
    return res.status(200).json({
      successful: false,
      message: "Server error.",
    });
  }
};

const checkUserBadge = async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res
      .status(400)
      .json({ error: true, message: "Username is required" });
  }

  try {
    const user = await UserModel.findOne({ username }).select("has_badge");

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    return res.json({
      username: username,
      hasBadge: user.has_badge,
      message: "Badge status retrieved successfully",
    });
  } catch (error) {
    console.error("Error checking user badge:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        successful: false,
        message: "Email and password are required",
      });
    }

    // Find only users where isDeleted is explicitly false
    const user = await UserModel.findOne({ email, isDeleted: false });

    if (!user) {
      return res.status(404).send({
        successful: false,
        message: "User not found or has been deleted.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({
        successful: false,
        message: "Incorrect password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7h" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET
    );

    return res.status(200).send({
      successful: true,
      message: "Login successful.",
      token,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};


// Forgot Password function
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email exists in the database
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        successful: false,
        message: "Email not found. Please check your email and try again.",
      });
    }

    // Delete any existing OTP for this email before sending a new one
    await OTP.deleteMany({ email });

    // Send OTP
    const otpResponse = await forgotPasswordOtp({ email });

    if (otpResponse.status) {
      return res.status(200).json({
        successful: true,
        message: "OTP sent successfully. Please check your email.",
      });
    } else {
      return res.status(500).json({
        successful: false,
        message: otpResponse.message || "Failed to send OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("OTP error:", error);
    return res.status(500).json({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

const updateUserPass = async (req, res) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        successful: false,
        message: "Current password and new password are required.",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        successful: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        successful: false,
        message: "Current password is incorrect.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        successful: false,
        message: "New password cannot be the same as the current password.",
      });
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        successful: false,
        message:
          "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      successful: true,
      message: "Password has been updated successfully.",
    });
  } catch (error) {
    console.error("Update password error:", error);
    return res.status(500).json({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// Reset Password function
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email?.trim() || !newPassword?.trim() || !confirmPassword?.trim()) {
      return res.status(400).send({
        successful: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        successful: false,
        message: "Passwords do not match.",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).send({
        successful: false,
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character.",
      });
    }

    const user = await UserModel.findOne({ email: email.trim() });

    if (!user) {
      return res.status(404).send({
        successful: false,
        message: "User not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).send({
      successful: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).send({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

const getSavedForums = async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming req.user contains the authenticated user
    const user = await UserModel.findById(userId).populate({
      path: "savedForums",
      match: { isArchived: false },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ savedForums: user.savedForums.map((forum) => forum._id) });
  } catch (error) {
    console.error("Error fetching saved forums:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getForumVotes = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    const forum = await Forum.findById(forum_id);
    if (!forum) return res.status(404).json({ message: "Forum not found" });

    const hasLiked = forum.liked_by.includes(userId);
    const hasDisliked = forum.disliked_by.includes(userId);

    res.json({ isLiked: hasLiked, isDisliked: hasDisliked });
  } catch (error) {
    console.error("Error fetching vote status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        successful: false,
        message: "Refresh token is required",
      });
    }

    // Check if the token was invalidated during logout
    if (isTokenInvalid(refreshToken)) {
      return res.status(401).json({
        successful: false,
        message: "Invalid refresh token. Please log in again.",
      });
    }

    // Verify the refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) {
          return res.status(403).json({
            successful: false,
            message: "Invalid or expired refresh token",
          });
        }

        // Generate new access token
        const accessToken = jwt.sign(
          { userId: decoded.userId, email: decoded.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        return res.status(200).json({
          successful: true,
          accessToken,
        });
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

const editUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name, username, email } = req.body;

    const updateFields = {};

    // ✅ Username: check uniqueness (case-insensitive)
    if (username) {
      const normalizedUsername = username.toLowerCase();

      const existingUser = await UserModel.findOne({
        $and: [
          { username: { $regex: `^${normalizedUsername}$`, $options: "i" } },
          { _id: { $ne: userId } },
        ],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username is already in use.",
        });
      }

      updateFields.username = normalizedUsername;
    }

    // ✅ Name fields
    if (first_name) updateFields.first_name = first_name;
    if (last_name) updateFields.last_name = last_name;

    // ✅ Email update + auto-assign school (no strict validation anymore)
    if (email) {
      updateFields.email = email;

      const allSchools = await SchoolModel.find();

      const matchedSchool = allSchools.find((school) =>
        email.toLowerCase().includes(school.email_domain.toLowerCase())
      );

      if (matchedSchool) {
        updateFields.school_id = matchedSchool._id;
      }
    }

    // ✅ No update fields provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    // ✅ Perform update
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Edit user profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error. Please try again later.",
    });
  }
};

const deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete your account.",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "This account has already been deleted.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Account deletion failed.",
      });
    }

    user.isDeleted = true;

    // Optionally remove sensitive data
    //user.email = `deleted_${Date.now()}@example.com`; // Replace email with a dummy value
    user.username = `deleted_user_${Date.now()}`; // Replace username
    // user.password = undefined; // Clear the password
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your account has been successfully deleted.",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

module.exports = {
  getUserInfo,
  signup,
  login,
  forgotPassword,
  resetPassword,
  checkIfVerified,
  checkUserBadge,
  updateUserPass,
  getSavedForums,
  getForumVotes,
  refreshAccessToken,
  editUserProfile,
  getOtherUserInfo,
  deleteOwnAccount,
};
