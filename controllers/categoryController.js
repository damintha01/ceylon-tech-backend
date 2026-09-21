const asyncHandler = require("express-async-handler");
const Category = require("../models/Category");
const Product = require("../models/Product");
const slugify = require("../utils/slugify");

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isVisible: true }).sort({ order: 1 });
  res.json({ categories });
});

const listAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1 });
  res.json({ categories });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isVisible: true });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ category });
});

const createCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.name) body.slug = slugify(body.name);
  const category = await Category.create(body);
  res.status(201).json({ category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  if (await Product.exists({ category: req.params.id })) {
    res.status(409);
    throw new Error("This category still has products. Move or delete them first.");
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ message: "Category deleted" });
});

module.exports = { listCategories, listAllCategories, getCategory, createCategory, updateCategory, deleteCategory };
