const { safeEqual } = require("./payhere");

// An order can be read by the shop owner, by the signed-in customer who placed it, or by a guest
// who holds the order's access token (returned once, when the order is created).
function canAccessOrder(user, order, token) {
  if (user?.role === "owner") return true;
  if (user && order.user && String(order.user) === String(user._id)) return true;
  return Boolean(token) && Boolean(order.accessToken) && safeEqual(token, order.accessToken);
}

function publicOrder(order) {
  const data = order.toJSON();
  delete data.accessToken;
  return data;
}

module.exports = { canAccessOrder, publicOrder };
