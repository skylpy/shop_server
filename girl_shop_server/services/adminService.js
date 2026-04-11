const AppError = require("../utils/appError");
const { getNowString } = require("../utils/dateTime");
const { createAuthToken, hashText } = require("./securityService");
const { mutateDatabase, readDatabase } = require("./databaseService");
const { listOperationLogs } = require("./operationLogService");

const productStatusOptions = [
  { value: "on_sale", label: "上架" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "归档" },
];

const userStatusOptions = [
  { value: "enabled", label: "启用" },
  { value: "disabled", label: "禁用" },
];

const orderStatusOptions = [
  { value: "pending", label: "待付款" },
  { value: "paid", label: "已付款" },
  { value: "shipped", label: "已发货" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const bannerStatusOptions = [
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
];

function createId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toBoolean(value, fallback) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }
  return Boolean(fallback);
}

function normalizeArray(input) {
  if (Array.isArray(input)) {
    return input.filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function sanitizeProductPayload(body, existing) {
  const fallback = existing || {};
  return {
    id: fallback.id || String(body.id || "").trim() || createId("P"),
    serialNumber: String(body.serialNumber || fallback.serialNumber || `${Date.now()}`).trim(),
    name: String(body.name || fallback.name || "").trim(),
    subtitle: String(body.subtitle || fallback.subtitle || "").trim(),
    categoryId: String(body.categoryId || fallback.categoryId || "").trim(),
    secondCategoryId: String(body.secondCategoryId || fallback.secondCategoryId || "").trim(),
    cover: String(body.cover || fallback.cover || "").trim(),
    gallery: normalizeArray(body.gallery).length ? normalizeArray(body.gallery) : fallback.gallery || [],
    presentPrice: toNumber(body.presentPrice, toNumber(fallback.presentPrice, 0)),
    oriPrice: toNumber(body.oriPrice, toNumber(fallback.oriPrice, 0)),
    stock: toNumber(body.stock, toNumber(fallback.stock, 0)),
    sales: toNumber(body.sales, toNumber(fallback.sales, 0)),
    status: String(body.status || fallback.status || "draft"),
    isHot: toBoolean(body.isHot, fallback.isHot),
    isRecommend: toBoolean(body.isRecommend, fallback.isRecommend),
    tags: normalizeArray(body.tags).length ? normalizeArray(body.tags) : fallback.tags || [],
    description: String(body.description || fallback.description || "").trim(),
    shopId: String(body.shopId || fallback.shopId || "SHOP-10001").trim(),
  };
}

function sanitizeUserPayload(body, existing) {
  const fallback = existing || {};
  return {
    id: fallback.id || String(body.id || "").trim() || createId("U"),
    nickname: String(body.nickname || fallback.nickname || "").trim(),
    phone: String(body.phone || fallback.phone || "").trim(),
    email: String(body.email || fallback.email || "").trim(),
    level: String(body.level || fallback.level || "普通会员").trim(),
    status: String(body.status || fallback.status || "enabled").trim(),
    city: String(body.city || fallback.city || "").trim(),
    totalSpent: toNumber(body.totalSpent, toNumber(fallback.totalSpent, 0)),
    orderCount: toNumber(body.orderCount, toNumber(fallback.orderCount, 0)),
    registeredAt: fallback.registeredAt || getNowString(),
    lastLoginAt: String(body.lastLoginAt || fallback.lastLoginAt || "").trim(),
    passwordHash: body.password ? hashText(body.password) : String(fallback.passwordHash || "").trim(),
  };
}

function sanitizeCategoryPayload(body, existing) {
  const fallback = existing || {};
  const childrenNames = normalizeArray(body.children);
  const categoryId = fallback.id || String(body.id || "").trim() || createId("C");
  return {
    id: categoryId,
    name: String(body.name || fallback.name || "").trim(),
    image: String(body.image || fallback.image || "").trim(),
    children: childrenNames.length
      ? childrenNames.map((name, index) => ({
          id: `${categoryId}${index + 1}`,
          name,
        }))
      : fallback.children || [],
  };
}

function sanitizeBannerPayload(body, existing) {
  const fallback = existing || {};
  return {
    id: fallback.id || String(body.id || "").trim() || createId("BANNER-"),
    title: String(body.title || fallback.title || "").trim(),
    goodsId: String(body.goodsId || fallback.goodsId || "").trim(),
    image: String(body.image || fallback.image || "").trim(),
    sort: toNumber(body.sort, toNumber(fallback.sort, 1)),
    status: String(body.status || fallback.status || "draft").trim(),
  };
}

function findAdminByCredentials(database, username, password) {
  return database.adminUsers.find(
    (user) => user.username === username && user.passwordHash === hashText(password) && user.status === "enabled"
  );
}

function serializeUser(user) {
  if (!user) {
    return user;
  }
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function login(payload) {
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  if (!username || !password) {
    throw new AppError("请输入账号和密码");
  }

  const database = await readDatabase();
  const admin = findAdminByCredentials(database, username, password);
  if (!admin) {
    throw new AppError("账号或密码错误", 401);
  }

  const sessionHours = Number(database.settings.sessionHours) || 12;
  const auth = createAuthToken(
    {
      tokenType: "admin",
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    },
    sessionHours
  );
  const loginAt = getNowString();

  await mutateDatabase((current) => {
    current.adminUsers = current.adminUsers.map((user) => {
      if (user.id === admin.id) {
        return { ...user, lastLoginAt: loginAt };
      }
      return user;
    });
    return current;
  });

  return {
    token: auth.token,
    expiresAt: auth.expiresAt,
    profile: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      lastLoginAt: loginAt,
    },
  };
}

async function getProfile(adminId) {
  const database = await readDatabase();
  const admin = database.adminUsers.find((item) => item.id === adminId);
  if (!admin || admin.status !== "enabled") {
    throw new AppError("管理员不存在或已被禁用", 401);
  }
  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  };
}

async function getOptions() {
  const database = await readDatabase();
  return {
    productStatusOptions,
    userStatusOptions,
    orderStatusOptions,
    bannerStatusOptions,
    categories: database.categories,
    products: database.products.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.status,
    })),
  };
}

