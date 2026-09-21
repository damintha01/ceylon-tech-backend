const express = require("express");
const multer = require("multer");
const { uploadImage, removeImage } = require("../controllers/uploadController");
const { protect, requireOwner } = require("../middleware/auth");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post("/", protect, requireOwner, upload.single("file"), uploadImage);
router.delete("/", protect, requireOwner, removeImage);

module.exports = router;
