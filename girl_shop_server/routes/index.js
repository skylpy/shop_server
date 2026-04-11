const express = require("express");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const shopRoutes = require("./shopRoutes");
const systemController = require("../controllers/systemController");

const router = express.Router();

router.use("/api/admin", adminRoutes);
router.use("/api/user", userRoutes);
router.use(shopRoutes);
router.get("/api/health", systemController.health);

module.exports = router;
