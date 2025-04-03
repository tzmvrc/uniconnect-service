/** @format */
const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel"); // Make sure path is correct

async function authMiddleware(req, res, next) {
  try {
    // Token extraction (unchanged)
    const token = req.cookies?.token;
    console.log('Token from cookie:', token);

    if (!token) {
      const authHeader = req.headers["authorization"];
      const tokenFromHeader = authHeader && authHeader.split(" ")[1];
      if (!tokenFromHeader) {
        return res.status(401).json({ error: true, message: "Unauthorized" });
      }
      req.token = tokenFromHeader;
    } else {
      req.token = token;
    }

    // Token verification + user check
    jwt.verify(req.token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ 
          error: true, 
          message: "Invalid or expired token" 
        });
      }

      // NEW: Verify user exists in database
      const user = await UserModel.findOne({
        _id: decoded.userId,
        isDeleted: false
      });

      if (!user) {
        console.log(`User ${decoded.userId} not found in database`);
        return res.status(404).json({
          error: true,
          message: "User account not found or deleted"
        });
      }

      // Attach full user document to request
      req.user = {
        userId: user._id,
        email: user.email,
        // Add other needed user fields
        ...user._doc
      };

      next();
    });

  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      error: true,
      message: "Authentication server error"
    });
  }
}

module.exports = authMiddleware;