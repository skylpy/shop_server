function getBaseUrl(req) {
  const host = req.get("host") || `127.0.0.1:${process.env.PORT || 3000}`;
  return `${req.protocol}://${host}`;
}

function toAbsoluteUrl(req, assetPath) {
  if (!assetPath) {
    return "";
  }
  if (/^https?:\/\//.test(assetPath)) {
    return assetPath;
  }
  return `${getBaseUrl(req)}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function buildProductListItem(req, product) {
  return {
    name: product.name,
    image: toAbsoluteUrl(req, product.cover),
    presentPrice: Number(product.presentPrice),
    goodsId: product.id,
    oriPrice: Number(product.oriPrice),
  };
}

function buildProductDetail(req, product) {
  const detailImages = (product.gallery || []).filter(Boolean).length
    ? (product.gallery || []).filter(Boolean)
    : [product.cover].filter(Boolean);
  const detailHtml = detailImages
    .map((image) => `<img width="100%" height="auto" alt="${escapeHtmlText(product.name)}" src="${toAbsoluteUrl(req, image)}" />`)
    .join("");
  const descriptionHtml = product.description
    ? `<div style="padding:16px;color:#333;line-height:1.8;font-size:14px;">${escapeHtmlText(product.description)}</div>`
    : "";

  return {
    amount: Number(product.stock),
    goodsId: product.id,
    image1: toAbsoluteUrl(req, product.cover || detailImages[0]),
    goodsSerialNumber: product.serialNumber,
    oriPrice: Number(product.oriPrice),
    presentPrice: Number(product.presentPrice),
    shopId: product.shopId,
    goodsName: product.name,
    goodsDetail: detailHtml || descriptionHtml ? `${detailHtml}${descriptionHtml}` : `<div style="padding:16px;color:#666;">暂无详情</div>`,
  };
}

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
  getBaseUrl,
  toAbsoluteUrl,
};
