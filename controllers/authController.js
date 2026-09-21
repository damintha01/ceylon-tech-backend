const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { setAuthCookie, clearAuthCookie } = require("../utils/generateToken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }
  if (name.trim().length < 2) {
    res.status(400);
    throw new Error("Enter your full name");
  }
  if (!EMAIL_RE.test(email.trim())) {
    res.status(400);
    throw new Error("Enter a valid email address");
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409);
    throw new Error("An account with that email already exists");
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashed });

  setAuthCookie(res, user._id);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Incorrect email or password");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    res.status(401);
    throw new Error("Incorrect email or password");
  }

  setAuthCookie(res, user._id);
  res.json({ user });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user ?? null });
});

module.exports = { register, login, logout, me };
