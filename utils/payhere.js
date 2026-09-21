const crypto = require("crypto");

const CURRENCY = "LKR";
const STATUS = { SUCCESS: "2", PENDING: "0", CANCELED: "-1", FAILED: "-2", CHARGEDBACK: "-3" };

const md5Upper = (value) => crypto.createHash("md5").update(value).digest("hex").toUpperCase();
const formatAmount = (amount) => Number(amount).toFixed(2);

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Returns null while the PayHere keys are missing or still the template placeholders.
function getConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  const backendUrl = process.env.BACKEND_BASE_URL;
  const missing = (value) => !value || /^your_/i.test(value);
  if (missing(merchantId) || missing(merchantSecret) || missing(backendUrl)) return null;

  return {
    merchantId,
    merchantSecret,
    // Anything other than PAYHERE_MODE=live is treated as sandbox, so a missing value never takes real payments.
    sandbox: (process.env.PAYHERE_MODE || "sandbox").toLowerCase() !== "live",
    notifyUrl: `${backendUrl.replace(/\/$/, "")}/api/payments/payhere/notify`,
  };
}

// md5(merchant_id + order_id + amount + currency + UPPER(md5(merchant_secret))), upper-cased.
function generateCheckoutHash({ merchantId, merchantSecret, orderId, amount }) {
  return md5Upper(`${merchantId}${orderId}${formatAmount(amount)}${CURRENCY}${md5Upper(merchantSecret)}`);
}

// md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(md5(merchant_secret))).
function verifyNotifySignature({ merchantId, merchantSecret, orderId, payhereAmount, payhereCurrency, statusCode, signature }) {
  const expected = md5Upper(`${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${md5Upper(merchantSecret)}`);
  return safeEqual(expected, String(signature ?? "").toUpperCase());
}

module.exports = { CURRENCY, STATUS, formatAmount, getConfig, generateCheckoutHash, verifyNotifySignature, safeEqual };
