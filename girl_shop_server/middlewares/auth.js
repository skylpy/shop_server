const AppError = require("../utils/appError");
const { getAccessToken, verifyAuthToken } = require("../services/securityService");

function createAuthMiddleware(expectedType, principalKey, invalidMessage) {
  return function authMiddleware(req, res, next) {
    const token = getAccessToken(req);
    if (!token) {
      return next(new AppError("未登录或登录已过期", 401));
    }

    try {
      const claims = verifyAuthToken(token);
      if (claims.tokenType !== expectedType || !claims[principalKey]) {
        return next(new AppError(invalidMessage, 401));
      }
      req.auth = claims;
      req.accessToken = token;
      next();
    } catch (error) {
      const message = error.name === "TokenExpiredError" ? "登录状态已失效，请重新登录" : "无效的登录凭证";
      next(new AppError(message, 401));
    }
  };
}

const authenticateAdmin = createAuthMiddleware("admin", "adminId", "无效的管理员登录凭证");
const authenticateUser = createAuthMiddleware("user", "userId", "无效的用户登录凭证");

module.exports = {
  authenticateAdmin,
  authenticateUser,
};
