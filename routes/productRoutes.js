const express = require("express");
const {
  listProducts,
  listProductsByIds,
  listAllProducts,
  getProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
} = require("../controllers/productController");
const { protect, requireOwner } = require("../middleware/auth");

const router = express.Router();

router.get("/", listProducts);
router.get("/all", protect, requireOwner, listAllProducts);
router.get("/by-ids", listProductsByIds);
router.get("/id/:id", protect, requireOwner, getProductById);
router.get("/:slug", getProduct);
router.post("/", protect, requireOwner, createProduct);
router.patch("/:id", protect, requireOwner, updateProduct);
router.delete("/:id", protect, requireOwner, deleteProduct);
router.post("/:id/variants", protect, requireOwner, addVariant);
router.patch("/:id/variants", protect, requireOwner, updateVariant);
router.delete("/:id/variants", protect, requireOwner, deleteVariant);

module.exports = router;
