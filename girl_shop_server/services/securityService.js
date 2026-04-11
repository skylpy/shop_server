const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getAccessToken(req) {
  const header = req.get("authorization") || req.get("x-access-token") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "girl_shop_demo_jwt_secret_change_me";
}

function createAuthToken(payload, sessionHours) {
  const hours = Number(sessionHours) || 12;
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${hours}h`,
    issuer: "girl_shop_server",
  });
  return { token, expiresAt };
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "girl_shop_server",
  });
}

module.exports = {
  createAuthToken,
  getAccessToken,
  hashText,
  verifyAuthToken,
};
