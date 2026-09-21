const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const { priceCart } = require("../utils/cartPricing");
const { canAccessOrder, publicOrder } = require("../utils/orderAccess");
const { applyChargeback, applyPaymentFailure, applyPaymentSuccess, addTimeline } = require("../utils/orderPayment");
const { CURRENCY, STATUS, formatAmount, generateCheckoutHash, getConfig, verifyNotifySignature } = require("../utils/payhere");

const OBJECT_ID = /^[a-f0-9]{24}$/i;

async function findAccessibleOrder(req, res) {
  const { orderId, token } = req.body ?? {};
  const order = typeof orderId === "string" && OBJECT_ID.test(orderId) ? await Order.findById(orderId).select("+accessToken") : null;
  if (!order || !canAccessOrder(req.user, order, token)) {
    res.status(404);
    throw new Error("Order not found");
  }
  return order;
}

const paymentConfig = asyncHandler(async (req, res) => {
  const config = getConfig();
  res.json({
    provider: "payhere",
    available: Boolean(config),
    sandbox: config ? config.sandbox : true,
    // Sandbox notifications can't reach a localhost backend, so local testing may confirm manually.
    testConfirm: Boolean(config?.sandbox) && process.env.NODE_ENV !== "production",
  });
});

// Builds the signed payload the browser hands to PayHere's checkout window.
const createPayHerePayment = asyncHandler(async (req, res) => {
  const config = getConfig();
  if (!config) {
    res.status(503);
    throw new Error("Online payments are not set up yet.");
  }

  const order = await findAccessibleOrder(req, res);
  if (order.paymentStatus === "paid") {
    res.status(409);
    throw new Error("This order has already been paid.");
  }
  if (["cancelled", "refunded"].includes(order.status)) {
    res.status(409);
    throw new Error("This order can no longer be paid.");
  }

  const check = await priceCart(order.items.map((i) => ({ productId: i.product, variantId: i.variantId, quantity: i.quantity })));
  if (check.issues.length) {
    res.status(409).json({ error: "Some items are no longer available.", issues: check.issues });
    return;
  }

  const address = order.shippingAddress;
  const [firstName, ...rest] = address.fullName.trim().split(/\s+/);

  res.json({
    payment: {
      sandbox: config.sandbox,
      merchant_id: config.merchantId,
      // PayHere's checkout endpoint errors if these fields are absent; the popup uses callbacks, so they stay empty.
      return_url: "",
      cancel_url: "",
      notify_url: config.notifyUrl,
      order_id: order.orderNumber,
      items: `Ceylon Tech order ${order.orderNumber}`,
      amount: formatAmount(order.total),
      currency: CURRENCY,
      hash: generateCheckoutHash({
        merchantId: config.merchantId,
        merchantSecret: config.merchantSecret,
        orderId: order.orderNumber,
        amount: order.total,
      }),
      first_name: firstName,
      last_name: rest.join(" ") || firstName,
      email: order.email,
      phone: address.phone,
      address: [address.line1, address.line2].filter(Boolean).join(", "),
      city: address.city,
      country: address.country,
    },
  });
});

// PayHere's server-to-server notification. This, not the browser callback, decides payment state.
const payhereNotify = asyncHandler(async (req, res) => {
  const config = getConfig();
  if (!config) {
    res.status(503).send("Not configured");
    return;
  }

  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, payment_id } = req.body ?? {};
  const signatureOk =
    merchant_id === config.merchantId &&
    verifyNotifySignature({
      merchantId: config.merchantId,
      merchantSecret: config.merchantSecret,
      orderId: order_id,
      payhereAmount: payhere_amount,
      payhereCurrency: payhere_currency,
      statusCode: status_code,
      signature: md5sig,
    });
  if (!signatureOk) {
    res.status(400).send("Invalid signature");
    return;
  }

  const order = await Order.findOne({ orderNumber: String(order_id) });
  if (!order) {
    res.status(404).send("Unknown order");
    return;
  }

  if (payhere_currency !== CURRENCY || formatAmount(payhere_amount) !== formatAmount(order.total)) {
    await addTimeline(order._id, order.status, `PayHere notification ignored: amount or currency did not match (${payhere_amount} ${payhere_currency})`);
    res.status(400).send("Amount mismatch");
    return;
  }

  switch (String(status_code)) {
    case STATUS.SUCCESS:
      await applyPaymentSuccess(order._id, { paymentId: String(payment_id ?? ""), message: "Payment received, order confirmed" });
      break;
    case STATUS.FAILED:
      await applyPaymentFailure(order._id, "Payment failed, awaiting retry");
      break;
    case STATUS.CHARGEDBACK:
      await applyChargeback(order._id);
      break;
    case STATUS.CANCELED:
      await addTimeline(order._id, order.status, "Payment cancelled by the customer");
      break;
    default:
      break; // Pending: wait for the next notification.
  }

  res.send("OK");
});

// Local-testing shortcut: PayHere can't call a localhost notify URL, so in sandbox mode outside
// production the checkout page can confirm a test payment by hand. Never available for live keys.
const sandboxConfirm = asyncHandler(async (req, res) => {
  const config = getConfig();
  if (!config?.sandbox || process.env.NODE_ENV === "production") {
    res.status(404);
    throw new Error("Not found");
  }

  const order = await findAccessibleOrder(req, res);
  const updated = await applyPaymentSuccess(order._id, {
    paymentId: "SANDBOX-TEST",
    message: "Payment marked received in sandbox test mode (not verified by PayHere)",
  });
  const fresh = await Order.findById(order._id);
  res.json({ order: publicOrder(fresh), alreadyPaid: !updated });
});

module.exports = { paymentConfig, createPayHerePayment, payhereNotify, sandboxConfirm };
