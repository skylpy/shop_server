const express = require("express");
const { createToken, hashText } = require("../lib/security");
const { mutateDatabase, readDatabase } = require("../lib/data-store");
const { fail, getNowString, success } = require("../lib/utils");

const router = express.Router();

// 使用内存 Map 保存后台登录会话，适合当前演示项目快速搭建。
const sessions = new Map();

// 商品状态选项，前后端共用，避免页面写死。
const productStatusOptions = [
  { value: "on_sale", label: "上架" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "归档" },
];

// 用户状态选项。
const userStatusOptions = [
  { value: "enabled", label: "启用" },
  { value: "disabled", label: "禁用" },
];

// 订单状态选项。
const orderStatusOptions = [
  { value: "pending", label: "待付款" },
  { value: "paid", label: "已付款" },
  { value: "shipped", label: "已发货" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

// 轮播图状态选项。
const bannerStatusOptions = [
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
];

// 生成业务主键，时间戳加随机数可避免短时间内重复。
function createId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// 把输入值尽量转换为数字，失败时回退到指定默认值。
function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

// 把前端传入的多种真假形式统一转换成布尔值。
function toBoolean(value, fallback) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }
  return Boolean(fallback);
}

// 把文本或数组统一整理成数组，常用于标签、图库、子分类输入。
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

// 清洗商品提交参数，补齐默认值并把字符串字段转换成业务需要的类型。
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

// 清洗用户提交参数，确保后台录入后数据结构统一。
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
  };
}

// 清洗分类提交参数，同时根据一级分类 id 自动生成二级分类 id。
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

// 清洗轮播图提交参数。
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

// 校验管理员账号密码，只有启用状态的管理员才能登录。
function findAdminByCredentials(database, username, password) {
  return database.adminUsers.find(
    (user) => user.username === username && user.passwordHash === hashText(password) && user.status === "enabled"
  );
}

// 后台鉴权中间件：从请求头取 token，校验会话是否存在且未过期。
function authenticate(req, res, next) {
  const header = req.get("authorization") || req.get("x-access-token") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) {
    return fail(res, "未登录或登录已过期", 401);
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return fail(res, "登录状态已失效，请重新登录", 401);
  }

  req.adminSession = session;
  req.adminToken = token;
  next();
}

// 登录接口：校验账号密码，生成 token，并把最近登录时间写回数据库。
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return fail(res, "请输入账号和密码");
  }

  const database = await readDatabase();
  const admin = findAdminByCredentials(database, String(username).trim(), String(password));
  if (!admin) {
    return fail(res, "账号或密码错误", 401);
  }

  const sessionHours = Number(database.settings.sessionHours) || 12;
  const token = createToken();
  const expiresAt = Date.now() + sessionHours * 60 * 60 * 1000;
  const loginAt = getNowString();
  sessions.set(token, { adminId: admin.id, username: admin.username, expiresAt });

  await mutateDatabase((current) => {
    current.adminUsers = current.adminUsers.map((user) => {
      if (user.id === admin.id) {
        return { ...user, lastLoginAt: loginAt };
      }
      return user;
    });
    return current;
  });

  return success(res, {
    token,
    expiresAt,
    profile: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      lastLoginAt: loginAt,
    },
  });
});

// 下面的所有接口都必须先通过登录鉴权。
router.use(authenticate);

// 当前管理员资料接口。
router.get("/profile", async (req, res) => {
  const database = await readDatabase();
  const admin = database.adminUsers.find((item) => item.id === req.adminSession.adminId);
  return success(res, {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  });
});

// 退出登录接口：删除当前 token 对应的会话。
router.post("/logout", (req, res) => {
  sessions.delete(req.adminToken);
  return success(res, true, "已退出登录");
});

// 下拉选项接口：给后台页面初始化状态枚举、分类列表和商品列表。
router.get("/options", async (req, res) => {
  const database = await readDatabase();
  return success(res, {
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
  });
});

// 概览接口：聚合订单、商品、用户的统计信息，供仪表盘展示。
router.get("/overview", async (req, res) => {
  const database = await readDatabase();
  const enabledUsers = database.users.filter((user) => user.status === "enabled").length;
  const onSaleProducts = database.products.filter((product) => product.status === "on_sale").length;
  const paidOrders = database.orders.filter((order) => ["paid", "shipped", "completed"].includes(order.status));
  const totalRevenue = paidOrders.reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  return success(res, {
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
  });
});

