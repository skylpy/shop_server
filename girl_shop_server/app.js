// 让 Express 能自动捕获 async 路由中的异常，统一交给错误中间件处理。
require("express-async-errors");
const express = require("express");
const path = require("path");
const { ensureDatabase } = require("./lib/data-store");
const app = express();

// 解析 JSON 和表单请求体，后台管理接口与商城接口都会用到。
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 暴露静态资源目录，后台页面和商品图片都从这里直接访问。
app.use(express.static(path.resolve(__dirname, "public")));

// 兼容旧版前端传入的 proxy 参数，把它附加到 cookie 字符串中。
app.use(function (req, res, next) {
  const proxy = req.query.proxy;
  if (proxy) {
    req.header.cookie = (req.header.cookie || "") + `__proxy__${proxy}`;
  }
  next();
});

// 后台管理接口。
app.use("/api/admin", require("./router/admin"));

// 保留原有 Flutter 商城接口地址，避免前端改动过大。
app.use("/getTestData", require("./router/test"));
app.use("/getHomePageContent", require("./router/home_page_content"));
app.use("/getHotGoods", require("./router/hotgoods"));
app.use("/getCategory", require("./router/category"));
app.use("/getCategoryGoods", require("./router/category_goods"));
app.use("/getGoodDetail", require("./router/good_detail"));
app.use("/getHomeCategory", require("./router/homecategory"));
app.use("/getHomeDetail", require("./router/home_dateil"));

// 最简单的健康检查接口，用于确认服务是否成功启动。
app.get("/api/health", function (req, res) {
  res.send({
    code: "0",
    message: "success",
    data: {
      status: "ok",
    },
  });
});

// 统一错误响应，方便前端始终按同一种结构处理失败情况。
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).send({
    code: "1",
    message: err.message || "server error",
    data: null,
  });
});

const port = process.env.PORT || 3000;

// 启动前先确保 MongoDB 可连接并完成种子数据初始化。
ensureDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`server running @http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

module.exports = app;
