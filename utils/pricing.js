// Delivery rules (LKR). Prices in the catalogue are final, so no tax is added on top.
const FREE_SHIPPING_THRESHOLD = 25000;
const FLAT_SHIPPING = 990;

function buildPricing(subtotal) {
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  return { subtotal, shippingCost, discount: 0, tax: 0, total: subtotal + shippingCost };
}

module.exports = { buildPricing, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING };
