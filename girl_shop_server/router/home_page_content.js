const express = require("express");
const { getHomePageContent } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 首页内容接口：返回轮播、推荐商品、楼层广告和分类信息。
router.post("/", function (req, res, next) {
  getHomePageContent(req)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
