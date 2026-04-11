const path = require("path");
const multer = require("multer");
const AppError = require("../utils/appError");
const { getUploadDir } = require("../services/uploadService");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, getUploadDir());
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const safeName = path.basename(file.originalname || "image", ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${Math.floor(Math.random() * 1000)}-${safeName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    cb(new AppError("只允许上传图片文件", 400));
    return;
  }
  cb(null, true);
}

const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  uploadImage,
};
