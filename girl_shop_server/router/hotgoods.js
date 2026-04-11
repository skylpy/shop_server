const express = require("express");
const shopController = require("../controllers/shopController");

const router = express.Router();

router.post("/", shopController.getHotGoods);

module.exports = router;
