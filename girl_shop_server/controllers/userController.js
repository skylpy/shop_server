const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const userService = require("../services/userService");

const register = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user_auth",
    action: "register",
    targetType: "user",
    actorType: "user",
    actorName: String(req.body?.phone || "").trim(),
    message: "商城用户注册",
    detail: {
      phone: String(req.body?.phone || "").trim(),
    },
  };
  const data = await userService.register(req.body || {});
  req.auditLog.actorId = data.profile.id;
  req.auditLog.targetId = data.profile.id;
  req.auditLog.targetName = data.profile.nickname || data.profile.phone;
  return success(res, data, "注册成功");
});

const login = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user_auth",
    action: "login",
    targetType: "user",
    actorType: "user",
    actorName: String(req.body?.phone || "").trim(),
    message: "商城用户登录",
    detail: {
      phone: String(req.body?.phone || "").trim(),
    },
  };
  const data = await userService.login(req.body || {});
  req.auditLog.actorId = data.profile.id;
  req.auditLog.targetId = data.profile.id;
  req.auditLog.targetName = data.profile.nickname || data.profile.phone;
  return success(res, data, "登录成功");
});

const profile = asyncHandler(async (req, res) => {
  return success(res, await userService.getProfile(req.auth.userId));
});

const logout = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user_auth",
    action: "logout",
    actorType: "user",
    actorId: req.auth.userId,
    actorName: req.auth.phone,
    targetType: "user",
    targetId: req.auth.userId,
    targetName: req.auth.phone,
    message: "商城用户退出登录",
  };
  return success(res, true, "已退出登录");
});

module.exports = {
  login,
  logout,
  profile,
  register,
};