async function getOverview() {
  const database = await readDatabase();
  const enabledUsers = database.users.filter((user) => user.status === "enabled").length;
  const onSaleProducts = database.products.filter((product) => product.status === "on_sale").length;
  const paidOrders = database.orders.filter((order) => ["paid", "shipped", "completed"].includes(order.status));
  const totalRevenue = paidOrders.reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  return {
    cards: [
      { key: "revenue", label: "累计成交额", value: totalRevenue.toFixed(2), unit: "元" },
      { key: "orders", label: "订单总数", value: database.orders.length, unit: "单" },
      { key: "products", label: "在售商品", value: onSaleProducts, unit: "件" },
      { key: "users", label: "启用用户", value: enabledUsers, unit: "人" },
    ],
    recentOrders: database.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    topProducts: database.products
      .slice()
      .sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
      .slice(0, 5)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sales: product.sales,
        stock: product.stock,
        status: product.status,
      })),
  };
}

async function listProducts(query) {
  const database = await readDatabase();
  const keyword = String(query.keyword || "");
  const status = String(query.status || "");
  const categoryId = String(query.categoryId || "");

  return database.products
    .filter((product) => !status || product.status === status)
    .filter((product) => !categoryId || product.categoryId === categoryId)
    .filter((product) => {
      if (!keyword) {
        return true;
      }
      const text = `${product.id} ${product.name} ${product.subtitle}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    })
    .map((product) => {
      const category = database.categories.find((item) => item.id === product.categoryId);
      const child = (category && category.children.find((item) => item.id === product.secondCategoryId)) || null;
      return {
        ...product,
        categoryName: category ? category.name : "",
        secondCategoryName: child ? child.name : "",
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function createProduct(payload) {
  const nextProduct = sanitizeProductPayload(payload || {});
  if (!nextProduct.name || !nextProduct.categoryId || !nextProduct.cover) {
    throw new AppError("商品名称、分类和封面图不能为空");
  }

  await mutateDatabase((database) => {
    if (database.products.some((product) => product.id === nextProduct.id)) {
      nextProduct.id = createId("P");
    }
    database.products.push(nextProduct);
    return database;
  });

  return nextProduct;
}

async function updateProduct(productId, payload) {
  let updatedProduct = null;

  await mutateDatabase((database) => {
    const index = database.products.findIndex((product) => product.id === productId);
    if (index === -1) {
      return database;
    }
    updatedProduct = sanitizeProductPayload(payload || {}, database.products[index]);
    updatedProduct.id = database.products[index].id;
    database.products[index] = updatedProduct;
    return database;
  });

  if (!updatedProduct) {
    throw new AppError("商品不存在", 404);
  }
  return updatedProduct;
}

async function updateProductStatus(productId, payload) {
  const status = String(payload.status || "");
  if (!status) {
    throw new AppError("请选择商品状态");
  }

  let found = false;
  await mutateDatabase((database) => {
    database.products = database.products.map((product) => {
      if (product.id === productId) {
        found = true;
        return { ...product, status: String(status) };
      }
      return product;
    });
    return database;
  });

  if (!found) {
    throw new AppError("商品不存在", 404);
  }
  return true;
}

async function deleteProduct(productId) {
  let removed = false;

  await mutateDatabase((database) => {
    const nextProducts = database.products.filter((product) => product.id !== productId);
    removed = nextProducts.length !== database.products.length;
    database.products = nextProducts;
    database.banners = database.banners.filter((banner) => banner.goodsId !== productId);
    database.floorSections = database.floorSections.map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => item.goodsId !== productId),
    }));
    return database;
  });

  if (!removed) {
    throw new AppError("商品不存在", 404);
  }
  return true;
}

async function listUsers(query) {
  const database = await readDatabase();
  const keyword = String(query.keyword || "");
  const status = String(query.status || "");
  return database.users
    .filter((user) => !status || user.status === status)
    .filter((user) => {
      if (!keyword) {
        return true;
      }
      const text = `${user.id} ${user.nickname} ${user.phone} ${user.email}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    })
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .map((user) => serializeUser(user));
}

