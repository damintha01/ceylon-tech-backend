const asyncHandler = require("express-async-handler");
const Section = require("../models/Section");
const Product = require("../models/Product");

const POPULATE = [
  { path: "categories" },
  { path: "products", populate: { path: "category", select: "name slug" } },
];

async function withNewArrivals(sections) {
  return Promise.all(
    sections.map(async (section) => {
      if (section.type !== "productGrid" || section.config?.source !== "newArrivals") return section;
      const limit = Math.min(Number(section.config.limit) || 8, 24);
      const products = await Product.find({ isVisible: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("category", "name slug");
      return { ...section.toJSON(), products };
    })
  );
}

const listVisibleSections = asyncHandler(async (req, res) => {
  const sections = await Section.find({ isVisible: true }).sort({ order: 1 }).populate(POPULATE);
  res.json({ sections: await withNewArrivals(sections) });
});

const listAllSections = asyncHandler(async (req, res) => {
  const sections = await Section.find().sort({ order: 1 }).populate(POPULATE);
  res.json({ sections });
});

const createSection = asyncHandler(async (req, res) => {
  const { name, type, order } = req.body;
  if (!name || !type || order === undefined || order === null) {
    res.status(400);
    throw new Error("name, type, and order are required");
  }
  const section = await Section.create({
    name,
    type,
    order,
    isBuiltIn: Boolean(req.body.isBuiltIn),
    isVisible: req.body.isVisible !== false,
    config: req.body.config ?? {},
    categories: req.body.categories ?? [],
    products: req.body.products ?? [],
  });
  await section.populate(POPULATE);
  res.status(201).json({ section });
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate(
    POPULATE
  );
  if (!section) {
    res.status(404);
    throw new Error("Section not found");
  }
  res.json({ section });
});

const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) {
    res.status(404);
    throw new Error("Section not found");
  }
  if (section.isBuiltIn) {
    res.status(403);
    throw new Error("Built-in sections cannot be deleted");
  }
  await section.deleteOne();
  res.json({ message: "Section deleted" });
});

module.exports = { listVisibleSections, listAllSections, createSection, updateSection, deleteSection };
