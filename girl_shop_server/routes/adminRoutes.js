const express = require("express");
const adminController = require("../controllers/adminController");
const uploadController = require("../controllers/uploadController");
const { authenticateAdmin } = require("../middlewares/auth");
const { uploadImage } = require("../middlewares/uploadImage");

const router = express.Router();

router.post("/login", adminController.login);
router.use(authenticateAdmin);
router.get("/profile", adminController.profile);
router.post("/logout", adminController.logout);
router.get("/options", adminController.options);
router.get("/overview", adminController.overview);
router.get("/products", adminController.listProducts);
router.post("/products", adminController.createProduct);
router.put("/products/:id", adminController.updateProduct);
router.patch("/products/:id/status", adminController.updateProductStatus);
router.delete("/products/:id", adminController.deleteProduct);
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.get("/categories", adminController.listCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);
router.get("/orders", adminController.listOrders);
router.put("/orders/:id", adminController.updateOrder);
router.get("/banners", adminController.listBanners);
router.post("/banners", adminController.createBanner);
router.put("/banners/:id", adminController.updateBanner);
router.delete("/banners/:id", adminController.deleteBanner);
router.get("/operation-logs", adminController.listOperationLogs);
router.post("/upload-image", uploadImage.single("image"), uploadController.uploadImage);

module.exports = router;
