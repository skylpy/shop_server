const { success, fail } = require("../utils/response");
const { getNowString } = require("../utils/dateTime");
const {
  buildCategoryResponse,
  buildHomeSectionItem,
  buildHomeTabResponse,
  buildProductDetail,
  buildProductListItem,
  getBaseUrl,
  toAbsoluteUrl,
} = require("../utils/shopMapper");

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
