/** @format */

const schedule = require("node-schedule");
const Users = require("../models/users_model");
const School = require("../models/schools_model");

const getUsersLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Users.find({ has_badge: true, isDeleted: false })
      .sort({ points: -1 })
      .limit(10)
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

const getSchoolLeaderboard = async (req, res) => {
  try {
    // Fetch all schools
    const schools = await School.find();

    let leaderboardData = [];

    for (const school of schools) {
      // Fetch users under the school with non-zero points
      const users = await Users.find({
        school_id: school._id,
        isDeleted: false,
        points: { $gt: 0 },
      }).sort({ points: -1 }); // Sort users by points descending

      // Calculate total points dynamically
      const totalPoints = Math.round(
        users.reduce((sum, user) => sum + user.points, 0)
      );


      // Update school points if there's a change
      if (school.points !== totalPoints) {
        school.points = totalPoints;
        await school.save();
      }

      // Push the formatted data into leaderboard array
      leaderboardData.push({
        school_name: school.school_name,
        total_points: totalPoints,
        users: users.map((user) => ({
          username: user.username,
          full_name: `${user.first_name} ${user.last_name}`,
          points: user.points,
        })),
      });
    }

    // Sort schools by total points in descending order and get top 10
    leaderboardData.sort((a, b) => b.total_points - a.total_points);
    const topSchools = leaderboardData.slice(0, 10);

    res.status(200).json({
      message: "Top 10 Schools Leaderboard",
      leaderboard: topSchools,
    });
  } catch (error) {
    console.error("Error in getSchoolLeaderboard:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Schedule a job to run at midnight on the 1st of every month
schedule.scheduleJob("0 0 1 * *", async () => {
  try {
    console.log("🔄 Running monthly leaderboard updates...");

    // Fetch and log top 10 users with badges
    const usersLeaderboard = await Users.find({ has_badge: true })
      .sort({ points: -1 })
      .limit(10)
      .select("first_name last_name username points has_badge");
    console.log("🏆 Monthly Users Leaderboard:", usersLeaderboard);

    // Fetch and log top 5 schools
    const schoolsLeaderboard = await School.find()
      .select("school_name points")
      .sort({ points: -1 })
      .limit(5)
      .lean()
      .exec();
    console.log("🏫 Monthly Schools Leaderboard:", schoolsLeaderboard);
  } catch (error) {
    console.error("❌ Error running monthly leaderboard updates:", error);
  }
});

module.exports = {
  getUsersLeaderboard,
  getSchoolLeaderboard,
};