async function createUser(payload) {
  const nextUser = sanitizeUserPayload(payload || {});
  if (!nextUser.nickname || !nextUser.phone) {
    throw new AppError("用户昵称和手机号不能为空");
  }

  await mutateDatabase((database) => {
    if (database.users.some((user) => user.id === nextUser.id)) {
      nextUser.id = createId("U");
    }
    database.users.push(nextUser);
    return database;
  });

  return serializeUser(nextUser);
}

async function updateUser(userId, payload) {
  let updatedUser = null;
  await mutateDatabase((database) => {
    const index = database.users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return database;
    }
    updatedUser = sanitizeUserPayload(payload || {}, database.users[index]);
    updatedUser.id = database.users[index].id;
    database.users[index] = updatedUser;
    return database;
  });

  if (!updatedUser) {
    throw new AppError("用户不存在", 404);
  }
  return serializeUser(updatedUser);
}

async function updateUserStatus(userId, payload) {
  const status = String(payload.status || "");
  if (!status) {
    throw new AppError("请选择用户状态");
  }

  let found = false;
  await mutateDatabase((database) => {
    database.users = database.users.map((user) => {
      if (user.id === userId) {
        found = true;
        return { ...user, status: String(status) };
      }
      return user;
    });
    return database;
  });

  if (!found) {
    throw new AppError("用户不存在", 404);
  }
  return true;
}

async function listCategories() {
  const database = await readDatabase();
  return database.categories;
}

async function createCategory(payload) {
  const nextCategory = sanitizeCategoryPayload(payload || {});
  if (!nextCategory.name || !nextCategory.image) {
    throw new AppError("分类名称和分类图片不能为空");
  }

  await mutateDatabase((database) => {
    if (database.categories.some((category) => category.id === nextCategory.id)) {
      nextCategory.id = createId("C");
    }
    database.categories.push(nextCategory);
    return database;
  });

  return nextCategory;
}

