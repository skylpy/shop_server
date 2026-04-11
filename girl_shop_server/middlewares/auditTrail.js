const logger = require("../utils/logger");
const { recordRequestAuditLog } = require("../services/operationLogService");

function auditTrail(req, res, next) {
  res.on("finish", () => {
    if (!req.auditLog) {
      return;
    }
    recordRequestAuditLog(req).catch((error) => {
      logger.error("audit log write failed:", error.message);
    });
  });
  next();
}

module.exports = auditTrail;
