const crypto = require("crypto");

// 使用 SHA-256 对敏感文本做单向哈希，主要用于管理员密码存储与比对。
function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

// 生成高随机度的登录令牌，作为后台登录态的内存会话 key。
function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = {
  hashText,
  createToken,
};
