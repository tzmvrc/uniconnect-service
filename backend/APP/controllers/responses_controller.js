/** @format */

const Response = require("../models/responses_model");
const Forum = require("../models/forums_model");
const mongoose = require("mongoose");
const Notification = require("../models/notification_model");
const User = require("../models/users_model");
const School = require("../models/schools_model");
const { containsBadWords } = require("./badword_controller");

// Create a response (comment on a forum)
const createResponse = async (req, res) => {
  try {
    console.log("Request User:", req.user); // Debugging log

    // Ensure the user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    const { forum_id, comment } = req.body;
    const userId = req.user.userId; // Extract user ID from JWT

    if (!forum_id) {
      return res.status(400).json({ message: "forum_id is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(forum_id)) {
      return res.status(400).json({ message: "Invalid forum ID" });
    }

    // Validate forum existence
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found" });
    }

    // Check if the comment contains any bad words
    const isBadComment = await containsBadWords(comment);
    if (isBadComment) {
      return res.status(400).json({
        success: false,
        message: "Your response contains inappropriate language.",
      });
    }

    // Create response if no bad words are found
    const response = new Response({
      created_by: userId,
      forum_id,
      comment,
    });

    await response.save();

    // ✅ Send notification to forum owner if they are not the responder
    if (forum.created_by.toString() !== userId) {
      await Notification.create({
        userId: forum.created_by, // Forum owner's ID
        type: "forum_response",
        sourceId: response._id, // Response ID
        sourceType: "response",
        senderId: userId, // Responder's ID
      });
    }

    // 🔥 Populate `created_by` before sending response
    const populatedResponse = await Response.findById(response._id).populate(
      "created_by",
      "username email first_name last_name"
    );

    res.status(201).json({
      message: "Response added successfully",
      response: populatedResponse,
    });
  } catch (error) {
    console.error("Error in createResponse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Get all responses for a forum
const getResponsesByForum = async (req, res) => {
  try {
    const { forum_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(forum_id)) {
      return res.status(400).json({ message: "Invalid forum ID" });
    }

    const responses = await Response.find({ forum_id, isArchived: false }) // <-- this line filters it
      .populate("created_by", "username email first_name last_name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(responses);
  } catch (error) {
    console.error("Error in getResponsesByForum:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a response (only the owner can edit their response)
const updateResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(response_id)) {
      return res.json({ message: "Invalid response ID" });
    }

    const response = await Response.findOne({
      _id: response_id,
      created_by: userId,
    });

    if (!response) {
      return res.json({
        message: "Response not found or unauthorized",
      });
    }

    // Check for bad words before proceeding with the update
    const hasBadWords = await containsBadWords(comment);
    if (hasBadWords) {
      return res.json({
        message:
          "Your comment contains inappropriate language. Please modify it.",
      });
    }

    // Only update if comment is different
    if (comment && comment !== response.comment) {
      response.comment = comment;

      // Save the response, which automatically updates the updatedAt field
      await response.save();

      return res.json({
        message: "Response updated successfully",
        updated: true,
        response,
      });
    }

    // Return a message when no changes are made
    return res.json({
      message: "No changes were made",
      updated: false,
      response,
    });
  } catch (error) {
    console.error("Error in updateResponse:", error);
    res.json({ message: "Server error", error: error.message });
  }
};




// Delete a response (only the owner can delete their response)
const deleteResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(response_id)) {
      return res.status(400).json({ message: "Invalid response ID" });
    }

    // Find the response by ID and check ownership
    const response = await Response.findOne({
      _id: response_id,
      created_by: userId,
    });

    if (!response) {
      return res
        .status(404)
        .json({ message: "Response not found or unauthorized" });
    }

    // Soft delete (archive) the response
    response.isArchived = true;
    await response.save();

    res.status(200).json({ message: "Response archived successfully" });
  } catch (error) {
    console.error("Error in deleteResponse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getResponseCount = async (req, res) => {
  try {
    const { forum_id } = req.params;
    console.log("Received forum_id:", forum_id);

    const count = await Response.countDocuments({
      forum_id: forum_id,
      isArchived: false,
    });
    console.log("Received forum_id:", forum_id);
    console.log("Response Count:", count);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching response count:", error);
    res.status(500).json({ error: "Failed to get response count" });
  }
};

const likeResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(response_id)) {
      return res.status(400).json({ message: "Invalid response ID" });
    }

    const response = await Response.findById(response_id);
    if (!response) {
      return res.status(404).json({ message: "Response not found" });
    }

    let notificationCreated = false;

    // If user already liked, remove the like (unlike)
    if (response.liked_by.includes(userId)) {
      response.liked_by = response.liked_by.filter(
        (id) => id.toString() !== userId
      );
      response.likes -= 1;
    } else {
      // Remove dislike if previously disliked
      if (response.disliked_by.includes(userId)) {
        response.disliked_by = response.disliked_by.filter(
          (id) => id.toString() !== userId
        );
        response.dislikes -= 1;
      }

      // Add like
      response.liked_by.push(userId);
      response.likes += 1;

      // ✅ Create Notification if valid
      if (response.created_by.toString() !== userId) {
        await Notification.create({
          userId: response.created_by,
          type: "response_like",
          sourceId: response._id,
          sourceType: "response",
          senderId: userId,
        });
        notificationCreated = true;
      }
    }

    // ✅ Save the updated response
    await response.save({ timestamps: false });

    // ✅ Calculate and save updated user points excluding the author's own likes
    let updatedPoints = null;
    if (response.created_by.toString() !== userId.toString()) {
      updatedPoints = await calculateUserPoints(response.created_by);
    }

    res.status(200).json({
      message: "Response updated",
      response,
      notificationCreated,
      updatedPoints,
    });
  } catch (error) {
    console.error("❌ Error in likeResponse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const dislikeResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(response_id)) {
      return res.status(400).json({ message: "Invalid response ID" });
    }

    const response = await Response.findById(response_id);
    if (!response) {
      return res.status(404).json({ message: "Response not found" });
    }

    let notificationCreated = false;

    // If user already disliked, remove the dislike (undislike)
    if (response.disliked_by.includes(userId)) {
      response.disliked_by = response.disliked_by.filter(
        (id) => id.toString() !== userId
      );
      response.dislikes -= 1;
    } else {
      // Remove like if previously liked
      if (response.liked_by.includes(userId)) {
        response.liked_by = response.liked_by.filter(
          (id) => id.toString() !== userId
        );
        response.likes -= 1;
      }

      // Add dislike
      response.disliked_by.push(userId);
      response.dislikes += 1;

      // ✅ Create Notification if valid
      if (response.created_by.toString() !== userId) {
        await Notification.create({
          userId: response.created_by,
          type: "response_dislike",
          sourceId: response._id,
          sourceType: "response",
          senderId: userId,
        });
        notificationCreated = true;
      }
    }

    // ✅ Save the updated response
    await response.save({ timestamps: false });


    // ✅ Calculate and save updated user points
    const points = await calculateUserPoints(response.created_by);

    res.status(200).json({
      message: "Response updated",
      response,
      notificationCreated,
      updatedPoints: points,
    });
  } catch (error) {
    console.error("Error in dislikeResponse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getResponseVotes = async (req, res) => {
  try {
    const { response_id } = req.params;
    const userId = req.user.userId;

    const response = await Response.findById(response_id);
    if (!response)
      return res.status(404).json({ message: "Response not found" });

    const hasLiked = response.liked_by.includes(userId);
    const hasDisliked = response.disliked_by.includes(userId);

    res.json({ isLiked: hasLiked, isDisliked: hasDisliked });
  } catch (error) {
    console.error("Error fetching response vote status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getResponsesByOwner = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Step 1: Find responses that are not archived by the user
    const responses = await Response.find({
      created_by: userId,
      isArchived: false, // ← only active responses
    })
      .populate({
        path: "forum_id",
        select: "title description created_by createdAt isArchived public", // Added public to select
        match: {
          isArchived: false,
          public: true, // ← only public forums
        },
      })
      .select("forum_id");

    // Step 2: Filter out responses where forum_id was not populated (i.e., it was archived or private)
    const filteredForums = responses
      .map((r) => r.forum_id)
      .filter((forum) => forum !== null);

    // Step 3: Deduplicate forums
    const uniqueForumsMap = new Map();
    filteredForums.forEach((forum) => {
      uniqueForumsMap.set(forum._id.toString(), forum.toObject());
    });

    const uniqueForums = [...uniqueForumsMap.values()];

    res.status(200).json({
      message: "Forums retrieved successfully",
      forums: uniqueForums,
    });
  } catch (error) {
    console.error("Error in getResponsesByOwner:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const calculateUserPoints = async (userId) => {
  try {
    const responses = await Response.find({
      created_by: userId,
      isArchived: false,
    });

    let totalLikes = 0;
    let totalDislikes = 0;

    responses.forEach((response) => {
      const filteredLikes = response.liked_by.filter(
        (id) => id.toString() !== userId.toString()
      );
      const filteredDislikes = response.disliked_by.filter(
        (id) => id.toString() !== userId.toString()
      );

      totalLikes += filteredLikes.length;
      totalDislikes += filteredDislikes.length;
    });

    const points = Math.max(
      0,
      Math.round(
        totalLikes >= totalDislikes
          ? (totalLikes - totalDislikes) * 0.5 + responses.length * 2
          : (totalLikes - totalDislikes) * 0.8 + responses.length * 1.5
      )
    );

    const hasBadge = points >= 100;

    const user = await User.findById(userId);
    if (user) {
      user.points = points;
      user.has_badge = hasBadge;
      await user.save();
    }

    return points;
  } catch (error) {
    console.error("❌ Error computing user points:", error);
    throw error;
  }
};


module.exports = {
  createResponse,
  getResponsesByForum,
  updateResponse,
  deleteResponse,
  likeResponse,
  dislikeResponse,
  getResponseCount,
  getResponseVotes,
  getResponsesByOwner,
  calculateUserPoints,
};
