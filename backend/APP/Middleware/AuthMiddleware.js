/** @format */

const jwt = require("jsonwebtoken");
const TokenModel = require("../models/token_model");

async function authMiddleware(req, res, next) {
  let token = req.cookies?.token;

  // Try fallback from Authorization header
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.split(" ")[1];
  }

  // If token is still missing
  if (!token) {
    // Attempt to delete any orphaned token from DB based on user session (if available)
    // This will only work if you somehow store userId in session, which may not exist here
    return res.status(401).json({ error: true, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const storedToken = await TokenModel.findOne({ userId: decoded.userId });

    if (!storedToken || storedToken.token !== token) {
      // ❌ Mismatch or token not found — delete from DB
      if (storedToken) {
        await TokenModel.deleteOne({ userId: decoded.userId });
      }

      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });

      return res.status(403).json({ error: true, message: "Invalid token" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);

    // Try deleting token if JWT is invalid (e.g., expired/tampered)
    try {
      const decoded = jwt.decode(token);
      if (decoded?.userId) {
        await TokenModel.deleteOne({ userId: decoded.userId });
      }
    } catch (_) {
      // No-op: can't decode
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res
      .status(403)
      .json({ error: true, message: "Authentication failed" });
  }
}

module.exports = authMiddleware;
