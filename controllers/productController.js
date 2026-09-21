const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const Section = require("../models/Section");
const slugify = require("../utils/slugify");

const SORTS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  name: { name: 1 },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listProducts = asyncHandler(async (req, res) => {
  const { search, tag, category, featured, onSale, sort = "newest", page = 1, limit = 20 } = req.query;
  const filter = { isVisible: true };
  if (search) {
    const pattern = new RegExp(escapeRegex(String(search)), "i");
    filter.$or = [{ name: pattern }, { brand: pattern }, { description: pattern }];
  }
  if (tag) filter.tags = tag;
  if (category) filter.category = category;
  if (featured === "true") filter.isFeatured = true;
  if (onSale === "true") filter.$expr = { $gt: ["$comparePrice", "$price"] };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 20));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(SORTS[sort] ?? SORTS.newest)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

const listProductsByIds = asyncHandler(async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-f0-9]{24}$/i.test(id))
    .slice(0, 50);
  const products = await Product.find({ _id: { $in: ids }, isVisible: true }).populate("category", "name slug");
  res.json({ products });
});

const listAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().populate("category", "name slug").sort({ createdAt: -1 });
  res.json({ products });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isVisible: true }).populate("category", "name slug");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ product });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category", "name slug");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ product });
});

const createProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.name) body.slug = slugify(body.name);
  const product = await Product.create(body);
  res.status(201).json({ product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  Object.assign(product, req.body);
  await product.save();
  res.json({ product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  await Section.updateMany({ products: product._id }, { $pull: { products: product._id } });
  res.json({ message: "Product deleted" });
});

const addVariant = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.variants.push(req.body);
  await product.save();
  res.status(201).json({ product });
});

const updateVariant = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const variant = product.variants.id(req.body.variantId);
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  Object.assign(variant, req.body);
  await product.save();
  res.json({ product });
});

const deleteVariant = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.variants.pull(req.body.variantId);
  await product.save();
  res.json({ product });
});

module.exports = {
  listProducts,
  listProductsByIds,
  listAllProducts,
  getProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
};
