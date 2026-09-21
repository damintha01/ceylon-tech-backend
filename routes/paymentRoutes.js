const express = require("express");
const { paymentConfig, createPayHerePayment, payhereNotify, sandboxConfirm } = require("../controllers/paymentController");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/config", paymentConfig);
router.post("/payhere/checkout", optionalAuth, createPayHerePayment);
router.post("/payhere/notify", payhereNotify);
router.post("/payhere/sandbox-confirm", optionalAuth, sandboxConfirm);

module.exports = router;
