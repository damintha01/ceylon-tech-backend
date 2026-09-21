const asyncHandler = require("express-async-handler");
const { uploadBuffer, deleteImage } = require("../utils/cloudinary");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const folder = req.query.folder || "ceylon-tech";
  const result = await uploadBuffer(req.file.buffer, folder);
  res.status(201).json({ image: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height } });
});

const removeImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) {
    res.status(400);
    throw new Error("publicId is required");
  }
  await deleteImage(publicId);
  res.json({ deleted: true });
});

module.exports = { uploadImage, removeImage };
