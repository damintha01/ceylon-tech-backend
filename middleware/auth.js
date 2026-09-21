const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { COOKIE_NAME } = require("../utils/generateToken");

async function loadUserFromCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const user = await User.findById(decoded.id);
  return user && user.isActive ? user : null;
}

const protect = asyncHandler(async (req, res, next) => {
  const user = await loadUserFromCookie(req);
  if (!user) {
    res.status(401);
    throw new Error("Not authenticated");
  }
  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = await loadUserFromCookie(req);
  next();
});

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "owner") {
    res.status(403);
    throw new Error("Not authorised");
  }
  next();
}

module.exports = { protect, optionalAuth, requireOwner };
