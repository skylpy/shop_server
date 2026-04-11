const express = require("express");
const shopController = require("../controllers/shopController");

const router = express.Router();

router.post("/", shopController.getHomePageContent);

module.exports = router;
