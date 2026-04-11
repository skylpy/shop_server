const express = require("express");
const userController = require("../controllers/userController");
const { authenticateUser } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/profile", authenticateUser, userController.profile);
router.post("/logout", authenticateUser, userController.logout);

module.exports = router;
