const express = require("express");
const router = express.Router();
const forumsController = require("../controllers/forums_controller");
const authMiddleware = require("../Middleware/AuthMiddleware");

//router - VARIABLE USED TO HOLD THE ROUTER OBJECT
//post - HTTP METHOD OF THE API.
//PARAMETER ARGUMENTS SHOULD BE THE ENDPOINT, AND THE CONTROLLER
router.post("/create",authMiddleware, forumsController.createForum);
router.put("/update/:forum_id",authMiddleware, forumsController.updateForum);
router.delete("/delete/:forum_id",authMiddleware, forumsController.deleteForum);
router.put("/close/:forum_id",authMiddleware, forumsController.closeForum);
router.put("/open/:forum_id", authMiddleware, forumsController.openForum);
router.get("/search", forumsController.searchController);
router.get("/all",authMiddleware, forumsController.getAllForums);
router.get("/:forum_id", forumsController.viewForum);
router.post("/:forum_id/like", authMiddleware, forumsController.likeForum);
router.post("/:forum_id/dislike", authMiddleware, forumsController.dislikeForum);
router.post("/:forum_id/save", authMiddleware, forumsController.saveForum);
router.delete("/:forum_id/unsave", authMiddleware, forumsController.unsaveForum);
router.get("/owner/history",authMiddleware, forumsController.getForumsByOwner);
router.get("/user/:username",authMiddleware, forumsController.getForumsByOtherUser);

//http://localhost:8000/users/1
//TAKE NOTE: MULTIPLE ROUTERS WITH SAME ENDPOINTS ARE ALLOWED ONLY IF THE HTTP METHODS ARE DIFFERENT FOR EACH.

//EXPORTS THE ROUTER OBJECT.
module.exports = router;
