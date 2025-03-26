const mongoose = require("mongoose");
const User = require("../models/users_model");
const Announcements = require("../models/announcements_model");

const createAnnouncement = async (req, res) => {
  try {
    const { username, title, description } = req.body;

    if (!username || !title || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAnnouncement = new Announcements({
      created_by: user._id,
      title,
      description,
      createdAt: new Date(),
    });

    await newAnnouncement.save();
    res.status(201).json({
      message: "Announcement created successfully",
      announcement: newAnnouncement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllAnnouncements = async (req, res) => {
  try {
    const { showDeleted } = req.query;
    const filter = showDeleted === "true" ? {} : { isDeleted: false };

    const announcements = await Announcements.find(filter)
      .populate("created_by", "username")
      .select("title description created_by createdAt isDeleted");

    res.status(200).json({
      success: true,
      announcements: announcements.map((announcement) => ({
        id: announcement._id,
        title: announcement.title,
        description: announcement.description,
        created_by: announcement.created_by ? announcement.created_by.username : "Unknown User",
        createdAt: announcement.createdAt,
        isDeleted: announcement.isDeleted,
      })),
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAnnouncementById = async (req, res) => {
  try {
    const { announcement_id } = req.params;
    const { showDeleted } = req.query;

    const filter = showDeleted === "true" ? { _id: announcement_id } : { _id: announcement_id, isDeleted: false };

    const announcement = await Announcements.findOne(filter)
      .populate("created_by", "username")
      .select("title description created_by createdAt updatedAt isDeleted");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found or deleted" });
    }

    res.status(200).json({
      success: true,
      announcement: {
        id: announcement._id,
        title: announcement.title,
        description: announcement.description,
        created_by: announcement.created_by.username,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
        isDeleted: announcement.isDeleted,
      },
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { announcement_id } = req.params;
    const { username, title, description } = req.body;

    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const announcement = await Announcements.findById(announcement_id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (announcement.created_by.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to update this announcement" });
    }

    if (title) announcement.title = title;
    if (description) announcement.description = description;

    await announcement.save();
    res.status(200).json({ message: "Announcement updated successfully", announcement: {
        id: announcement._id,
        title: announcement.title,
        description: announcement.description,
        created_by: announcement.created_by.username, 
        updatedAt: announcement.updatedAt,
      }, });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { announcement_id } = req.params;
    const { username } = req.body;

    const user = await User.findOne({ username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const announcement = await Announcements.findById(announcement_id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    if (announcement.created_by.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this announcement" });
    }

    if (announcement.isDeleted) {
      return res.status(400).json({ message: "Announcement is already deleted" });
    }

    announcement.isDeleted = true;
    announcement.deletedAt = new Date();
    await announcement.save();

    res.status(200).json({ 
      message: "Announcement deleted successfully", 
      deletedAt: announcement.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};
