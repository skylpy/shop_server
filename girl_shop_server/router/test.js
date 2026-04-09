const express = require("express");
const { getTestData } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 测试接口：保留旧项目中的轮播测试调用方式。
router.get("/", function (req, res, next) {
  getTestData(req)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
