const express = require("express");
const { getCategoryList } = require("../lib/shop-service");
const { success } = require("../lib/utils");

const router = express.Router();

// 分类接口：返回商城使用的一级/二级分类列表。
router.post("/", function (req, res, next) {
  getCategoryList(req)
    .then((data) => success(res, data))
    .catch(next);
});

module.exports = router;
