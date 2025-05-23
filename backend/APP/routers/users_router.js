const express = require("express");
const userController = require("../controllers/users_controller");
const router = express.Router();
const authMiddleware = require("../Middleware/AuthMiddleware");
const { upload, handleUploadErrors } = require("../../cloudinary/multerConfig"); // Use existing multer config

//router - VARIABLE USED TO HOLD THE ROUTER OBJECT
//post - HTTP METHOD OF THE API.
//PARAMETER ARGUMENTS SHOULD BE THE ENDPOINT, AND THE CONTROLLER
router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
router.get("/search-user", userController.searchUser);
router.get("/check-auth", authMiddleware, userController.checkAuth);
router.get("/get-user-info", authMiddleware, userController.getUserInfo);
router.post("/forgot-password", userController.forgotPassword);
router.put("/reset-password", userController.resetPassword);
router.get("/check-if-verified/:email", userController.checkIfVerified);
router.get("/check-user-badge/:username", userController.checkUserBadge);
router.put("/update-user-pass", authMiddleware, userController.updateUserPass);
router.put("/update", authMiddleware, userController.editUserProfile);
router.get("/saved-forums", authMiddleware, userController.getSavedForums);
router.get(
  "/:forum_id/saved-votes",
  authMiddleware,
  userController.getForumVotes
);
router.get("/:username", authMiddleware, userController.getOtherUserInfo);
router.delete("/delete-acct", authMiddleware, userController.deleteOwnAccount);
router.put(
  "/upload-profile-picture",
  authMiddleware,
  upload.single("profile-picture"),
  handleUploadErrors, // Add this after the upload middleware
  userController.uploadProfilePicture
);



//http://localhost:8000/users/1
//TAKE NOTE: MULTIPLE ROUTERS WITH SAME ENDPOINTS ARE ALLOWED ONLY IF THE HTTP METHODS ARE DIFFERENT FOR EACH.

//EXPORTS THE ROUTER OBJECT.
module.exports = router;
