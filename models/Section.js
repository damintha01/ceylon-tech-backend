const mongoose = require("mongoose");

const SECTION_TYPES = ["hero", "benefits", "categoryGrid", "productGrid", "spotlight", "newsletter"];

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: SECTION_TYPES },
    isBuiltIn: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Section", sectionSchema);
module.exports.SECTION_TYPES = SECTION_TYPES;
