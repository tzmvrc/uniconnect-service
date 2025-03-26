const express = require("express");
const router = express.Router();
const leaderboardsController = require("../controllers/leaderboards_controller");
const authMiddleware = require("../Middleware/AuthMiddleware");


  router.get("/users", authMiddleware, leaderboardsController.getUsersLeaderboard);

  
  //http://localhost:8000/users/1
  //TAKE NOTE: MULTIPLE ROUTERS WITH SAME ENDPOINTS ARE ALLOWED ONLY IF THE HTTP METHODS ARE DIFFERENT FOR EACH.
  
  //EXPORTS THE ROUTER OBJECT.
  module.exports = router;
  