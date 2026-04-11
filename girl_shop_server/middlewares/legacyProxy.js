function legacyProxy(req, res, next) {
  const proxy = req.query.proxy;
  if (proxy) {
    req.header.cookie = (req.header.cookie || "") + `__proxy__${proxy}`;
  }
  next();
}

module.exports = legacyProxy;
