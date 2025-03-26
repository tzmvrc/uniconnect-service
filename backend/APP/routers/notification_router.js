/** @format */

const express = require("express");
const router = express.Router();
const userAuthMiddleware = require("../Middleware/AuthMiddleware");
const {
  createNotification,
  getNotifications,
  removeNotification,
  markNotificationAsRead,
} = require("../controllers/notification_controller");

router.get("/get-notif",userAuthMiddleware, getNotifications);   
router.post("/", createNotification);
router.delete("/:id", removeNotification);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;    
