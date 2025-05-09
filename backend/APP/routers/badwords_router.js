/** @format */

const express = require("express");
const router = express.Router();
const { addBadWord, badwordCheck } = require("../controllers/badword_controller");

router.post("/add", addBadWord);
router.post("/check", badwordCheck);

module.exports = router;
