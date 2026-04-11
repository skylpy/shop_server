const fs = require("fs");
const path = require("path");
const { getBaseUrl } = require("../utils/shopMapper");

const uploadDir = path.resolve(__dirname, "../public/images/uploadImage");

function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function getUploadDir() {
  ensureUploadDir();
  return uploadDir;
}

function buildUploadedImagePayload(req, file) {
  const relativePath = `/images/uploadImage/${file.filename}`;
  return {
    path: relativePath,
    url: `${getBaseUrl(req)}${relativePath}`,
    fileName: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
}

module.exports = {
  buildUploadedImagePayload,
  getUploadDir,
};
