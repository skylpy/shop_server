const express = require("express");
const { getHomeCategory } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 首页频道分类接口：返回顶部频道切换栏的数据。
router.post("/", function (req, res, next) {
  getHomeCategory(req)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
