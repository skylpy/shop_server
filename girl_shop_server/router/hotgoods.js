const express = require("express");
const { getHotGoods } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 热卖商品接口：返回在售且标记为热卖的商品列表。
router.post("/", function (req, res, next) {
  getHotGoods(req)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