// 商品列表接口：支持按关键字、状态、分类筛选。
router.get("/products", async (req, res) => {
  const database = await readDatabase();
  const { keyword = "", status = "", categoryId = "" } = req.query;

  const items = database.products
    .filter((product) => !status || product.status === status)
    .filter((product) => !categoryId || product.categoryId === categoryId)
    .filter((product) => {
      if (!keyword) {
        return true;
      }
      const text = `${product.id} ${product.name} ${product.subtitle}`.toLowerCase();
      return text.includes(String(keyword).toLowerCase());
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

  return success(res, items);
});

// 新增商品接口。
router.post("/products", async (req, res) => {
  const payload = sanitizeProductPayload(req.body || {});
  if (!payload.name || !payload.categoryId || !payload.cover) {
    return fail(res, "商品名称、分类和封面图不能为空");
  }

  await mutateDatabase((database) => {
    if (database.products.some((product) => product.id === payload.id)) {
      payload.id = createId("P");
    }
    database.products.push(payload);
    return database;
  });

  return success(res, payload, "商品创建成功");
});

// 更新商品接口：保持原 id 不变，只覆盖可编辑字段。
router.put("/products/:id", async (req, res) => {
  const productId = req.params.id;
  let updatedProduct = null;

  await mutateDatabase((database) => {
    const index = database.products.findIndex((product) => product.id === productId);
    if (index === -1) {
      return database;
    }
    updatedProduct = sanitizeProductPayload(req.body || {}, database.products[index]);
    updatedProduct.id = database.products[index].id;
    database.products[index] = updatedProduct;
    return database;
  });

  if (!updatedProduct) {
    return fail(res, "商品不存在", 404);
  }
  return success(res, updatedProduct, "商品更新成功");
});

// 商品状态切换接口，主要用于上架/下架。
router.patch("/products/:id/status", async (req, res) => {
  const productId = req.params.id;
  const { status } = req.body || {};
  if (!status) {
    return fail(res, "请选择商品状态");
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
    return fail(res, "商品不存在", 404);
  }
  return success(res, true, "商品状态更新成功");
});

// 删除商品接口：同时清理与该商品有关的轮播和楼层配置，避免脏数据残留。
router.delete("/products/:id", async (req, res) => {
  const productId = req.params.id;
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
    return fail(res, "商品不存在", 404);
  }
  return success(res, true, "商品删除成功");
});

// 用户列表接口：支持关键字和状态筛选。
router.get("/users", async (req, res) => {
  const database = await readDatabase();
  const { keyword = "", status = "" } = req.query;
  const items = database.users
    .filter((user) => !status || user.status === status)
    .filter((user) => {
      if (!keyword) {
        return true;
      }
      const text = `${user.id} ${user.nickname} ${user.phone} ${user.email}`.toLowerCase();
      return text.includes(String(keyword).toLowerCase());
    })
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  return success(res, items);
});

// 新增用户接口。
router.post("/users", async (req, res) => {
  const payload = sanitizeUserPayload(req.body || {});
  if (!payload.nickname || !payload.phone) {
    return fail(res, "用户昵称和手机号不能为空");
  }

  await mutateDatabase((database) => {
    if (database.users.some((user) => user.id === payload.id)) {
      payload.id = createId("U");
    }
    database.users.push(payload);
    return database;
  });

  return success(res, payload, "用户创建成功");
});

// 编辑用户接口。
router.put("/users/:id", async (req, res) => {
  const userId = req.params.id;
  let updatedUser = null;

  await mutateDatabase((database) => {
    const index = database.users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return database;
    }
    updatedUser = sanitizeUserPayload(req.body || {}, database.users[index]);
    updatedUser.id = database.users[index].id;
    database.users[index] = updatedUser;
    return database;
  });

  if (!updatedUser) {
    return fail(res, "用户不存在", 404);
  }
  return success(res, updatedUser, "用户更新成功");
});

// 启用/禁用用户接口。
router.patch("/users/:id/status", async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body || {};
  if (!status) {
    return fail(res, "请选择用户状态");
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
    return fail(res, "用户不存在", 404);
  }
  return success(res, true, "用户状态更新成功");
});

