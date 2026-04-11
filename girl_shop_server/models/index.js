const mongoose = require("mongoose");

const genericSchema = new mongoose.Schema(
  {
    id: { type: String },
  },
  { strict: false, versionKey: false, id: false }
);

const models = {
  Setting: mongoose.models.Setting || mongoose.model("Setting", genericSchema, "settings"),
  AdminUser: mongoose.models.AdminUser || mongoose.model("AdminUser", genericSchema, "admin_users"),
  Category: mongoose.models.Category || mongoose.model("Category", genericSchema, "categories"),
  Product: mongoose.models.Product || mongoose.model("Product", genericSchema, "products"),
  HomeTab: mongoose.models.HomeTab || mongoose.model("HomeTab", genericSchema, "home_tabs"),
  HomeSection: mongoose.models.HomeSection || mongoose.model("HomeSection", genericSchema, "home_sections"),
  Banner: mongoose.models.Banner || mongoose.model("Banner", genericSchema, "banners"),
  FloorSection: mongoose.models.FloorSection || mongoose.model("FloorSection", genericSchema, "floor_sections"),
  User: mongoose.models.User || mongoose.model("User", genericSchema, "users"),
  Order: mongoose.models.Order || mongoose.model("Order", genericSchema, "orders"),
  OperationLog: mongoose.models.OperationLog || mongoose.model("OperationLog", genericSchema, "operation_logs"),
};

module.exports = models;
