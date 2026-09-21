require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Category = require("../models/Category");
const Product = require("../models/Product");
const Section = require("../models/Section");
const User = require("../models/User");

const PHONE_IMG = "/images/phone-showcase.jpg";
const LAPTOP_IMG = "/images/laptop-showcase.jpg";
const ACCESSORIES_IMG = "/images/accessories-showcase.jpg";

const CATEGORIES = [
  { name: "Mobile Phones", slug: "mobile-phones", description: "Latest smartphones for everyday performance.", image: PHONE_IMG, order: 0 },
  { name: "Laptops", slug: "laptops", description: "Power for work, study, and creativity.", image: LAPTOP_IMG, order: 1 },
  { name: "Tablets", slug: "tablets", description: "Portable creativity and entertainment.", image: PHONE_IMG, order: 2 },
  { name: "Accessories", slug: "accessories", description: "Essential extras for every device.", image: ACCESSORIES_IMG, order: 3 },
  { name: "Smart Devices", slug: "smart-devices", description: "Smarter technology for daily life.", image: ACCESSORIES_IMG, order: 4 },
];

const PRODUCTS = [
  { name: "iPhone 16 Pro", brand: "Apple", categorySlug: "mobile-phones", price: 389900, comparePrice: 419900, image: PHONE_IMG, tags: ["sale"], isFeatured: true, description: "A flagship titanium smartphone with pro camera controls and all-day performance.", specs: { Processor: "A18 Pro", RAM: "8GB", Camera: "48MP Fusion", Display: "6.3-inch OLED" }, storage: ["128GB", "256GB", "512GB"] },
  { name: "Galaxy S25 Ultra", brand: "Samsung", categorySlug: "mobile-phones", price: 359900, comparePrice: 389900, image: PHONE_IMG, tags: ["bestseller"], isFeatured: true, description: "Galaxy AI performance, an advanced camera system, and an expansive premium display.", specs: { Processor: "Snapdragon 8 Elite", RAM: "12GB", Camera: "200MP", Display: "6.9-inch AMOLED" }, storage: ["256GB", "512GB"] },
  { name: "Pixel 9 Pro", brand: "Google", categorySlug: "mobile-phones", price: 289900, image: PHONE_IMG, tags: ["new"], isFeatured: true, description: "An intelligent camera-first phone with a refined compact design.", specs: { Processor: "Tensor G4", RAM: "16GB", Camera: "50MP", Display: "6.3-inch OLED" }, storage: ["128GB", "256GB"] },
  { name: "Xiaomi 14T Pro", brand: "Xiaomi", categorySlug: "mobile-phones", price: 219900, comparePrice: 239900, image: PHONE_IMG, tags: ["sale"], isFeatured: true, description: "Flagship speed and versatile photography at an exceptional value.", specs: { Processor: "Dimensity 9300+", RAM: "12GB", Camera: "50MP", Display: "6.67-inch AMOLED" }, storage: ["256GB", "512GB"] },
  { name: "MacBook Air 13-inch M4", brand: "Apple", categorySlug: "laptops", price: 399900, comparePrice: 429900, image: LAPTOP_IMG, tags: ["new"], isFeatured: true, description: "Remarkably thin, quiet, and powerful for work, study, and creative projects.", specs: { Processor: "Apple M4", RAM: "16GB", Storage: "512GB SSD", Display: "13.6-inch Liquid Retina" } },
  { name: "Zenbook 14 OLED", brand: "ASUS", categorySlug: "laptops", price: 329900, image: LAPTOP_IMG, tags: ["featured"], isFeatured: true, description: "A precision-crafted OLED laptop for productive days and creative work.", specs: { Processor: "Intel Core Ultra 7", RAM: "16GB", Storage: "1TB SSD", Display: "14-inch OLED" } },
  { name: "Yoga Slim 7i Aura", brand: "Lenovo", categorySlug: "laptops", price: 349900, comparePrice: 369900, image: LAPTOP_IMG, tags: ["sale"], isFeatured: true, description: "A premium AI PC balancing effortless portability and enduring performance.", specs: { Processor: "Intel Core Ultra 7", RAM: "32GB", Storage: "1TB SSD", Display: "15.3-inch 2.8K" } },
  { name: "iPad Air 11-inch M3", brand: "Apple", categorySlug: "tablets", price: 219900, image: PHONE_IMG, tags: ["new"], isFeatured: true, description: "A powerful, versatile tablet for creativity, study, and entertainment.", specs: { Processor: "Apple M3", RAM: "8GB", Camera: "12MP", Display: "11-inch Liquid Retina" }, storage: ["128GB", "256GB"] },
  { name: "WH-1000XM5 Headphones", brand: "Sony", categorySlug: "accessories", price: 109900, comparePrice: 124900, image: ACCESSORIES_IMG, tags: ["sale"], description: "Industry-leading noise cancellation with rich, detailed sound.", specs: { Type: "Over-ear", Connectivity: "Bluetooth 5.2", Battery: "30 hours" } },
  { name: "AirPods Pro (2nd Gen)", brand: "Apple", categorySlug: "accessories", price: 84900, image: ACCESSORIES_IMG, tags: ["bestseller"], description: "Immersive audio, adaptive noise control, and a comfortable fit.", specs: { Type: "In-ear", Connectivity: "Bluetooth", Battery: "30 hours with case" } },
  { name: "MX Master 3S", brand: "Logitech", categorySlug: "accessories", price: 39900, image: ACCESSORIES_IMG, tags: [], description: "An iconic quiet performance mouse designed for focused productivity.", specs: { Sensor: "8000 DPI", Connectivity: "Bluetooth / USB", Battery: "70 days" } },
  { name: "Galaxy Watch7", brand: "Samsung", categorySlug: "smart-devices", price: 89900, comparePrice: 99900, image: ACCESSORIES_IMG, tags: ["sale"], description: "Advanced wellness insights and everyday connectivity on your wrist.", specs: { Display: "1.5-inch AMOLED", Connectivity: "Bluetooth / Wi-Fi", Battery: "40 hours" } },
];

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for seeding");

  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Section.deleteMany({})]);

  const categories = await Category.insertMany(CATEGORIES);
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const products = [];
  for (const p of PRODUCTS) {
    const variants = (p.storage ?? []).map((value, i) => ({
      label: "Storage",
      value,
      stock: 8 + i * 4,
      sku: `${slugify(p.name)}-${slugify(value)}`,
    }));
    const product = await Product.create({
      name: p.name,
      slug: slugify(p.name),
      brand: p.brand,
      description: p.description,
      price: p.price,
      comparePrice: p.comparePrice,
      images: [p.image],
      category: categoryBySlug[p.categorySlug]._id,
      specs: p.specs,
      variants,
      stock: variants.length ? undefined : 25,
      tags: p.tags,
      isFeatured: Boolean(p.isFeatured),
      isVisible: true,
    });
    products.push(product);
  }
  const productBySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

  const featuredIds = products.slice(0, 8).map((p) => p._id);
  const justLandedIds = ["pixel-9-pro", "xiaomi-14t-pro", "macbook-air-13-inch-m4", "zenbook-14-oled", "yoga-slim-7i-aura"]
    .map((slug) => productBySlug[slug]?._id)
    .filter(Boolean);
  const categoryIds = categories.map((c) => c._id);

  const benefitItems = [
    { icon: "badge-check", title: "Genuine Products", text: "Only authentic devices" },
    { icon: "truck", title: "Islandwide Delivery", text: "Reliable nationwide service" },
    { icon: "shield-check", title: "Warranty Support", text: "Confidence after purchase" },
    { icon: "credit-card", title: "Secure Payments", text: "Protected every step" },
  ];

  await Section.insertMany([
    {
      name: "Hero Banner",
      type: "hero",
      order: 0,
      isBuiltIn: true,
      config: {
        eyebrow: "Technology. Simplified.",
        headline: "Technology that moves with you.",
        description: "Discover premium smartphones, laptops, accessories, and smart devices built for the way you live and work.",
        image: "/images/ceylon-tech-hero.jpg",
        primaryCta: { label: "Shop Now", href: "/mobile-phones" },
        secondaryCta: { label: "Explore Products", href: "/laptops" },
      },
    },
    {
      name: "Benefits Strip",
      type: "benefits",
      order: 1,
      isBuiltIn: true,
      config: { variant: "strip", items: benefitItems },
    },
    {
      name: "Shop by Category",
      type: "categoryGrid",
      order: 2,
      config: {
        eyebrow: "Explore the store",
        title: "Shop by category",
        copy: "Everything you need to work smarter, create more, and stay connected.",
      },
      categories: categoryIds,
    },
    {
      name: "Featured Technology",
      type: "productGrid",
      order: 3,
      config: {
        eyebrow: "Our edit",
        title: "Featured technology",
        copy: "Standout devices selected for performance, design, and everyday value.",
        layout: "grid",
        source: "manual",
      },
      products: featuredIds,
    },
    {
      name: "Product Spotlight",
      type: "spotlight",
      order: 4,
      config: {
        eyebrow: "Product spotlight",
        title: "Meet your next upgrade.",
        description: "The new MacBook Air brings remarkable M4 performance to an impossibly thin design. Ready for work, study, and everything between.",
        image: "/images/laptop-showcase.jpg",
        stats: [
          { label: "Processor", value: "M4" },
          { label: "Memory", value: "16GB" },
          { label: "Battery", value: "18 hrs" },
        ],
        priceLabel: "From Rs. 399,900",
        cta: { label: "Explore Product", href: `/products/${productBySlug["macbook-air-13-inch-m4"]?.slug ?? ""}` },
      },
      products: productBySlug["macbook-air-13-inch-m4"] ? [productBySlug["macbook-air-13-inch-m4"]._id] : [],
    },
    {
      name: "Just Landed",
      type: "productGrid",
      order: 5,
      config: {
        eyebrow: "Fresh from the box",
        title: "Just landed",
        layout: "carousel",
        source: "manual",
      },
      products: justLandedIds,
    },
    {
      name: "Why Ceylon Tech",
      type: "benefits",
      order: 6,
      isBuiltIn: true,
      config: {
        variant: "grid",
        eyebrow: "Shopping with confidence",
        title: "Why Ceylon Tech?",
        items: benefitItems.map((item) => ({ ...item, text: `${item.text}. Friendly experts are here whenever you need us.` })),
      },
    },
    {
      name: "Newsletter Signup",
      type: "newsletter",
      order: 7,
      isBuiltIn: true,
      config: {
        eyebrow: "Stay in the know",
        title: "Stay ahead of technology.",
        description: "New arrivals, exclusive offers, and useful technology guides—sent thoughtfully.",
      },
    },
  ]);

  const ownerEmail = "admin@ceylontech.lk";
  const ownerPassword = "CeylonAdmin123!";
  await User.deleteOne({ email: ownerEmail });
  await User.create({
    name: "Ceylon Tech Admin",
    email: ownerEmail,
    password: await bcrypt.hash(ownerPassword, 12),
    role: "owner",
  });

  console.log(`Seeded ${categories.length} categories, ${products.length} products, 8 sections.`);
  console.log(`Owner login -> email: ${ownerEmail}  password: ${ownerPassword}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
