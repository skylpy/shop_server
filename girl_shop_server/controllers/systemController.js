const { success } = require("../utils/response");

function health(req, res) {
  return success(res, { status: "ok" });
}

module.exports = {
  health,
};
