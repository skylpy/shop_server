const mongoose = require("mongoose");

// 缓存连接 Promise，避免同一进程内重复创建多个 MongoDB 连接。
let connectPromise = null;

// 当前项目的数据结构较灵活，这里使用宽松 Schema 托管不同集合。
// 额外显式保留业务主键 id，避免被 Mongoose 默认行为吞掉。
const genericSchema = new mongoose.Schema(
  {
    id: { type: String },
  },
  { strict: false, versionKey: false, id: false }
);

// 将项目中会用到的集合全部集中注册，后续可通过 models 统一访问。
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
};

// 建立 MongoDB 连接；首次调用时创建连接，后续直接复用已存在的 Promise。
function connectMongo() {
  if (!connectPromise) {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/girl_shop_admin";
    connectPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return connectPromise;
}

module.exports = {
  connectMongo,
  models,
};
