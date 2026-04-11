const models = require("../models");
const { connectDatabase } = require("../config/db");
const { getNowString } = require("../utils/dateTime");

function createId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function sanitizeAuditValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }
  if (value && typeof value === "object") {
    const next = {};
    Object.keys(value).forEach((key) => {
      if (key === "passwordHash") {
        return;
      }
      if (key === "token") {
        next[key] = "***masked***";
        return;
      }
      next[key] = sanitizeAuditValue(value[key]);
    });
    return next;
  }
  return value;
}

function serializeOperationLog(item) {
  if (!item) {
    return item;
  }
  const { _id, __v, ...safeItem } = item;
  return safeItem;
}

function resolveActorInfo(req, entry) {
  if (entry.actorType || entry.actorId || entry.actorName) {
    return {
      actorType: normalizeText(entry.actorType),
      actorId: normalizeText(entry.actorId),
      actorName: normalizeText(entry.actorName),
    };
  }

  const auth = req.auth || {};
  if (auth.tokenType === "admin") {
    return {
      actorType: "admin",
      actorId: normalizeText(auth.adminId),
      actorName: normalizeText(auth.username),
    };
  }
  if (auth.tokenType === "user") {
    return {
      actorType: "user",
      actorId: normalizeText(auth.userId),
      actorName: normalizeText(auth.phone),
    };
  }

  return {
    actorType: "",
    actorId: "",
    actorName: "",
  };
}

async function recordOperationLog(entry) {
  await connectDatabase();
  const document = {
    id: createId("LOG-"),
    module: normalizeText(entry.module),
    action: normalizeText(entry.action),
    result: normalizeText(entry.result || "success"),
    actorType: normalizeText(entry.actorType),
    actorId: normalizeText(entry.actorId),
    actorName: normalizeText(entry.actorName),
    targetType: normalizeText(entry.targetType),
    targetId: normalizeText(entry.targetId),
    targetName: normalizeText(entry.targetName),
    method: normalizeText(entry.method),
    path: normalizeText(entry.path),
    ip: normalizeText(entry.ip),
    userAgent: normalizeText(entry.userAgent),
    message: normalizeText(entry.message),
    detail: entry.detail || {},
    responseData: sanitizeAuditValue(entry.responseData),
    statusCode: Number(entry.statusCode) || 200,
    createdAt: entry.createdAt || getNowString(),
  };

  await models.OperationLog.create(document);
  return document;
}

async function recordRequestAuditLog(req) {
  if (!req.auditLog || req.auditLog.logged) {
    return null;
  }

  const actor = resolveActorInfo(req, req.auditLog);
  const result = req.auditLog.result || (req.res.statusCode >= 400 ? "failure" : "success");
  const message = req.auditErrorMessage || req.auditLog.message || (result === "success" ? "操作成功" : "操作失败");
  const document = await recordOperationLog({
    ...req.auditLog,
    ...actor,
    result,
    message,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.ip || req.connection?.remoteAddress || "",
    userAgent: req.get("user-agent") || "",
    statusCode: req.res.statusCode,
    responseData: req.auditResponseData,
  });
  req.auditLog.logged = true;
  return document;
}

async function listOperationLogs(query) {
  await connectDatabase();
  const keyword = normalizeText(query.keyword).toLowerCase();
  const moduleName = normalizeText(query.module);
  const action = normalizeText(query.action);
  const result = normalizeText(query.result);
  const actorType = normalizeText(query.actorType);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

  const items = await models.OperationLog.find({})
    .sort({ createdAt: -1 })
    .lean();

  return items
    .filter((item) => !moduleName || item.module === moduleName)
    .filter((item) => !action || item.action === action)
    .filter((item) => !result || item.result === result)
    .filter((item) => !actorType || item.actorType === actorType)
    .filter((item) => {
      if (!keyword) {
        return true;
      }
      const text = [
        item.id,
        item.module,
        item.action,
        item.actorName,
        item.actorId,
        item.targetName,
        item.targetId,
        item.message,
        item.path,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(keyword);
    })
    .map((item) => serializeOperationLog(item))
    .slice(0, limit);
}

module.exports = {
  listOperationLogs,
  recordOperationLog,
  recordRequestAuditLog,
};
