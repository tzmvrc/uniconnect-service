/** @format */

const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responses_controller");
const authMiddleware = require("../Middleware/AuthMiddleware");

router.post("/create", authMiddleware, responseController.createResponse);
router.get("/:forum_id", responseController.getResponsesByForum);
router.put(
  "/update/:response_id",
  authMiddleware,
  responseController.updateResponse
);
router.delete(
  "/delete/:response_id",
  authMiddleware,
  responseController.deleteResponse
);
router.post(
  "/:response_id/like",
  authMiddleware,
  responseController.likeResponse
);
router.post(
  "/:response_id/dislike",
  authMiddleware,
  responseController.dislikeResponse
);
router.get("/:forum_id/count", responseController.getResponseCount);
router.get(
  "/:response_id/saved-votes",
  authMiddleware,
  responseController.getResponseVotes
);
router.get(
  "/owner/history",
  authMiddleware,
  responseController.getResponsesByOwner
);

module.exports = router;
