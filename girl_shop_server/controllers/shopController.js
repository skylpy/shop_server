const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const shopService = require("../services/shopService");

const getTestData = asyncHandler(async (req, res) => {
  return success(res, await shopService.getTestData(req));
});

const getHomePageContent = asyncHandler(async (req, res) => {
  return success(res, await shopService.getHomePageContent(req));
});

const getHotGoods = asyncHandler(async (req, res) => {
  return success(res, await shopService.getHotGoods(req));
});

const getCategory = asyncHandler(async (req, res) => {
  return success(res, await shopService.getCategoryList(req));
});

const getCategoryGoods = asyncHandler(async (req, res) => {
  return success(res, await shopService.getCategoryGoods(req, req.body || {}));
});

const getGoodDetail = asyncHandler(async (req, res) => {
  return success(res, await shopService.getGoodDetail(req, req.body.goodId));
});

const getHomeCategory = asyncHandler(async (req, res) => {
  return success(res, await shopService.getHomeCategory(req));
});

const getHomeDetail = asyncHandler(async (req, res) => {
  return success(res, await shopService.getHomeDetail(req, req.body.goodId));
});

module.exports = {
  getCategory,
  getCategoryGoods,
  getGoodDetail,
  getHomeCategory,
  getHomeDetail,
  getHomePageContent,
  getHotGoods,
  getTestData,
};
