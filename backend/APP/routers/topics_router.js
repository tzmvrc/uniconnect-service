/** @format */

const express = require("express");
const {
  createTopic,
  addTopic,
  removeTopic,
  getTopicStatus,
  getAddedTopics,
  getAllTopics,
} = require("../controllers/topics_controller");
const authMiddleware = require("../Middleware/AuthMiddleware");

const router = express.Router();

router.post("/create", createTopic);
router.post("/add", authMiddleware, addTopic);
router.post("/remove", authMiddleware, removeTopic);
router.get("/:topicId/status", authMiddleware, getTopicStatus);
router.get("/topic/:userId/added_topics", authMiddleware, getAddedTopics);
router.get("/all",authMiddleware, getAllTopics);

module.exports = router;
