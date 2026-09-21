const express = require("express");
const {
  listVisibleSections,
  listAllSections,
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/sectionController");
const { protect, requireOwner } = require("../middleware/auth");

const router = express.Router();

router.get("/", listVisibleSections);
router.get("/all", protect, requireOwner, listAllSections);
router.post("/", protect, requireOwner, createSection);
router.patch("/:id", protect, requireOwner, updateSection);
router.delete("/:id", protect, requireOwner, deleteSection);

module.exports = router;
