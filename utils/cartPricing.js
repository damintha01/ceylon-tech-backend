const Product = require("../models/Product");
const { buildPricing } = require("./pricing");

const MAX_QUANTITY = 10;
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Prices a cart from live product data. Client-supplied prices are never used: only product ids,
// variant ids and quantities are read from `rawItems`.
async function priceCart(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems.slice(0, 50) : [];

  // Merge duplicate product/variant lines so stock is checked against the combined quantity.
  const merged = new Map();
  for (const item of items) {
    const key = `${item?.productId}:${item?.variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity = Number(existing.quantity) + Number(item?.quantity);
    else merged.set(key, { productId: item?.productId, variantId: item?.variantId, quantity: item?.quantity });
  }

  const ids = [...new Set([...merged.values()].map((i) => String(i.productId)).filter((id) => OBJECT_ID.test(id)))];
  const products = await Product.find({ _id: { $in: ids }, isVisible: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const issues = [];

  for (const item of merged.values()) {
    const ref = { productId: item.productId, variantId: item.variantId };
    const product = byId.get(String(item.productId));
    const quantity = Number(item.quantity);

    if (!product) {
      issues.push({ ...ref, message: "This product is no longer available." });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      issues.push({ ...ref, message: `${product.name}: quantity must be between 1 and ${MAX_QUANTITY}.` });
      continue;
    }

    let variant = null;
    if (product.variants.length) {
      variant = item.variantId ? product.variants.id(item.variantId) : null;
      if (!variant) {
        issues.push({ ...ref, message: `${product.name}: that option is no longer available.` });
        continue;
      }
    }

    const name = variant ? `${product.name} (${variant.value})` : product.name;
    const available = variant ? variant.stock : product.stock;
    if (available < quantity) {
      issues.push({ ...ref, message: available > 0 ? `${name}: only ${available} left in stock.` : `${name} is out of stock.` });
      continue;
    }

    lines.push({
      product: product._id,
      variantId: variant?._id,
      name,
      image: product.images?.[0] ?? "",
      price: product.price,
      quantity,
      lineTotal: product.price * quantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, issues, ...buildPricing(subtotal) };
}

module.exports = { priceCart };
