const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcements_controller");
const authMiddleware = require("../Middleware/AuthMiddleware");

//router - VARIABLE USED TO HOLD THE ROUTER OBJECT
//post - HTTP METHOD OF THE API.
//PARAMETER ARGUMENTS SHOULD BE THE ENDPOINT, AND THE CONTROLLER
router.post(
  "/create",
  authMiddleware,
  announcementController.createAnnouncement
);
router.get("/all", authMiddleware, announcementController.getAllAnnouncements);
router.get(
  "/:announcement_id",
  authMiddleware,
  announcementController.getAnnouncementById
);
router.put(
  "/:announcement_id",
  authMiddleware,
  announcementController.updateAnnouncement
);
router.delete("/:announcement_id", authMiddleware, announcementController.deleteAnnouncement);


//http://localhost:8000/users/1
//TAKE NOTE: MULTIPLE ROUTERS WITH SAME ENDPOINTS ARE ALLOWED ONLY IF THE HTTP METHODS ARE DIFFERENT FOR EACH.

//EXPORTS THE ROUTER OBJECT.
module.exports = router;
