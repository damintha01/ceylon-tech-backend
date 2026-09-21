const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Counter = require("../models/Counter");
const { priceCart } = require("../utils/cartPricing");
const { canAccessOrder, publicOrder } = require("../utils/orderAccess");
const { CURRENCY, getConfig } = require("../utils/payhere");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const text = (value) => (typeof value === "string" ? value.trim() : "");

const publicLine = ({ product, variantId, name, image, price, quantity, lineTotal }) => ({
  productId: product,
  variantId,
  name,
  image,
  price,
  quantity,
  lineTotal,
});

// Returns { email, address } or throws a 400 with a message the checkout form can show.
function parseOrderInput(body, res) {
  const fail = (message) => {
    res.status(400);
    throw new Error(message);
  };
  const a = body?.shippingAddress ?? {};
  const email = text(body?.email);
  const fullName = text(a.fullName);
  const phone = text(a.phone).replace(/[\s\-()]/g, "");
  const line1 = text(a.line1);
  const city = text(a.city);
  const zip = text(a.zip);

  if (!EMAIL_RE.test(email)) fail("Enter a valid email address.");
  if (fullName.split(/\s+/).filter(Boolean).length < 2) fail("Enter your first and last name.");
  if (!/^\+?\d{9,15}$/.test(phone)) fail("Enter a valid phone number.");
  if (!line1) fail("Address line 1 is required.");
  if (!city) fail("City is required.");
  if (!/^\d{5}$/.test(zip)) fail("Postal code must be 5 digits.");

  return {
    email,
    address: { fullName, line1, line2: text(a.line2), city, state: text(a.state), zip, country: "Sri Lanka", phone },
  };
}

// Live price preview for the checkout page. Same pricing code the order uses.
const quote = asyncHandler(async (req, res) => {
  const priced = await priceCart(req.body?.items);
  const config = getConfig();
  res.json({
    lines: priced.lines.map(publicLine),
    issues: priced.issues,
    subtotal: priced.subtotal,
    shippingCost: priced.shippingCost,
    discount: priced.discount,
    tax: priced.tax,
    total: priced.total,
    currency: CURRENCY,
    payments: { available: Boolean(config), sandbox: config ? config.sandbox : true },
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const { email, address } = parseOrderInput(req.body, res);

  const priced = await priceCart(req.body?.items);
  if (priced.issues.length) {
    res.status(409).json({ error: "Some items in your cart have changed.", issues: priced.issues });
    return;
  }
  if (!priced.lines.length) {
    res.status(400);
    throw new Error("Your cart is empty.");
  }

  const counter = await Counter.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  const accessToken = crypto.randomBytes(24).toString("hex");

  const order = await Order.create({
    orderNumber: `CT-${10000 + counter.seq}`,
    user: req.user?._id,
    email,
    items: priced.lines.map(({ product, variantId, name, image, price, quantity }) => ({ product, variantId, name, image, price, quantity })),
    shippingAddress: address,
    shippingMethod: "standard",
    subtotal: priced.subtotal,
    shippingCost: priced.shippingCost,
    discount: priced.discount,
    tax: priced.tax,
    total: priced.total,
    accessToken,
    timeline: [{ status: "pending", message: "Order placed, awaiting payment" }],
  });

  res.status(201).json({ order: publicOrder(order), accessToken });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select("+accessToken");
  if (!order || !canAccessOrder(req.user, order, req.query.token)) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.json({ order: publicOrder(order) });
});

module.exports = { quote, createOrder, getOrder };
