/** @format */

const UserModel = require("../models/users_model");
const Forum = require("../models/forums_model");
const OTP = require("../models/otp_model");
const SchoolModel = require("../models/schools_model");
const TokenModel = require("../models/token_model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { forgotPasswordOtp, sendOTPEmail } = require("./OTP_controller");
const {
  uploadProfileImage,
  deleteImage,
} = require("../../cloudinary/cloudinary");

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
        profile_picture: isUser.profilePicture || null,
      },
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
};

const searchUser = async (req, res) => {
  const { username } = req.query;

  try {
    const users = await UserModel.find({
      $or: [
        { username: { $regex: username, $options: "i" } },
        { first_name: { $regex: username, $options: "i" } },
        { last_name: { $regex: username, $options: "i" } },
      ],
      isDeleted: false,
    }).populate("school_id", "school_name");

    const usersWithForumCount = await Promise.all(
      users.map(async (user) => {
        const forumCount = await Forum.countDocuments({
          created_by: user._id,
          isArchived: false,
          public: true,
        });

        return {
          ...user.toObject(),
          forumCount,
        };
      })
    );

    res.json({ success: true, users: usersWithForumCount });
  } catch (err) {
    console.error("Error searching for users:", err);
    res
      .status(500)
      .json({ success: false, message: "Error searching for users" });
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
        ProfilePicture: user.profilePicture || null,
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

    // Check if email or username already exists
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
      isVerified: false, // ✅ Ensure field exists
      isDeleted: false,
    });

    await newUser.save();
    await sendOTPEmail({ email });

    return res.status(201).json({
      successful: true,
      message: "Account created successfully. Please verify your email.",
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

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(403).send({
        successful: false,
        message: "Account not verified. Please verify your email first.",
      });
    }

    // Generate JWT token since the user is verified
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

    return res.status(200).send({
      successful: true,
      message: "Login successful.",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send({
      successful: false,
      message: "An error occurred. Please try again later.",
    });
  }
};


const logout = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (token) {
      // Decode token to get userId
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      // Delete token from DB
      await TokenModel.findOneAndDelete({ userId: decoded.userId });
    }

    // Clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });

    return res.status(200).json({
      successful: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      successful: false,
      message: "Something went wrong during logout.",
    });
  }
};


const checkAuth = (req, res) => {
   let token = req.cookies?.token;
  if (!token) return res.status(401).json({ successful: false, message: "Unauthorized" });

  return res.status(200).json({ successful: true, message: "Authorized" });


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
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).send({
        successful: false,
        message: "Email and password are required.",
      });
    }

    const user = await UserModel.findOne({ email: email.trim() });

    if (!user) {
      return res.status(404).send({
        successful: false,
        message: "User not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
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

    // Soft delete account
    user.isDeleted = true;
    user.email = `deleted@Uniconnect.com`;
    user.first_name = "USER";
    user.last_name = "DELETED";
    user.username = `Deleted_User`;
    user.profilePicture = "https://res.cloudinary.com/dlbclsvt5/image/upload/v1746791437/profile-picture/profile-pictures/681da3e13f35169ff3c1a102_1746791435175_avatar.png";
    await user.save();

    // Remove token from DB (if using a token model)
    await TokenModel.findOneAndDelete({ userId });

    // Clear auth cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    });

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


const uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file provided",
    });
  }

  try {
    const userId = req.user.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔍 Log the existing profile picture ID
    console.log(
      `🗑️ Deleting old profile picture: ${user.profilePicturePublicId}`
    );

    // Delete old image if it exists
    if (user.profilePicturePublicId) {
      await deleteImage(user.profilePicturePublicId);
      console.log(
        `✅ deleteImage() was called for: ${user.profilePicturePublicId}`
      );
    } else {
      console.log("⚠️ No old profile picture found, skipping deletion.");
    }

    // Correctly extract the new public ID
    const imageUrl = req.file.path; // Cloudinary URL
    let publicId = imageUrl // 🔹 Change `const` to `let`
      .split("/")
      .slice(-2)
      .join("/")
      .replace(/\.[^.]+$/, ""); // Extract without file extension

    publicId = decodeURIComponent(publicId); // ✅ Now reassignment is allowed

    // Save to the database
    user.profilePicture = imageUrl;
    user.profilePicturePublicId = publicId;
    await user.save();

    console.log(`✅ New profile picture publicId: ${publicId}`);

    return res.json({
      success: true,
      profilePicture: imageUrl,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    console.error("❌ Profile upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Profile picture update failed",
    });
  }
};

module.exports = {
  getUserInfo,
  searchUser,
  signup,
  login,
  logout,
  checkAuth,
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
  uploadProfilePicture,
};
