// 前端页面的全局状态仓库：统一保存登录态、列表数据和当前视图。
const state = {
  token: window.localStorage.getItem("girl_shop_admin_token") || "",
  profile: null,
  options: null,
  overview: null,
  products: [],
  users: [],
  categories: [],
  orders: [],
  banners: [],
  currentView: "dashboard",
};

// 不同页面对应的标题和副标题，用于切换导航时同步更新顶部文案。
const viewTitles = {
  dashboard: ["运营概览", "查看后台经营数据和最近订单"],
  products: ["商品管理", "维护在售商品、库存、价格、推荐状态"],
  users: ["用户管理", "维护会员状态和基础资料"],
  categories: ["分类管理", "维护商城一级分类和二级分类"],
  orders: ["订单管理", "查看订单并调整履约状态"],
  banners: ["轮播管理", "管理首页轮播图、排序和发布状态"],
};

// 把页面上需要频繁操作的 DOM 节点提前缓存，减少重复查询。
const elements = {
  loginView: document.getElementById("login-view"),
  appView: document.getElementById("app-view"),
  loginForm: document.getElementById("login-form"),
  logoutButton: document.getElementById("logout-button"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  adminName: document.getElementById("admin-name"),
  adminRole: document.getElementById("admin-role"),
  sidebarShopName: document.getElementById("sidebar-shop-name"),
  overviewCards: document.getElementById("overview-cards"),
  recentOrders: document.getElementById("recent-orders"),
  topProducts: document.getElementById("top-products"),
  productsTable: document.getElementById("products-table"),
  usersTable: document.getElementById("users-table"),
  categoriesTable: document.getElementById("categories-table"),
  ordersTable: document.getElementById("orders-table"),
  bannersTable: document.getElementById("banners-table"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close"),
  productFilterForm: document.getElementById("product-filter-form"),
  userFilterForm: document.getElementById("user-filter-form"),
  orderFilterForm: document.getElementById("order-filter-form"),
};

// 对字符串做 HTML 转义，防止把用户输入直接插进模板时破坏页面结构。
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 当前项目用浏览器原生弹窗做最简单的消息提示。
function notify(message) {
  window.alert(message);
}

// 通用请求方法：
// 1. 自动带上后台 token
// 2. 自动把对象 body 转为 JSON
// 3. 按统一响应结构提取 data
async function request(path, options = {}) {
  const config = { method: "GET", headers: {}, ...options };
  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }
  if (config.body && typeof config.body !== "string") {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(path, config);
  const payload = await response.json();
  if (!response.ok || payload.code !== "0") {
    if (response.status === 401) {
      logout(false);
    }
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

// 切换后台当前页面，并同步高亮左侧导航和顶部标题。
function setView(viewName) {
  state.currentView = viewName;
  elements.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".content-view").forEach((section) => {
    section.classList.toggle("active", section.id === `${viewName}-view`);
  });
  const [title, subtitle] = viewTitles[viewName];
  elements.pageTitle.textContent = title;
  elements.pageSubtitle.textContent = subtitle;
}

// 生成状态标签 HTML。
function statusBadge(status) {
  return `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

// 生成空状态占位块，避免列表为空时页面显得突兀。
function renderEmpty(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

// 根据后端返回的 options 数据，填充筛选下拉框。
function fillSelectOptions() {
  const statusSelect = document.getElementById("product-filter-status");
  const categorySelect = document.getElementById("product-filter-category");
  const userStatusSelect = document.getElementById("user-filter-status");
  const orderStatusSelect = document.getElementById("order-filter-status");

  statusSelect.innerHTML =
    `<option value="">全部状态</option>` +
    state.options.productStatusOptions
      .map((item) => `<option value="${item.value}">${item.label}</option>`)
      .join("");
  categorySelect.innerHTML =
    `<option value="">全部分类</option>` +
    state.options.categories.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
  userStatusSelect.innerHTML =
    `<option value="">全部状态</option>` +
    state.options.userStatusOptions
      .map((item) => `<option value="${item.value}">${item.label}</option>`)
      .join("");
  orderStatusSelect.innerHTML =
    `<option value="">全部状态</option>` +
    state.options.orderStatusOptions
      .map((item) => `<option value="${item.value}">${item.label}</option>`)
      .join("");
}

// 渲染仪表盘：包括统计卡片、最近订单和热销商品。
function renderOverview() {
  const cards = state.overview.cards || [];
  elements.overviewCards.innerHTML = cards
    .map(
      (card) => `
        <article class="data-card">
          <label>${escapeHtml(card.label)}</label>
          <strong>${escapeHtml(card.value)}</strong>
          <span>${escapeHtml(card.unit || "")}</span>
        </article>
      `
    )
    .join("");

  elements.recentOrders.innerHTML = state.overview.recentOrders.length
    ? `
      <div class="list-box">
        ${state.overview.recentOrders
          .map(
            (order) => `
              <div class="list-row">
                <div>
                  <strong>${escapeHtml(order.id)}</strong>
                  <span>${escapeHtml(order.userName)} · ${escapeHtml(order.createdAt)}</span>
                </div>
                <div>
                  ${statusBadge(order.status)}
                  <div style="margin-top:8px;text-align:right;">￥${Number(order.totalAmount).toFixed(2)}</div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : renderEmpty("暂无订单数据");

  elements.topProducts.innerHTML = state.overview.topProducts.length
    ? `
      <div class="list-box">
        ${state.overview.topProducts
          .map(
            (product) => `
              <div class="list-row">
                <div>
                  <strong>${escapeHtml(product.name)}</strong>
                  <span>ID: ${escapeHtml(product.id)} · 库存 ${escapeHtml(product.stock)}</span>
                </div>
                <div>
                  ${statusBadge(product.status)}
                  <div style="margin-top:8px;text-align:right;">销量 ${escapeHtml(product.sales)}</div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : renderEmpty("暂无热销商品数据");
}

// 渲染商品管理表格。
function renderProducts() {
  if (!state.products.length) {
    elements.productsTable.innerHTML = renderEmpty("暂无商品数据");
    return;
  }
  elements.productsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>商品</th>
          <th>分类</th>
          <th>价格</th>
          <th>库存 / 销量</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${state.products
          .map(
            (product) => `
              <tr>
                <td>
                  <div style="display:flex;gap:12px;">
                    <img class="cover-image" src="${escapeHtml(product.cover)}" alt="${escapeHtml(product.name)}" />
                    <div>
                      <strong>${escapeHtml(product.name)}</strong>
                      <div style="margin-top:6px;color:#64748b;">ID: ${escapeHtml(product.id)}</div>
                      <div style="margin-top:4px;color:#64748b;">${escapeHtml(product.subtitle || "")}</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(product.categoryName || "-")} / ${escapeHtml(product.secondCategoryName || "-")}</td>
                <td>现价 ￥${Number(product.presentPrice).toFixed(2)}<br />原价 ￥${Number(product.oriPrice).toFixed(2)}</td>
                <td>库存 ${escapeHtml(product.stock)}<br />销量 ${escapeHtml(product.sales)}</td>
                <td>
                  ${statusBadge(product.status)}
                  <div style="margin-top:8px;color:#64748b;">热卖: ${product.isHot ? "是" : "否"} / 推荐: ${
              product.isRecommend ? "是" : "否"
            }</div>
                </td>
                <td>
                  <div class="action-group">
                    <button class="action-button" data-action="edit-product" data-id="${escapeHtml(product.id)}">编辑</button>
                    <button class="action-button" data-action="toggle-product" data-id="${escapeHtml(product.id)}" data-status="${
              product.status === "on_sale" ? "draft" : "on_sale"
            }">${product.status === "on_sale" ? "下架" : "上架"}</button>
                    <button class="action-button danger" data-action="delete-product" data-id="${escapeHtml(product.id)}">删除</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// 渲染用户管理表格。
function renderUsers() {
  if (!state.users.length) {
    elements.usersTable.innerHTML = renderEmpty("暂无用户数据");
    return;
  }

  elements.usersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>用户</th>
          <th>等级</th>
          <th>地区</th>
          <th>消费 / 订单</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${state.users
          .map(
            (user) => `
              <tr>
                <td>
                  <strong>${escapeHtml(user.nickname)}</strong>
                  <div style="margin-top:6px;color:#64748b;">${escapeHtml(user.phone)}</div>
                  <div style="margin-top:4px;color:#64748b;">${escapeHtml(user.email || "-")}</div>
                </td>
                <td>${escapeHtml(user.level)}</td>
                <td>${escapeHtml(user.city || "-")}</td>
                <td>￥${Number(user.totalSpent).toFixed(2)}<br />${escapeHtml(user.orderCount)} 单</td>
                <td>${statusBadge(user.status)}</td>
                <td>
                  <div class="action-group">
                    <button class="action-button" data-action="edit-user" data-id="${escapeHtml(user.id)}">编辑</button>
                    <button class="action-button" data-action="toggle-user" data-id="${escapeHtml(user.id)}" data-status="${
              user.status === "enabled" ? "disabled" : "enabled"
            }">${user.status === "enabled" ? "禁用" : "启用"}</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// 渲染分类管理表格。
function renderCategories() {
  if (!state.categories.length) {
    elements.categoriesTable.innerHTML = renderEmpty("暂无分类数据");
    return;
  }

  elements.categoriesTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>分类</th>
          <th>二级分类</th>
          <th>图片</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${state.categories
          .map(
            (category) => `
              <tr>
                <td><strong>${escapeHtml(category.name)}</strong><div style="margin-top:6px;color:#64748b;">ID: ${escapeHtml(
              category.id
            )}</div></td>
                <td>${escapeHtml((category.children || []).map((item) => item.name).join("、") || "-")}</td>
                <td><img class="cover-image" src="${escapeHtml(category.image)}" alt="${escapeHtml(category.name)}" /></td>
                <td>
                  <div class="action-group">
                    <button class="action-button" data-action="edit-category" data-id="${escapeHtml(category.id)}">编辑</button>
                    <button class="action-button danger" data-action="delete-category" data-id="${escapeHtml(category.id)}">删除</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// 渲染订单管理表格。
function renderOrders() {
  if (!state.orders.length) {
    elements.ordersTable.innerHTML = renderEmpty("暂无订单数据");
    return;
  }

  elements.ordersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>订单</th>
          <th>用户</th>
          <th>商品明细</th>
          <th>金额</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${state.orders
          .map(
            (order) => `
              <tr>
                <td><strong>${escapeHtml(order.id)}</strong><div style="margin-top:6px;color:#64748b;">${escapeHtml(
              order.createdAt
            )}</div></td>
                <td>${escapeHtml(order.userName)}<div style="margin-top:6px;color:#64748b;">${escapeHtml(
              order.address || "-"
            )}</div></td>
                <td>${escapeHtml(
                  (order.items || [])
                    .map((item) => `${item.productName} x${item.quantity}`)
                    .join("；")
                )}</td>
                <td>￥${Number(order.totalAmount).toFixed(2)}</td>
                <td>${statusBadge(order.status)}</td>
                <td>
                  <div class="action-group">
                    <select data-order-select="${escapeHtml(order.id)}">
                      ${state.options.orderStatusOptions
                        .map(
                          (option) =>
                            `<option value="${option.value}" ${option.value === order.status ? "selected" : ""}>${option.label}</option>`
                        )
                        .join("")}
                    </select>
                    <button class="action-button" data-action="update-order" data-id="${escapeHtml(order.id)}">更新状态</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// 渲染轮播管理表格。
function renderBanners() {
  if (!state.banners.length) {
    elements.bannersTable.innerHTML = renderEmpty("暂无轮播数据");
    return;
  }

  elements.bannersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>轮播图</th>
          <th>关联商品</th>
          <th>排序</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${state.banners
          .map(
            (banner) => `
              <tr>
                <td>
                  <img class="banner-image" src="${escapeHtml(banner.image)}" alt="${escapeHtml(banner.title)}" />
                  <div style="margin-top:8px;"><strong>${escapeHtml(banner.title)}</strong></div>
                </td>
                <td>${escapeHtml(banner.goodsId)}</td>
                <td>${escapeHtml(banner.sort)}</td>
                <td>${statusBadge(banner.status)}</td>
                <td>
                  <div class="action-group">
                    <button class="action-button" data-action="edit-banner" data-id="${escapeHtml(banner.id)}">编辑</button>
                    <button class="action-button danger" data-action="delete-banner" data-id="${escapeHtml(banner.id)}">删除</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// 拉取仪表盘数据并刷新概览区域。
async function loadOverview() {
  state.overview = await request("/api/admin/overview");
  renderOverview();
}

// 按筛选条件加载商品列表。
async function loadProducts() {
  const formData = new FormData(elements.productFilterForm);
  const params = new URLSearchParams();
  formData.forEach((value, key) => value && params.append(key, value));
  state.products = await request(`/api/admin/products?${params.toString()}`);
  renderProducts();
}

// 按筛选条件加载用户列表。
async function loadUsers() {
  const formData = new FormData(elements.userFilterForm);
  const params = new URLSearchParams();
  formData.forEach((value, key) => value && params.append(key, value));
  state.users = await request(`/api/admin/users?${params.toString()}`);
  renderUsers();
}

// 加载分类列表。
async function loadCategories() {
  state.categories = await request("/api/admin/categories");
  renderCategories();
}

// 按筛选条件加载订单列表。
async function loadOrders() {
  const formData = new FormData(elements.orderFilterForm);
  const params = new URLSearchParams();
  formData.forEach((value, key) => value && params.append(key, value));
  state.orders = await request(`/api/admin/orders?${params.toString()}`);
  renderOrders();
}

// 加载轮播列表。
async function loadBanners() {
  state.banners = await request("/api/admin/banners");
  renderBanners();
}

// 打开通用弹窗并填充标题、内容。
function openModal(title, html) {
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = html;
  elements.modal.classList.remove("hidden");
}

// 关闭通用弹窗，并清空内部内容，避免残留旧表单。
function closeModal() {
  elements.modal.classList.add("hidden");
  elements.modalBody.innerHTML = "";
}

// 生成一级分类下拉框选项。
function categoryOptions(selected) {
  return state.categories
    .map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${item.name}</option>`)
    .join("");
}

// 根据一级分类动态生成二级分类下拉框选项。
function secondCategoryOptions(categoryId, selected) {
  const category = state.categories.find((item) => item.id === categoryId) || state.categories[0] || { children: [] };
  return (category.children || [])
    .map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${item.name}</option>`)
    .join("");
}

// 生成商品编辑表单 HTML。
function productForm(product) {
  const categoryId = product?.categoryId || (state.categories[0] && state.categories[0].id) || "";
  return `
    <form id="product-modal-form" class="modal-form">
      <div class="form-grid">
        <label><span>商品名称</span><input name="name" value="${escapeHtml(product?.name || "")}" required /></label>
        <label><span>商品副标题</span><input name="subtitle" value="${escapeHtml(product?.subtitle || "")}" /></label>
        <label>
          <span>一级分类</span>
          <select name="categoryId" id="product-category-select">${categoryOptions(categoryId)}</select>
        </label>
        <label>
          <span>二级分类</span>
          <select name="secondCategoryId" id="product-second-category-select">${secondCategoryOptions(
            categoryId,
            product?.secondCategoryId || ""
          )}</select>
        </label>
        <label><span>现价</span><input name="presentPrice" type="number" step="0.01" value="${escapeHtml(
          product?.presentPrice || ""
        )}" /></label>
        <label><span>原价</span><input name="oriPrice" type="number" step="0.01" value="${escapeHtml(
          product?.oriPrice || ""
        )}" /></label>
        <label><span>库存</span><input name="stock" type="number" value="${escapeHtml(product?.stock || "")}" /></label>
        <label><span>销量</span><input name="sales" type="number" value="${escapeHtml(product?.sales || "")}" /></label>
        <label><span>封面图</span><input name="cover" value="${escapeHtml(product?.cover || "")}" required /></label>
        <label><span>状态</span>
          <select name="status">
            ${state.options.productStatusOptions
              .map(
                (item) => `<option value="${item.value}" ${item.value === product?.status ? "selected" : ""}>${item.label}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="full"><span>标签，使用逗号分隔</span><input name="tags" value="${escapeHtml(
          (product?.tags || []).join(",")
        )}" /></label>
        <label class="full"><span>图库，使用换行或逗号分隔</span><textarea name="gallery" rows="4">${escapeHtml(
          (product?.gallery || []).join("\n")
        )}</textarea></label>
        <label class="full"><span>商品描述</span><textarea name="description" rows="4">${escapeHtml(
          product?.description || ""
        )}</textarea></label>
        <label><span>热卖商品</span>
          <select name="isHot">
            <option value="true" ${product?.isHot ? "selected" : ""}>是</option>
            <option value="false" ${product && !product.isHot ? "selected" : ""}>否</option>
          </select>
        </label>
        <label><span>首页推荐</span>
          <select name="isRecommend">
            <option value="true" ${product?.isRecommend ? "selected" : ""}>是</option>
            <option value="false" ${product && !product.isRecommend ? "selected" : ""}>否</option>
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary-button" data-action="close-modal">取消</button>
        <button type="submit">${product ? "保存修改" : "创建商品"}</button>
      </div>
    </form>
  `;
}

// 生成用户编辑表单 HTML。
function userForm(user) {
  return `
    <form id="user-modal-form" class="modal-form">
      <div class="form-grid">
        <label><span>昵称</span><input name="nickname" value="${escapeHtml(user?.nickname || "")}" required /></label>
        <label><span>手机号</span><input name="phone" value="${escapeHtml(user?.phone || "")}" required /></label>
        <label><span>邮箱</span><input name="email" value="${escapeHtml(user?.email || "")}" /></label>
        <label><span>会员等级</span><input name="level" value="${escapeHtml(user?.level || "普通会员")}" /></label>
        <label><span>所在城市</span><input name="city" value="${escapeHtml(user?.city || "")}" /></label>
        <label><span>状态</span>
          <select name="status">
            ${state.options.userStatusOptions
              .map(
                (item) => `<option value="${item.value}" ${item.value === user?.status ? "selected" : ""}>${item.label}</option>`
              )
              .join("")}
          </select>
        </label>
        <label><span>累计消费</span><input name="totalSpent" type="number" step="0.01" value="${escapeHtml(
          user?.totalSpent || 0
        )}" /></label>
        <label><span>订单数</span><input name="orderCount" type="number" value="${escapeHtml(user?.orderCount || 0)}" /></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary-button" data-action="close-modal">取消</button>
        <button type="submit">${user ? "保存修改" : "创建用户"}</button>
      </div>
    </form>
  `;
}

// 生成分类编辑表单 HTML。
function categoryForm(category) {
  return `
    <form id="category-modal-form" class="modal-form">
      <div class="form-grid">
        <label><span>分类名称</span><input name="name" value="${escapeHtml(category?.name || "")}" required /></label>
        <label><span>分类图片</span><input name="image" value="${escapeHtml(category?.image || "")}" required /></label>
        <label class="full"><span>二级分类，使用逗号分隔</span><textarea name="children" rows="4">${escapeHtml(
          (category?.children || []).map((item) => item.name).join(",")
        )}</textarea></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary-button" data-action="close-modal">取消</button>
        <button type="submit">${category ? "保存修改" : "创建分类"}</button>
      </div>
    </form>
  `;
}

// 生成轮播编辑表单 HTML。
function bannerForm(banner) {
  return `
    <form id="banner-modal-form" class="modal-form">
      <div class="form-grid">
        <label><span>轮播标题</span><input name="title" value="${escapeHtml(banner?.title || "")}" required /></label>
        <label><span>关联商品</span>
          <select name="goodsId">
            ${state.options.products
              .map(
                (item) =>
                  `<option value="${item.id}" ${item.id === banner?.goodsId ? "selected" : ""}>${item.id} - ${item.name}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="full"><span>轮播图片</span><input name="image" value="${escapeHtml(
          banner?.image || ""
        )}" required /></label>
        <label><span>排序</span><input name="sort" type="number" value="${escapeHtml(banner?.sort || 1)}" /></label>
        <label><span>状态</span>
          <select name="status">
            ${state.options.bannerStatusOptions
              .map(
                (item) => `<option value="${item.value}" ${item.value === banner?.status ? "selected" : ""}>${item.label}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary-button" data-action="close-modal">取消</button>
        <button type="submit">${banner ? "保存修改" : "创建轮播"}</button>
      </div>
    </form>
  `;
}

// 监听商品表单中的一级分类变化，并实时刷新二级分类列表。
function bindProductCategoryChange() {
  const categorySelect = document.getElementById("product-category-select");
  const secondSelect = document.getElementById("product-second-category-select");
  if (!categorySelect || !secondSelect) {
    return;
  }
  categorySelect.addEventListener("change", () => {
    secondSelect.innerHTML = secondCategoryOptions(categorySelect.value, "");
  });
}

// 打开商品弹窗，并绑定提交逻辑：
// 新增商品调用 POST，编辑商品调用 PUT。
function openProductModal(productId) {
  const product = state.products.find((item) => item.id === productId);
  openModal(product ? "编辑商品" : "新增商品", productForm(product));
  bindProductCategoryChange();

  document.getElementById("product-modal-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    try {
      if (product) {
        await request(`/api/admin/products/${product.id}`, { method: "PUT", body: payload });
      } else {
        await request("/api/admin/products", { method: "POST", body: payload });
      }
      closeModal();
      await reloadAllCoreData();
      notify(product ? "商品已更新" : "商品已创建");
    } catch (error) {
      notify(error.message);
    }
  });
}

// 打开用户弹窗，并在提交后刷新所有后台核心数据。
function openUserModal(userId) {
  const user = state.users.find((item) => item.id === userId);
  openModal(user ? "编辑用户" : "新增用户", userForm(user));
  document.getElementById("user-modal-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      if (user) {
        await request(`/api/admin/users/${user.id}`, { method: "PUT", body: payload });
      } else {
        await request("/api/admin/users", { method: "POST", body: payload });
      }
      closeModal();
      await reloadAllCoreData();
      notify(user ? "用户已更新" : "用户已创建");
    } catch (error) {
      notify(error.message);
    }
  });
}

// 打开分类弹窗。
function openCategoryModal(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  openModal(category ? "编辑分类" : "新增分类", categoryForm(category));
  document.getElementById("category-modal-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      if (category) {
        await request(`/api/admin/categories/${category.id}`, { method: "PUT", body: payload });
      } else {
        await request("/api/admin/categories", { method: "POST", body: payload });
      }
      closeModal();
      await reloadAllCoreData();
      notify(category ? "分类已更新" : "分类已创建");
    } catch (error) {
      notify(error.message);
    }
  });
}

// 打开轮播弹窗。
function openBannerModal(bannerId) {
  const banner = state.banners.find((item) => item.id === bannerId);
  openModal(banner ? "编辑轮播" : "新增轮播", bannerForm(banner));
  document.getElementById("banner-modal-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      if (banner) {
        await request(`/api/admin/banners/${banner.id}`, { method: "PUT", body: payload });
      } else {
        await request("/api/admin/banners", { method: "POST", body: payload });
      }
      closeModal();
      await reloadAllCoreData();
      notify(banner ? "轮播已更新" : "轮播已创建");
    } catch (error) {
      notify(error.message);
    }
  });
}

// 重新加载后台页面所需的全部核心数据，常用于增删改后的统一刷新。
async function reloadAllCoreData() {
  state.options = await request("/api/admin/options");
  fillSelectOptions();
  await Promise.all([loadOverview(), loadProducts(), loadUsers(), loadCategories(), loadOrders(), loadBanners()]);
}

// 退出登录：
// 可以选择是否先请求后端注销接口，再清空本地 token 和界面状态。
function logout(withRequest = true) {
  const finish = () => {
    state.token = "";
    state.profile = null;
    window.localStorage.removeItem("girl_shop_admin_token");
    elements.appView.classList.add("hidden");
    elements.loginView.classList.remove("hidden");
  };

  if (!withRequest || !state.token) {
    finish();
    return;
  }
  request("/api/admin/logout", { method: "POST" })
    .catch(() => {})
    .finally(finish);
}

// 后台初始化入口：
// 登录成功后或本地已有 token 时，拉取管理员资料和所有页面数据。
async function bootstrap() {
  try {
    state.profile = await request("/api/admin/profile");
    state.options = await request("/api/admin/options");
    elements.adminName.textContent = state.profile.name;
    elements.adminRole.textContent = state.profile.role;
    elements.sidebarShopName.textContent = "商业后台演示版";
    fillSelectOptions();
    await Promise.all([loadOverview(), loadProducts(), loadUsers(), loadCategories(), loadOrders(), loadBanners()]);
    elements.loginView.classList.add("hidden");
    elements.appView.classList.remove("hidden");
    setView("dashboard");
  } catch (error) {
    logout(false);
    notify(error.message);
  }
}

// 登录表单提交：拿到 token 后写入 localStorage，再执行后台初始化。
elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  try {
    const result = await request("/api/admin/login", {
      method: "POST",
      body: payload,
    });
    state.token = result.token;
    window.localStorage.setItem("girl_shop_admin_token", result.token);
    await bootstrap();
  } catch (error) {
    notify(error.message);
  }
});

// 基础交互：退出登录、关闭弹窗、点击遮罩关闭弹窗。
elements.logoutButton.addEventListener("click", () => logout(true));
elements.modalClose.addEventListener("click", closeModal);
elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) {
    closeModal();
  }
});

// 用事件委托集中处理列表中的所有按钮点击，避免为每一行重复绑定事件。
document.body.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;

  if (action === "close-modal") {
    closeModal();
    return;
  }
  if (action === "edit-product") {
    openProductModal(id);
    return;
  }
  if (action === "delete-product") {
    if (!window.confirm("确认删除该商品吗？")) {
      return;
    }
    try {
      await request(`/api/admin/products/${id}`, { method: "DELETE" });
      await reloadAllCoreData();
      notify("商品已删除");
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (action === "toggle-product") {
    try {
      await request(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        body: { status: event.target.dataset.status },
      });
      await reloadAllCoreData();
      notify("商品状态已更新");
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (action === "edit-user") {
    openUserModal(id);
    return;
  }
  if (action === "toggle-user") {
    try {
      await request(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: { status: event.target.dataset.status },
      });
      await reloadAllCoreData();
      notify("用户状态已更新");
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (action === "edit-category") {
    openCategoryModal(id);
    return;
  }
  if (action === "delete-category") {
    if (!window.confirm("确认删除该分类吗？")) {
      return;
    }
    try {
      await request(`/api/admin/categories/${id}`, { method: "DELETE" });
      await reloadAllCoreData();
      notify("分类已删除");
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (action === "update-order") {
    const select = document.querySelector(`[data-order-select="${id}"]`);
    try {
      await request(`/api/admin/orders/${id}`, {
        method: "PUT",
        body: { status: select.value },
      });
      await reloadAllCoreData();
      notify("订单状态已更新");
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (action === "edit-banner") {
    openBannerModal(id);
    return;
  }
  if (action === "delete-banner") {
    if (!window.confirm("确认删除该轮播吗？")) {
      return;
    }
    try {
      await request(`/api/admin/banners/${id}`, { method: "DELETE" });
      await reloadAllCoreData();
      notify("轮播已删除");
    } catch (error) {
      notify(error.message);
    }
  }
});

// 左侧导航切换页面。
elements.navItems.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

// 三个筛选表单分别触发对应列表刷新。
elements.productFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadProducts();
});

elements.userFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadUsers();
});

elements.orderFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadOrders();
});

// 新增按钮直接打开各自的编辑弹窗。
document.getElementById("create-product-button").addEventListener("click", () => openProductModal());
document.getElementById("create-user-button").addEventListener("click", () => openUserModal());
document.getElementById("create-category-button").addEventListener("click", () => openCategoryModal());
document.getElementById("create-banner-button").addEventListener("click", () => openBannerModal());

// 页面刷新后如果本地仍有 token，则尝试直接恢复登录状态。
if (state.token) {
  bootstrap();
}
