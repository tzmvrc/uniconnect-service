/** @format */

const User = require("../models/users_model");
const Forums = require("../models/forums_model");
const Notification = require("../models/notification_model");
const Response = require("../models/responses_model");

const createNotification = async (req, res) => {
  try {
    const { userId, type, sourceId, sourceType, senderId } = req.body;

    // Prevent self-notifications
    if (userId.toString() === senderId.toString()) {
      return res.status(400).json({ message: "You cannot notify yourself." });
    }

    const newNotification = new Notification({
      userId,
      type,
      sourceId,
      sourceType,
      senderId,
    });

    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId; // Get logged-in user's ID

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch notifications for the logged-in user, sorted by latest
    let notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "username first_name last_name")
      .lean();

    // Loop through notifications to populate the correct title/comment
    for (let notification of notifications) {
      if (notification.sourceType === "forum") {
        // Populate forum title directly
        const forum = await Forums.findById(notification.sourceId)
          .select("title")
          .lean();
        notification.forumTitle = forum?.title || "Untitled";
        notification.forumId = notification.sourceId; // Add the forumId
      } else if (notification.sourceType === "response") {
        // Populate response comment and find the forum title
        const response = await Response.findById(notification.sourceId)
          .select("comment forum_id")
          .lean();
        if (response) {
          notification.responseComment = response.comment;

          // Fetch forum title using the response's forum_id
          const forum = await Forums.findById(response.forum_id)
            .select("title")
            .lean();
          notification.forumTitle = forum?.title || "Untitled";
          notification.forumId = response.forum_id; // Add the forumId
        }
      }
    }

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const removeNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNotification = await Notification.findByIdAndDelete(id);

    if (!deletedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  removeNotification,
  markNotificationAsRead,
};
