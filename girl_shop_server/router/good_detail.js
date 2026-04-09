const express = require("express");
const { getGoodDetail } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 商品详情接口：返回单个商品的库存、价格和详情图文。
router.post("/", function (req, res, next) {
  getGoodDetail(req, req.body.goodId)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
