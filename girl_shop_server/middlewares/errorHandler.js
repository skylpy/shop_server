const logger = require("../utils/logger");
const { fail } = require("../utils/response");

function notFoundHandler(req, res) {
  return fail(res, "接口不存在", 404);
}

function errorHandler(err, req, res, next) {
  req.auditErrorMessage = err.message || "server error";
  if (err && err.code === "LIMIT_FILE_SIZE") {
    err.statusCode = 400;
    err.message = "上传图片不能超过 10MB";
  }
  logger.error(err.stack || err.message || err);
  return fail(res, err.message || "server error", err.statusCode || 500);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
