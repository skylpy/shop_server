const express = require("express");
const { getHomeDetail } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 首页频道详情接口：根据频道 id 返回对应的内容列表。
router.post("/", function (req, res, next) {
  getHomeDetail(req, req.body.goodId)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
