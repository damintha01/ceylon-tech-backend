const express = require("express");
const { getSettings, updateSettings } = require("../controllers/settingsController");
const { protect, requireOwner } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, requireOwner, getSettings);
router.patch("/", protect, requireOwner, updateSettings);

module.exports = router;
