// 根据请求对象动态拼出当前服务的根地址，兼容不同端口和主机访问方式。
function getBaseUrl(req) {
  const host = req.get("host") || `127.0.0.1:${process.env.PORT || 3000}`;
  return `${req.protocol}://${host}`;
}

// 把相对资源路径转换成绝对地址，方便 Flutter 前端直接使用。
function toAbsoluteUrl(req, assetPath) {
  if (!assetPath) {
    return "";
  }
  if (/^https?:\/\//.test(assetPath)) {
    return assetPath;
  }
  return `${getBaseUrl(req)}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
}

// 统一成功返回结构，保持所有接口输出格式一致。
function success(res, data, message) {
  return res.send({
    code: "0",
    message: message || "success",
    data,
  });
}

// 统一失败返回结构，方便前端按 code/message 处理异常提示。
function fail(res, message, statusCode) {
  return res.status(statusCode || 400).send({
    code: "1",
    message: message || "error",
    data: null,
  });
}

// 生成项目内部常用的时间字符串格式：YYYY-MM-DD HH:mm:ss。
function getNowString() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 把后台分类对象转换成旧商城接口需要的分类结构。
function buildCategoryResponse(req, category) {
  return {
    firstCategoryId: category.id,
    firstCategoryName: category.name,
    secondCategoryVO: (category.children || []).map((child) => ({
      secondCategoryId: child.id,
      firstCategoryId: category.id,
      secondCategoryName: child.name,
      comments: child.comments || "",
    })),
    comments: null,
    image: toAbsoluteUrl(req, category.image),
  };
}

// 构造商品列表项，用于首页推荐、热卖列表、分类商品列表等场景。
function buildProductListItem(req, product) {
  return {
    name: product.name,
    image: toAbsoluteUrl(req, product.cover),
    presentPrice: Number(product.presentPrice),
    goodsId: product.id,
    oriPrice: Number(product.oriPrice),
  };
}

// 构造商品详情对象，并把图库转成旧前端使用的 HTML 字符串。
function buildProductDetail(req, product) {
  return {
    amount: Number(product.stock),
    goodsId: product.id,
    image1: toAbsoluteUrl(req, product.cover),
    goodsSerialNumber: product.serialNumber,
    oriPrice: Number(product.oriPrice),
    presentPrice: Number(product.presentPrice),
    shopId: product.shopId,
    goodsName: product.name,
    goodsDetail: (product.gallery || [])
      .map((image) => `<img width="100%" height="auto" alt="${product.name}" src="${toAbsoluteUrl(req, image)}" />`)
      .join(""),
  };
}

// 把首页 Tab 配置转换成旧接口的分类样式结构。
function buildHomeTabResponse(req, tab) {
  return {
    firstCategoryId: tab.id,
    firstCategoryName: tab.name,
    secondCategoryVO: [],
    comments: null,
    normalImage: toAbsoluteUrl(req, tab.normalImage),
    selectedImage: toAbsoluteUrl(req, tab.selectedImage),
  };
}

// 构造首页频道详情项，兼容原来 Flutter 端的字段命名。
function buildHomeSectionItem(req, item) {
  return {
    goodsId: item.goodsId,
    image1: toAbsoluteUrl(req, item.image),
    goodsSerialNumber: item.goodsSerialNumber || "6901435325888",
    shopId: item.shopId || "SHOP-10001",
    goodsName: item.goodsName || "商品",
  };
}

module.exports = {
  buildCategoryResponse,
  buildHomeSectionItem,
  buildHomeTabResponse,
  buildProductDetail,
  buildProductListItem,
  fail,
  getNowString,
  getBaseUrl,
  success,
  toAbsoluteUrl,
};
