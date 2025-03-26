/** @format */

// IMPORT PACKAGE DEPENDENCIES
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// IMPORT DATABASE INSTANCE
const db = require("./APP/models/con_db");

// IMPORT ROUTERS
const userRouter = require("./APP/routers/users_router");
const otpRouter = require("./APP/routers/OTP_router");
const topicRouter = require("./APP/routers/topics_router");
const schoolRouter = require("./APP/routers/school_router");
const forumRouter = require("./APP/routers/forums_router");
const responseRouter = require("./APP/routers/responses_router");
const announcementRouter = require("./APP/routers/announcement_router");
const notificationRouter = require("./APP/routers/notification_router");
const leaderboardsRouter = require("./APP/routers/leaderboards_router");

// INITIALIZE EXPRESS APP
const app = express();

// CONNECT TO DATABASE
db.connectDB();

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000", // Production or localhost
  process.env.LOCALHOST_URL || "http://localhost:3000", // Additional local env support if needed
];

app.use(
  cors({
    origin: "*", // Allow multiple frontend URLs
    credentials: true, // Allow cookies/auth headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Log incoming requests in a development-friendly format
app.use(morgan("dev"));

// Body parsing middleware
app.use(express.json({ limit: "50mb" })); // Parses JSON payloads
app.use(
  express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 50000 })
); // Parses URL-encoded payloads


// ROUTES
app.use("/users", userRouter);
app.use("/otp", otpRouter);
app.use("/topic", topicRouter);
app.use("/school", schoolRouter);
app.use("/forum", forumRouter);
app.use("/response", responseRouter);
app.use("/announcement",announcementRouter);
app.use("/notification",notificationRouter);
app.use("/leaderboard",leaderboardsRouter);

// HANDLE UNKNOWN ROUTES
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({ error: { message: error.message } });
});

// EXPORT EXPRESS APP
module.exports = app;
