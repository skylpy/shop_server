const { readDatabase } = require("./databaseService");
const {
  buildCategoryResponse,
  buildHomeSectionItem,
  buildHomeTabResponse,
  buildProductDetail,
  buildProductListItem,
  toAbsoluteUrl,
} = require("../utils/shopMapper");

function getVisibleProducts(database) {
  return database.products.filter((product) => product.status === "on_sale");
}

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

async function getHotGoods(req) {
  const database = await readDatabase();
  return database.products
    .filter((product) => product.status === "on_sale" && product.isHot)
    .map((product) => buildProductListItem(req, product));
}

async function getCategoryList(req) {
  const database = await readDatabase();
  return database.categories.map((category) => buildCategoryResponse(req, category));
}

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

async function getGoodDetail(req, goodsId) {
  const database = await readDatabase();
  const product = database.products.find((item) => item.id === goodsId) || database.products[0];
  return { goodInfo: buildProductDetail(req, product) };
}

async function getHomeCategory(req) {
  const database = await readDatabase();
  return database.homeTabs.map((tab) => buildHomeTabResponse(req, tab));
}

async function getHomeDetail(req, tabId) {
  const database = await readDatabase();
  const items = database.homeSections[tabId] || database.homeSections["001"] || [];
  return items.map((item) => buildHomeSectionItem(req, item));
}

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
