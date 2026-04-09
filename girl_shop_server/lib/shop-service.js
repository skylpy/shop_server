const { readDatabase } = require("./data-store");
const {
  buildCategoryResponse,
  buildHomeSectionItem,
  buildHomeTabResponse,
  buildProductDetail,
  buildProductListItem,
  toAbsoluteUrl,
} = require("./utils");

// 过滤出当前真正对外展示的在售商品。
function getVisibleProducts(database) {
  return database.products.filter((product) => product.status === "on_sale");
}

// 组装首页接口所需的完整数据：轮播、推荐、楼层广告、分类。
async function getHomePageContent(req) {
  const database = await readDatabase();
  const visibleProducts = getVisibleProducts(database);
  const recommendProducts = visibleProducts.filter((product) => product.isRecommend);
  const floorSection = database.floorSections[0] || { items: [], bannerImage: "", bannerToPlace: "" };

  return {
    slides: database.banners
      .filter((banner) => banner.status === "published")
      .sort((a, b) => a.sort - b.sort)
      .map((banner) => ({
        image: toAbsoluteUrl(req, banner.image),
        goodsId: banner.goodsId,
      })),
    recommend: recommendProducts.map((product) => buildProductListItem(req, product)),
    floor1Pic: {
      PICTURE_ADDRESS: toAbsoluteUrl(req, floorSection.bannerImage),
      TO_PLACE: floorSection.bannerToPlace,
    },
    floor1: (floorSection.items || []).map((item) => ({
      image: toAbsoluteUrl(req, item.image),
      goodsId: item.goodsId,
    })),
    category: database.categories.map((category) => buildCategoryResponse(req, category)),
  };
}

// 返回热卖商品列表。
async function getHotGoods(req) {
  const database = await readDatabase();
  return database.products
    .filter((product) => product.status === "on_sale" && product.isHot)
    .map((product) => buildProductListItem(req, product));
}

// 返回全部商品分类列表。
async function getCategoryList(req) {
  const database = await readDatabase();
  return database.categories.map((category) => buildCategoryResponse(req, category));
}

// 按一级分类和二级分类筛选商品列表。
async function getCategoryGoods(req, filters) {
  const database = await readDatabase();
  const firstCategoryId = filters.firstCategoryId || filters.categoryId || "";
  const secondCategoryId = filters.secondCategoryId || "";

  return database.products
    .filter((product) => product.status === "on_sale")
    .filter((product) => !firstCategoryId || product.categoryId === firstCategoryId)
    .filter((product) => !secondCategoryId || product.secondCategoryId === secondCategoryId)
    .map((product) => buildProductListItem(req, product));
}

// 获取指定商品的详情；如果 goodsId 无效，则回退到第一件商品，避免前端直接报空。
async function getGoodDetail(req, goodsId) {
  const database = await readDatabase();
  const product = database.products.find((item) => item.id === goodsId) || database.products[0];
  return { goodInfo: buildProductDetail(req, product) };
}

// 返回首页顶部频道分类。
async function getHomeCategory(req) {
  const database = await readDatabase();
  return database.homeTabs.map((tab) => buildHomeTabResponse(req, tab));
}

// 返回首页某个频道下的配置内容。
async function getHomeDetail(req, tabId) {
  const database = await readDatabase();
  const items = database.homeSections[tabId] || database.homeSections["001"] || [];
  return items.map((item) => buildHomeSectionItem(req, item));
}

// 返回测试接口需要的轮播数据，主要用于兼容旧工程中的调试调用。
async function getTestData(req) {
  const database = await readDatabase();
  return database.banners
    .filter((banner) => banner.status === "published")
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 3)
    .map((banner) => ({
      image: toAbsoluteUrl(req, banner.image),
    }));
}

module.exports = {
  getCategoryGoods,
  getCategoryList,
  getGoodDetail,
  getHomeCategory,
  getHomeDetail,
  getHomePageContent,
  getHotGoods,
  getTestData,
};