// 分类列表接口。
router.get("/categories", async (req, res) => {
  const database = await readDatabase();
  return success(res, database.categories);
});

// 新增分类接口。
router.post("/categories", async (req, res) => {
  const payload = sanitizeCategoryPayload(req.body || {});
  if (!payload.name || !payload.image) {
    return fail(res, "分类名称和分类图片不能为空");
  }

  await mutateDatabase((database) => {
    if (database.categories.some((category) => category.id === payload.id)) {
      payload.id = createId("C");
    }
    database.categories.push(payload);
    return database;
  });

  return success(res, payload, "分类创建成功");
});

// 编辑分类接口。
router.put("/categories/:id", async (req, res) => {
  const categoryId = req.params.id;
  let updatedCategory = null;

  await mutateDatabase((database) => {
    const index = database.categories.findIndex((category) => category.id === categoryId);
    if (index === -1) {
      return database;
    }
    updatedCategory = sanitizeCategoryPayload(req.body || {}, database.categories[index]);
    updatedCategory.id = database.categories[index].id;
    database.categories[index] = updatedCategory;
    return database;
  });

  if (!updatedCategory) {
    return fail(res, "分类不存在", 404);
  }
  return success(res, updatedCategory, "分类更新成功");
});

// 删除分类接口：如果该分类下仍有关联商品，则禁止删除。
router.delete("/categories/:id", async (req, res) => {
  const categoryId = req.params.id;
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
    return fail(res, "该分类下仍有关联商品，请先调整商品分类");
  }
  if (!removed) {
    return fail(res, "分类不存在", 404);
  }
  return success(res, true, "分类删除成功");
});

// 订单列表接口：支持状态和关键字筛选。
router.get("/orders", async (req, res) => {
  const database = await readDatabase();
  const { status = "", keyword = "" } = req.query;
  const items = database.orders
    .filter((order) => !status || order.status === status)
    .filter((order) => {
      if (!keyword) {
        return true;
      }
      const text = `${order.id} ${order.userName}`.toLowerCase();
      return text.includes(String(keyword).toLowerCase());
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return success(res, items);
});

// 更新订单状态接口。
router.put("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body || {};
  if (!status) {
    return fail(res, "请选择订单状态");
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
    return fail(res, "订单不存在", 404);
  }
  return success(res, updatedOrder, "订单状态更新成功");
});

// 轮播列表接口：按排序值升序返回。
router.get("/banners", async (req, res) => {
  const database = await readDatabase();
  return success(res, database.banners.slice().sort((a, b) => a.sort - b.sort));
});

// 新增轮播接口。
router.post("/banners", async (req, res) => {
  const payload = sanitizeBannerPayload(req.body || {});
  if (!payload.title || !payload.goodsId || !payload.image) {
    return fail(res, "轮播标题、关联商品和图片不能为空");
  }

  await mutateDatabase((database) => {
    database.banners.push(payload);
    return database;
  });

  return success(res, payload, "轮播创建成功");
});

// 编辑轮播接口。
router.put("/banners/:id", async (req, res) => {
  const bannerId = req.params.id;
  let updatedBanner = null;

  await mutateDatabase((database) => {
    const index = database.banners.findIndex((banner) => banner.id === bannerId);
    if (index === -1) {
      return database;
    }
    updatedBanner = sanitizeBannerPayload(req.body || {}, database.banners[index]);
    updatedBanner.id = database.banners[index].id;
    database.banners[index] = updatedBanner;
    return database;
  });

  if (!updatedBanner) {
    return fail(res, "轮播不存在", 404);
  }
  return success(res, updatedBanner, "轮播更新成功");
});

// 删除轮播接口。
router.delete("/banners/:id", async (req, res) => {
  const bannerId = req.params.id;
  let removed = false;

  await mutateDatabase((database) => {
    const nextBanners = database.banners.filter((banner) => banner.id !== bannerId);
    removed = nextBanners.length !== database.banners.length;
    database.banners = nextBanners;
    return database;
  });

  if (!removed) {
    return fail(res, "轮播不存在", 404);
  }
  return success(res, true, "轮播删除成功");
});

module.exports = router;
