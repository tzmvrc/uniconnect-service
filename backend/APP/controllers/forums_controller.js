/** @format */

const mongoose = require("mongoose");
const Forum = require("../models/forums_model");
const User = require("../models/users_model");
const Topic = require("../models/topics_model");
const Response = require("../models/responses_model");
const Notification = require("../models/notification_model");

const createForum = async (req, res) => {
  const userId = req.user.userId;
  try {
    const { title, description, tags, public, topicName } = req.body;

    if (!title || !description || !topicName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Optimize User and Topic Queries
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const topic = await Topic.findOne({ name: topicName }).select("_id");
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Create Forum
    const newForum = new Forum({
      title,
      description,
      created_by: user._id,
      tags: tags || [],
      public: public ?? true,
      topic_id: topic._id,
    });

    await newForum.save();

    res.status(201).json({ message: "Forum created", forum: newForum });
  } catch (error) {
    console.error("Error creating forum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;
    const { title, description, tags, public, topicName } = req.body;

    // Find the forum
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Ensure only the creator can update the forum
    if (forum.created_by.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this forum" });
    }

    // Check if topicName is provided, then find the topic
    if (topicName) {
      const topic = await Topic.findOne({ name: topicName }).select("_id");
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      forum.topic_id = topic._id;
    }

    // Update fields only if they are provided
    if (title) forum.title = title;
    if (description) forum.description = description;
    if (tags) forum.tags = tags;
    if (public !== undefined) forum.public = public;

    await forum.save();
    res.status(200).json({ message: "Forum updated successfully", forum });
  } catch (error) {
    console.error("Error updating forum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const closeForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Only allow the creator to close the forum
    if (forum.created_by.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to close this forum" });
    }

    forum.status = "closed";
    await forum.save();

    res.status(200).json({ message: "Forum closed successfully", forum });
  } catch (error) {
    console.error("Error closing forum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const openForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Only allow the creator to close the forum
    if (forum.created_by.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to close this forum" });
    }

    forum.status = "open";
    await forum.save();

    res.status(200).json({ message: "Forum closed successfully", forum });
  } catch (error) {
    console.error("Error closing forum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Only allow the creator to archive
    if (forum.created_by.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this forum" });
    }

    // Soft delete: just update isArchived to true
    forum.isArchived = true;
    await forum.save();

    res.status(200).json({ message: "Forum archived successfully" });
  } catch (error) {
    console.error("Error archiving forum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const searchController = async (req, res) => {
  try {
    const { keyword, sort } = req.query;
    if (!keyword) {
      return res.status(400).json({ message: "Keyword is required" });
    }

    const query = {
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { tags: { $in: [keyword.toLowerCase()] } }, // Optimized search
      ],
    };

    const sortOrder = sort === "liked" ? { likes: -1 } : { createdAt: -1 };
    const results = await Forum.find(query).sort(sortOrder);

    if (!results.length) {
      return res.status(404).json({ message: "No matching forums found" });
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllForums = async (req, res) => {
  try {
    // Retrieve only non-archived forums
    const forums = await Forum.find({ isArchived: false })
      .populate("created_by", "username first_name last_name profilePicture")
      .populate("topic_id", "name display");

    if (forums.length === 0) {
      return res.status(404).json({ message: "No forums found" });
    }

    res.status(200).json({ success: true, forums });
  } catch (error) {
    console.error("Error fetching all forums:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


const viewForum = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.forum_id)
      .populate("created_by", "username first_name last_name profilePicture") // Populate author's username
      .populate("topic_id", "name"); // Populate topic name

    if (!forum) {
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    }

    res.json({ success: true, forum });
  } catch (error) {
    console.error("Error fetching forum:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const likeForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user?.userId; // Ensure req.user exists before accessing userId

    if (!mongoose.Types.ObjectId.isValid(forum_id)) {
      return res.status(400).json({ message: "Invalid forum ID" });
    }

    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    let notificationCreated = false;

    // ✅ **Check if forum.created_by exists before calling .toString()**
    if (!forum.created_by) {
      return res.status(500).json({ message: "Forum owner ID is missing" });
    }

    // Check if user already liked the forum
    if (forum.liked_by.includes(userId)) {
      forum.liked_by = forum.liked_by.filter((id) => id.toString() !== userId);
      forum.likes -= 1;
    } else {
      forum.liked_by.push(userId);
      forum.likes += 1;

      if (forum.disliked_by.includes(userId)) {
        forum.disliked_by = forum.disliked_by.filter(
          (id) => id.toString() !== userId
        );
        forum.dislikes -= 1;
      }

      // ✅ **Create Notification Only If userId & forum.created_by Are Valid**
      if (
        forum.created_by &&
        userId &&
        forum.created_by.toString() !== userId
      ) {
        await Notification.create({
          userId: forum.created_by, // ✅ FIXED: Use created_by instead of user_id
          type: "forum_like",
          sourceId: forum._id,
          sourceType: "forum",
          senderId: userId,
        });

        notificationCreated = true;
      }
    }

    await forum.save();

    res.status(200).json({
      message: "Like toggled",
      forum,
      notificationCreated,
    });
  } catch (error) {
    console.error("Error in likeForum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const dislikeForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(forum_id)) {
      return res.status(400).json({ message: "Invalid forum ID" });
    }

    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    let notificationCreated = false; // ✅ Define it before use

    // Check if user already disliked the forum
    if (forum.disliked_by.includes(userId)) {
      // ✅ Toggle off dislike (remove it)
      forum.disliked_by = forum.disliked_by.filter(
        (id) => id.toString() !== userId
      );
      forum.dislikes -= 1;
    } else {
      // ✅ User is disliking the forum now
      forum.disliked_by.push(userId);
      forum.dislikes += 1;

      // ✅ If the user previously liked it, remove the like
      if (forum.liked_by.includes(userId)) {
        forum.liked_by = forum.liked_by.filter(
          (id) => id.toString() !== userId
        );
        forum.likes -= 1;
      }

      // ✅ Create Notification ONLY IF user is NOT the forum owner
      if (
        forum.created_by &&
        userId &&
        forum.created_by.toString() !== userId
      ) {
        await Notification.create({
          userId: forum.created_by, // ✅ Forum owner
          type: "forum_dislike", // ✅ FIXED: Use correct type
          sourceId: forum._id,
          sourceType: "forum",
          senderId: userId, // ✅ User who disliked
        });

        notificationCreated = true;
      }
    }

    await forum.save();

    res.status(200).json({
      message: "Dislike toggled",
      forum,
      notificationCreated, // ✅ Now correctly included in response
    });
  } catch (error) {
    console.error("Error in dislikeForum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const saveForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    // Check if forumId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(forum_id)) {
      return res.status(400).json({ message: "Invalid forum ID" });
    }

    // Check if forum exists
    const forumExists = await Forum.findById(forum_id);
    if (!forumExists) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Add forum to user's saved list if not already saved
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { savedForums: forum_id }, // $addToSet prevents duplicates
      },
      { new: true }
    ).populate("savedForums"); // Populate saved forums if needed

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Forum saved successfully",
      savedForums: updatedUser.savedForums,
    });
  } catch (error) {
    console.error("Error saving forum:", error);
    res
      .status(500)
      .json({ message: "Error saving forum", error: error.message });
  }
};

const unsaveForum = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const userId = req.user.userId;

    // Remove forum from user's saved list
    await User.findByIdAndUpdate(userId, {
      $pull: { savedForums: forum_id },
    });

    res.status(200).json({ message: "Forum unsaved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error unsaving forum", error });
  }
};

const getForumsByOwner = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    const forums = await Forum.find({ created_by: userId, isArchived: false })
      .select("title description createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Forums retrieved successfully",
      forums,
    });
  } catch (error) {
    console.error("Error in getForumsByUser:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getForumsByOtherUser = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const forums = await Forum.find({
      created_by: user._id,
      public: true,
      isArchived: false,
    })
      .select("title description createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Public forums retrieved successfully",
      forums,
    });
  } catch (error) {
    console.error("Error in getForumsByOtherUser:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createForum,
  updateForum,
  closeForum,
  openForum,
  deleteForum,
  searchController,
  getAllForums,
  viewForum,
  likeForum,
  dislikeForum,
  saveForum,
  unsaveForum,
  getForumsByOwner,
  getForumsByOtherUser,
};
