const Users = require("../models/users_model");

const getUsersLeaderboard = async (req, res) => {
    try {
      const leaderboard = await Users.find()
        .sort({ points: -1 })
        .limit(20)
        .select("first_name last_name username points has_badge");
  
      res.status(200).json({
        successful: true,
        message: "Leaderboard retrieved successfully.",
        leaderboard,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        successful: false,
        message: "An error occurred while retrieving the leaderboard.",
      });
    }
};

module.exports = {
    getUsersLeaderboard,
};
  