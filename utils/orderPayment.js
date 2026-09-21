const Order = require("../models/Order");
const Product = require("../models/Product");

const entry = (status, message) => ({ status, message, timestamp: new Date() });

// Stock is taken when payment succeeds (not when the order is created), so abandoned checkouts
// never hold stock. Each decrement is atomic and keeps totalStock in step with the variants.
async function deductStock(order) {
  const shortages = [];

  for (const item of order.items) {
    if (!item.product) continue;
    const byVariant = Boolean(item.variantId);
    const filter = byVariant
      ? { _id: item.product, variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } } }
      : { _id: item.product, stock: { $gte: item.quantity } };
    const update = byVariant
      ? { $inc: { "variants.$.stock": -item.quantity, totalStock: -item.quantity } }
      : { $inc: { stock: -item.quantity, totalStock: -item.quantity } };

    const result = await Product.updateOne(filter, update);
    if (result.modifiedCount === 0) shortages.push(item.name);
  }

  if (shortages.length) {
    await Order.updateOne(
      { _id: order._id },
      { $push: { timeline: entry(order.status, `Paid, but stock ran short for: ${shortages.join(", ")}. Needs attention.`) } }
    );
  }
}

// Marks an order paid exactly once. Returns null if it was already paid (duplicate notification).
async function applyPaymentSuccess(orderId, { paymentId, message }) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    {
      $set: { paymentStatus: "paid", status: "confirmed", paymentIntentId: paymentId },
      $push: { timeline: entry("confirmed", message) },
    },
    { new: true }
  );
  if (!order) return null;
  await deductStock(order);
  return order;
}

async function applyPaymentFailure(orderId, message) {
  return Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $nin: ["paid", "refunded"] } },
    { $set: { paymentStatus: "failed" }, $push: { timeline: entry("pending", message) } },
    { new: true }
  );
}

async function applyChargeback(orderId) {
  return Order.findOneAndUpdate(
    { _id: orderId },
    {
      $set: { paymentStatus: "refunded", status: "refunded" },
      $push: { timeline: entry("refunded", "Payment was charged back") },
    },
    { new: true }
  );
}

async function addTimeline(orderId, status, message) {
  await Order.updateOne({ _id: orderId }, { $push: { timeline: entry(status, message) } });
}

module.exports = { applyPaymentSuccess, applyPaymentFailure, applyChargeback, addTimeline };
