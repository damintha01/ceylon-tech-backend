const express = require("express");
const {
  listCategories,
  listAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { protect, requireOwner } = require("../middleware/auth");

const router = express.Router();

router.get("/", listCategories);
router.get("/all", protect, requireOwner, listAllCategories);
router.get("/:slug", getCategory);
router.post("/", protect, requireOwner, createCategory);
router.patch("/:id", protect, requireOwner, updateCategory);
router.delete("/:id", protect, requireOwner, deleteCategory);

module.exports = router;