async function updateCategory(categoryId, payload) {
  let updatedCategory = null;
  await mutateDatabase((database) => {
    const index = database.categories.findIndex((category) => category.id === categoryId);
    if (index === -1) {
      return database;
    }
    updatedCategory = sanitizeCategoryPayload(payload || {}, database.categories[index]);
    updatedCategory.id = database.categories[index].id;
    database.categories[index] = updatedCategory;
    return database;
  });

  if (!updatedCategory) {
    throw new AppError("分类不存在", 404);
  }
  return updatedCategory;
}

async function deleteCategory(categoryId) {
  let blocked = false;
  let removed = false;

  await mutateDatabase((database) => {
    if (database.products.some((product) => product.categoryId === categoryId)) {
      blocked = true;
      return database;
    }
    const nextCategories = database.categories.filter((category) => category.id !== categoryId);
    removed = nextCategories.length !== database.categories.length;
    database.categories = nextCategories;
    return database;
  });

  if (blocked) {
    throw new AppError("该分类下仍有关联商品，请先调整商品分类");
  }
  if (!removed) {
    throw new AppError("分类不存在", 404);
  }
  return true;
}

async function listOrders(query) {
  const database = await readDatabase();
  const status = String(query.status || "");
  const keyword = String(query.keyword || "");
  return database.orders
    .filter((order) => !status || order.status === status)
    .filter((order) => {
      if (!keyword) {
        return true;
      }
      const text = `${order.id} ${order.userName}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function updateOrder(orderId, payload) {
  const status = String(payload.status || "");
  if (!status) {
    throw new AppError("请选择订单状态");
  }

  let updatedOrder = null;
  await mutateDatabase((database) => {
    const index = database.orders.findIndex((order) => order.id === orderId);
    if (index === -1) {
      return database;
    }
    updatedOrder = {
      ...database.orders[index],
      status: String(status),
    };
    database.orders[index] = updatedOrder;
    return database;
  });

  if (!updatedOrder) {
    throw new AppError("订单不存在", 404);
  }
  return updatedOrder;
}

async function listBanners() {
  const database = await readDatabase();
  return database.banners.slice().sort((a, b) => a.sort - b.sort);
}

async function getOperationLogs(query) {
  return listOperationLogs(query || {});
}

async function createBanner(payload) {
  const nextBanner = sanitizeBannerPayload(payload || {});
  if (!nextBanner.title || !nextBanner.goodsId || !nextBanner.image) {
    throw new AppError("轮播标题、关联商品和图片不能为空");
  }

  await mutateDatabase((database) => {
    database.banners.push(nextBanner);
    return database;
  });

  return nextBanner;
}

async function updateBanner(bannerId, payload) {
  let updatedBanner = null;

  await mutateDatabase((database) => {
    const index = database.banners.findIndex((banner) => banner.id === bannerId);
    if (index === -1) {
      return database;
    }
    updatedBanner = sanitizeBannerPayload(payload || {}, database.banners[index]);
    updatedBanner.id = database.banners[index].id;
    database.banners[index] = updatedBanner;
    return database;
  });

  if (!updatedBanner) {
    throw new AppError("轮播不存在", 404);
  }
  return updatedBanner;
}

async function deleteBanner(bannerId) {
  let removed = false;
  await mutateDatabase((database) => {
    const nextBanners = database.banners.filter((banner) => banner.id !== bannerId);
    removed = nextBanners.length !== database.banners.length;
    database.banners = nextBanners;
    return database;
  });

  if (!removed) {
    throw new AppError("轮播不存在", 404);
  }
  return true;
}

module.exports = {
  createBanner,
  createCategory,
  createProduct,
  createUser,
  deleteBanner,
  deleteCategory,
  deleteProduct,
  getOptions,
  getOperationLogs,
  getOverview,
  getProfile,
  listBanners,
  listCategories,
  listOrders,
  listProducts,
  listUsers,
  login,
  updateBanner,
  updateCategory,
  updateOrder,
  updateProduct,
  updateProductStatus,
  updateUser,
  updateUserStatus,
};
