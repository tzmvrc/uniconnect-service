/** @format */

const TopicModel = require("../models/topics_model");
const UserTopics = require("../models/usertopics_model");
const UserModel = require("../models/users_model");


const createTopic = async (req, res) => {
  const { name, display } = req.body;

  try {

    const existingTopic = await TopicModel.findOne({ name });
    if (existingTopic) {
      return res.status(400).send({
        successful: false,
        message: "Topic already exists.",
      });
    }


    const newTopic = new TopicModel({
      name,
      display,
    });

    await newTopic.save();

    res.status(201).send({
      successful: true,
      message: "Topic created successfully.",
      topic: newTopic,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while creating the topic.",
    });
  }
};

const addTopic = async (req, res) => {
  const { topicNames } = req.body; 
  const userId = req.user.userId; 

  if (!Array.isArray(topicNames) || topicNames.length === 0) {
    return res.status(400).send({
      successful: false,
      message: "Invalid request. Provide an array of topic names.",
    });
  }

  try {
    // Find all topics that match the provided names
    const topics = await TopicModel.find({ name: { $in: topicNames } });

    if (topics.length !== topicNames.length) {
      return res.status(404).send({
        successful: false,
        message: "Some topics were not found.",
        missingTopics: topicNames.filter(
          (name) => !topics.some((topic) => topic.name === name)
        ),
      });
    }

    // Get the topic ObjectIds
    const topicIds = topics.map((topic) => topic._id.toString());

    // Find the user by ID
    let user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).send({
        successful: false,
        message: "User not found.",
      });
    }

    // Ensure the topics field exists
    if (!user.topics) {
      user.topics = [];
    }

    // Filter out already added topics
    const newTopics = topicIds.filter((id) => !user.topics.includes(id));

    if (newTopics.length === 0) {
      return res.status(400).send({
        successful: false,
        message: "All selected topics are already added.",
      });
    }

    // Add new topics to the user's list
    user.topics.push(...newTopics);
    await user.save();

    user = await UserModel.findById(userId).populate("topics", "name display");

    res.status(200).send({
      successful: true,
      message: "Topics successfully added.",
      topics: user.topics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while adding topics.",
    });
  }
};

const removeTopic = async (req, res) => {
  const { topicNames } = req.body;
  const userId = req.user.userId;

  if (!Array.isArray(topicNames) || topicNames.length === 0) {
    return res.status(400).send({
      successful: false,
      message: "Invalid request. Provide an array of topic names.",
    });
  }

  try {
    // Find the topics by name
    const topics = await TopicModel.find({ name: { $in: topicNames } });

    if (topics.length !== topicNames.length) {
      return res.status(404).send({
        successful: false,
        message: "Some topics were not found.",
      });
    }

    const topicIds = topics.map((topic) => topic._id);
    
    // Update the user document by removing these topic IDs from the topics array
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).send({
        successful: false,
        message: "User not found.",
      });
    }
    
    // Filter out the topic IDs we want to remove
    const updatedTopics = user.topics.filter(topicId => 
      !topicIds.some(id => id.toString() === topicId.toString())
    );
    
    // Check if any topics were actually removed
    if (updatedTopics.length === user.topics.length) {
      return res.status(400).send({
        successful: false,
        message: "No matching topics found to remove.",
      });
    }
    
    // Update the user with the new topics array
    user.topics = updatedTopics;
    await user.save();

    res.status(200).send({
      successful: true,
      message: "Topics successfully removed.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while removing topics.",
    });
  }
};

const getTopicStatus = async (req, res) => {
  const { topicId } = req.params;
  const userId = req.user.userId;

  try {
    const exists = await UserTopics.findOne({ userId, topicId });

    res.status(200).send({
      successful: true,
      message: "Topic status retrieved.",
      topicId,
      added: exists ? "Yes" : "No",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while retrieving the topic status.",
    });
  }
};

const getAddedTopics = async (req, res) => {
  const { userId } = req.params;

  try {
    const userTopics = await UserTopics.find({ userId }).populate("topicId", "name");

    if (!userTopics.length) {
      return res.status(200).send({
        successful: true,
        message: "No topics added by the user.",
        topics: [],
      });
    }

    const topics = userTopics.map((ut) => ({
      id: ut.topicId._id,
      name: ut.topicId.name,
    }));

    res.status(200).send({
      successful: true,
      message: "Added topics retrieved successfully.",
      topics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while retrieving added topics.",
    });
  }
};

const getAllTopics = async (req, res) => {
  try {
    const topics = await TopicModel.find({}, "name");

    res.status(200).send({
      successful: true,
      topics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while retrieving topics.",
    });
  }
};

module.exports = {
  createTopic,
  addTopic,
  removeTopic,
  getTopicStatus,
  getAddedTopics,
  getAllTopics,
};
