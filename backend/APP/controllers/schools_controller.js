/** @format */

const Schools = require("../models/schools_model");

exports.addSchool = async (req, res) => {
  try {
    const { schoolName, emailDomain } = req.body;

    const newSchool = new Schools({
      school_name: schoolName,
      email_domain: emailDomain,
    });

    await newSchool.save();

    res.status(200).send({
      successful: true,
      message: "School successfully added.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while adding the school.",
    });
  }
};
exports.editSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolName, emailDomain } = req.body;

    const updatedSchool = await Schools.findByIdAndUpdate(
      id,
      {
        school_name: schoolName,
        email_domain: emailDomain,
      },
      { new: true }
    );

    if (!updatedSchool) {
      return res.status(404).send({
        successful: false,
        message: "School not found.",
      });
    }

    res.status(200).send({
      successful: true,
      message: "School successfully updated.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while updating the school.",
    });
  }
};
exports.getAllSchools = async (req, res) => {
  // ✅ Include `req`
  try {
    const schools = await Schools.find({}); // ✅ Get all schools
    res.json(schools); // ✅ Send response as an array
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSchoolDomain = async (req, res) => {
  try {
    const { schoolName } = req.params;
    const school = await Schools.findOne({ school_name: schoolName });
    if (!school) {
      return res.status(404).send({
        successful: false,
        message: "School not found.",
      });
    }
    res.status(200).send({
      successful: true,
      message: "School domain retrieved successfully",
      domain: school.email_domain,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      successful: false,
      message: "An error occurred while retrieving the school domain.",
    });
  }
};


