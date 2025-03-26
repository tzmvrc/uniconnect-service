const express = require("express");
const router = express.Router();
const {addSchool, editSchool, getAllSchools, getSchoolDomain} = require("../controllers/schools_controller");

router.post("/add-school", addSchool);
router.put("/edit-school/:id", editSchool);
router.get("/get-all-schools", getAllSchools);
router.get("/get-school-domain/:schoolName", getSchoolDomain);

module.exports = router;