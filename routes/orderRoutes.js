const express = require("express");
const { quote, createOrder, getOrder } = require("../controllers/orderController");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/quote", quote);
router.post("/", optionalAuth, createOrder);
router.get("/:id", optionalAuth, getOrder);

module.exports = router;
