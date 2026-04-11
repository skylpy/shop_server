const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { success } = require("../utils/response");
const { buildUploadedImagePayload } = require("../services/uploadService");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("请选择要上传的图片", 400);
  }

  const data = buildUploadedImagePayload(req, req.file);
  req.auditLog = {
    module: "media",
    action: "upload",
    targetType: "image",
    targetId: data.fileName,
    targetName: data.originalName,
    message: "上传图片",
    detail: {
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      path: data.path,
    },
  };
  return success(res, data, "图片上传成功");
});

module.exports = {
  uploadImage,
};
