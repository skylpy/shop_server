const express = require("express");
const shopController = require("../controllers/shopController");

const router = express.Router();

router.get("/getTestData", shopController.getTestData);
router.post("/getHomePageContent", shopController.getHomePageContent);
router.post("/getHotGoods", shopController.getHotGoods);
router.post("/getCategory", shopController.getCategory);
router.post("/getCategoryGoods", shopController.getCategoryGoods);
router.post("/getGoodDetail", shopController.getGoodDetail);
router.post("/getHomeCategory", shopController.getHomeCategory);
router.post("/getHomeDetail", shopController.getHomeDetail);

module.exports = router;
