function success(res, data, message) {
  if (res && res.req) {
    res.req.auditResponseData = data;
    res.req.auditResponseMessage = message || "success";
  }
  return res.send({
    code: "0",
    message: message || "success",
    data,
  });
}

function fail(res, message, statusCode) {
  if (res && res.req) {
    res.req.auditResponseData = null;
    res.req.auditResponseMessage = message || "error";
  }
  return res.status(statusCode || 400).send({
    code: "1",
    message: message || "error",
    data: null,
  });
}

module.exports = {
  success,
  fail,
};
