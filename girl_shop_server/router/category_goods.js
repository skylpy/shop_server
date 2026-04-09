const express = require("express");
const { getCategoryGoods } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 分类商品接口：根据前端传入的分类参数返回商品列表。
router.post("/", function (req, res, next) {
  getCategoryGoods(req, req.body || {})
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
