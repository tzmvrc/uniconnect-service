/** @format */

const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // First, check for the token in cookies
  console.log("Request Headers:", req.headers); // Log all headers
  console.log("Request Cookies:", req.cookies); // Log cookies
  
  const token = req.cookies?.token; // Check cookies for the token
  console.log('Token from cookie:', req.cookies?.token);


  if (!token) {
    // If token is not found, check the Authorization header
    const authHeader = req.headers["authorization"];
    const tokenFromHeader = authHeader && authHeader.split(" ")[1];

    if (!tokenFromHeader) {
      return res.status(401).json({ error: true, message: "Unauthorized" });
    }

    // If a token was found in the header, use it
    req.token = tokenFromHeader;
  } else {
    req.token = token; // Token found in cookies
  }

  // Verify token
  jwt.verify(req.token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid or expired token" });
    }
    req.user = user; // Attach user data to the request object
    next(); // Proceed to the next middleware/route handler
  });
}

module.exports = authMiddleware;
