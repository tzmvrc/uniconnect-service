/** @format */

const BadWord = require("../models/badword_model");

const addBadWord = async (req, res) => {
  const { word } = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({
      success: false,
      message: "Bad word cannot be empty.",
    });
  }

  try {
    const lowerCaseWord = word.trim().toLowerCase();

    // Check if it already exists
    const exists = await BadWord.findOne({ word: lowerCaseWord });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "This word already exists in the list.",
      });
    }

    const newWord = new BadWord({ word: lowerCaseWord });
    await newWord.save();

    res.status(201).json({
      success: true,
      message: "Bad word added successfully.",
      data: newWord,
    });
  } catch (error) {
    console.error("Error adding bad word:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding bad word.",
    });
  }
};

const badwordCheck = async (req, res) => {
    const { text } = req.body;

    try {
      // Fetch bad words from the database
      const badWords = await BadWord.find();

      // Create a regex pattern to match whole words and their expanded versions
      const badWordsList = badWords
        .map((word) => {
          // Regex to match a bad word and any expansions like "asss", "assss", etc.
          return `\\b${word.word.replace(/([a-zA-Z])/g, "$1+")}\\b`; // Add + to the letters
        })
        .join("|"); // Join all bad words with OR (|)

      const regex = new RegExp(badWordsList, "i"); // 'i' flag makes the regex case-insensitive

      // Check if the text contains any bad words or expanded versions
      const containsBad = regex.test(text);

      // Return result
      return res.json({ containsBad });
    } catch (err) {
      console.error("Error checking bad words:", err);
      return res
        .status(500)
        .json({ message: "Server error checking bad words." });
    }
};

// Function to check for bad words
// Function to check for bad words
const containsBadWords = async (text) => {
    try {
      // Fetch the list of bad words from the database
      const badWords = await BadWord.find();
  
      // Check if the text contains any of the bad words
      const badWordsList = badWords.map(word => word.word); // Assuming `word` field in BadWords model contains the bad word
  
      // Create a regex pattern to match each bad word
      const regex = new RegExp(`\\b(${badWordsList.join("|")})\\b`, "i"); // Case insensitive search with word boundaries
  
      const containsBad = regex.test(text); // Test if the text contains any bad word
  
      return containsBad;
    } catch (err) {
      console.error("Error checking for bad words:", err);
      return false; // Default to no bad words if an error occurs
    }
  };
  

module.exports = { addBadWord, containsBadWords, badwordCheck }; // Export both functions
