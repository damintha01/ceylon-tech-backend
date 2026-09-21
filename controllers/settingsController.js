const asyncHandler = require("express-async-handler");
const Settings = require("../models/Settings");

const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ key: "site" });
  if (!settings) {
    settings = await Settings.create({ key: "site", config: {} });
  }
  res.json({ settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const incoming = req.body?.config ?? req.body ?? {};
  const settings = await Settings.findOneAndUpdate(
    { key: "site" },
    { $set: Object.fromEntries(Object.entries(incoming).map(([k, v]) => [`config.${k}`, v])) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ settings });
});

module.exports = { getSettings, updateSettings };
