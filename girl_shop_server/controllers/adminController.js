const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const adminService = require("../services/adminService");

const login = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "admin_auth",
    action: "login",
    targetType: "admin",
    actorType: "admin",
    actorName: String(req.body?.username || "").trim(),
    message: "管理员登录",
    detail: {
      username: String(req.body?.username || "").trim(),
    },
  };
  const data = await adminService.login(req.body || {});
  req.auditLog.actorId = data.profile.id;
  req.auditLog.actorName = data.profile.username;
  req.auditLog.targetId = data.profile.id;
  req.auditLog.targetName = data.profile.username;
  return success(res, data);
});

const profile = asyncHandler(async (req, res) => {
  return success(res, await adminService.getProfile(req.auth.adminId));
});

const logout = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "admin_auth",
    action: "logout",
    actorType: "admin",
    actorId: req.auth.adminId,
    actorName: req.auth.username,
    targetType: "admin",
    targetId: req.auth.adminId,
    targetName: req.auth.username,
    message: "管理员退出登录",
  };
  return success(res, true, "已退出登录");
});

const options = asyncHandler(async (req, res) => {
  return success(res, await adminService.getOptions());
});

const overview = asyncHandler(async (req, res) => {
  return success(res, await adminService.getOverview());
});

const listProducts = asyncHandler(async (req, res) => {
  return success(res, await adminService.listProducts(req.query || {}));
});

const createProduct = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "product",
    action: "create",
    targetType: "product",
    message: "创建商品",
  };
  const data = await adminService.createProduct(req.body || {});
  req.auditLog.targetId = data.id;
  req.auditLog.targetName = data.name;
  return success(res, data, "商品创建成功");
});

const updateProduct = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "product",
    action: "update",
    targetType: "product",
    targetId: req.params.id,
    message: "更新商品",
  };
  const data = await adminService.updateProduct(req.params.id, req.body || {});
  req.auditLog.targetName = data.name;
  return success(res, data, "商品更新成功");
});

const updateProductStatus = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "product",
    action: "status_update",
    targetType: "product",
    targetId: req.params.id,
    message: "更新商品状态",
    detail: {
      status: req.body?.status,
    },
  };
  await adminService.updateProductStatus(req.params.id, req.body || {});
  return success(res, true, "商品状态更新成功");
});

const deleteProduct = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "product",
    action: "delete",
    targetType: "product",
    targetId: req.params.id,
    message: "删除商品",
  };
  await adminService.deleteProduct(req.params.id);
  return success(res, true, "商品删除成功");
});

const listUsers = asyncHandler(async (req, res) => {
  return success(res, await adminService.listUsers(req.query || {}));
});

const createUser = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user",
    action: "create",
    targetType: "user",
    message: "创建用户",
  };
  const data = await adminService.createUser(req.body || {});
  req.auditLog.targetId = data.id;
  req.auditLog.targetName = data.nickname;
  return success(res, data, "用户创建成功");
});

const updateUser = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user",
    action: "update",
    targetType: "user",
    targetId: req.params.id,
    message: "更新用户",
  };
  const data = await adminService.updateUser(req.params.id, req.body || {});
  req.auditLog.targetName = data.nickname;
  return success(res, data, "用户更新成功");
});

const updateUserStatus = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "user",
    action: "status_update",
    targetType: "user",
    targetId: req.params.id,
    message: "更新用户状态",
    detail: {
      status: req.body?.status,
    },
  };
  await adminService.updateUserStatus(req.params.id, req.body || {});
  return success(res, true, "用户状态更新成功");
});

const listCategories = asyncHandler(async (req, res) => {
  return success(res, await adminService.listCategories());
});

const createCategory = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "category",
    action: "create",
    targetType: "category",
    message: "创建分类",
  };
  const data = await adminService.createCategory(req.body || {});
  req.auditLog.targetId = data.id;
  req.auditLog.targetName = data.name;
  return success(res, data, "分类创建成功");
});

const updateCategory = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "category",
    action: "update",
    targetType: "category",
    targetId: req.params.id,
    message: "更新分类",
  };
  const data = await adminService.updateCategory(req.params.id, req.body || {});
  req.auditLog.targetName = data.name;
  return success(res, data, "分类更新成功");
});

const deleteCategory = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "category",
    action: "delete",
    targetType: "category",
    targetId: req.params.id,
    message: "删除分类",
  };
  await adminService.deleteCategory(req.params.id);
  return success(res, true, "分类删除成功");
});

const listOrders = asyncHandler(async (req, res) => {
  return success(res, await adminService.listOrders(req.query || {}));
});

const updateOrder = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "order",
    action: "update",
    targetType: "order",
    targetId: req.params.id,
    message: "更新订单状态",
    detail: {
      status: req.body?.status,
    },
  };
  return success(res, await adminService.updateOrder(req.params.id, req.body || {}), "订单状态更新成功");
});

const listBanners = asyncHandler(async (req, res) => {
  return success(res, await adminService.listBanners());
});

const createBanner = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "banner",
    action: "create",
    targetType: "banner",
    message: "创建轮播图",
  };
  const data = await adminService.createBanner(req.body || {});
  req.auditLog.targetId = data.id;
  req.auditLog.targetName = data.title;
  return success(res, data, "轮播创建成功");
});

const updateBanner = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "banner",
    action: "update",
    targetType: "banner",
    targetId: req.params.id,
    message: "更新轮播图",
  };
  const data = await adminService.updateBanner(req.params.id, req.body || {});
  req.auditLog.targetName = data.title;
  return success(res, data, "轮播更新成功");
});

const deleteBanner = asyncHandler(async (req, res) => {
  req.auditLog = {
    module: "banner",
    action: "delete",
    targetType: "banner",
    targetId: req.params.id,
    message: "删除轮播图",
  };
  await adminService.deleteBanner(req.params.id);
  return success(res, true, "轮播删除成功");
});

const listOperationLogs = asyncHandler(async (req, res) => {
  return success(res, await adminService.getOperationLogs(req.query || {}));
});

module.exports = {
  createBanner,
  createCategory,
  createProduct,
  createUser,
  deleteBanner,
  deleteCategory,
  deleteProduct,
  listBanners,
  listCategories,
  listOperationLogs,
  listOrders,
  listProducts,
  listUsers,
  login,
  logout,
  options,
  overview,
  profile,
  updateBanner,
  updateCategory,
  updateOrder,
  updateProduct,
  updateProductStatus,
  updateUser,
  updateUserStatus,
};
