const createSeedData = require("./seed-data");
const { connectMongo, models } = require("./mongo");

// 递归剥离 MongoDB 自动生成的字段，避免这些字段污染前台业务对象。
function stripMongoFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripMongoFields(item));
  }
  if (value && typeof value === "object") {
    const next = {};
    Object.keys(value).forEach((key) => {
      if (key !== "_id" && key !== "__v") {
        next[key] = stripMongoFields(value[key]);
      }
    });
    return next;
  }
  return value;
}

// 用新数据完全替换某个集合，当前项目把它当作“整库快照写入”的基础能力。
async function replaceCollection(model, documents) {
  await model.deleteMany({});
  if (documents && documents.length) {
    await model.insertMany(documents.map((item) => stripMongoFields(item)));
  }
}

// 确保数据库中至少有一套初始数据；首次启动时自动写入种子数据。
async function ensureDatabase() {
  await connectMongo();
  const settingsCount = await models.Setting.countDocuments();
  if (settingsCount > 0) {
    return;
  }
  await writeDatabase(createSeedData());
}

// 从多个集合并行读取数据，再组装成项目内部统一使用的数据库对象。
async function readDatabase() {
  await ensureDatabase();
  const [settings, adminUsers, categories, products, homeTabs, homeSections, banners, floorSections, users, orders] =
    await Promise.all([
      models.Setting.findOne({}).lean(),
      models.AdminUser.find({}).sort({ id: 1 }).lean(),
      models.Category.find({}).sort({ id: 1 }).lean(),
      models.Product.find({}).sort({ id: 1 }).lean(),
      models.HomeTab.find({}).sort({ id: 1 }).lean(),
      models.HomeSection.find({}).sort({ id: 1 }).lean(),
      models.Banner.find({}).sort({ sort: 1 }).lean(),
      models.FloorSection.find({}).sort({ id: 1 }).lean(),
      models.User.find({}).sort({ id: 1 }).lean(),
      models.Order.find({}).sort({ createdAt: -1 }).lean(),
    ]);

  return {
    // home_sections 在数据库里是按 tab 拆开的，这里重新组装成对象映射，方便业务层直接按 id 取值。
    settings: stripMongoFields(settings || {}),
    adminUsers: stripMongoFields(adminUsers || []),
    categories: stripMongoFields(categories || []),
    products: stripMongoFields(products || []),
    homeTabs: stripMongoFields(homeTabs || []),
    homeSections: (homeSections || []).reduce((result, item) => {
      result[item.id] = stripMongoFields(item.items || []);
      return result;
    }, {}),
    banners: stripMongoFields(banners || []),
    floorSections: stripMongoFields(floorSections || []),
    users: stripMongoFields(users || []),
    orders: stripMongoFields(orders || []),
  };
}

// 把内存中的数据库快照完整写回 MongoDB。
// 这种写法对 demo 项目简单直接，也方便和后台管理页面保持一致。
async function writeDatabase(database) {
  await connectMongo();
  await Promise.all([
    replaceCollection(models.Setting, database.settings ? [database.settings] : []),
    replaceCollection(models.AdminUser, database.adminUsers || []),
    replaceCollection(models.Category, database.categories || []),
    replaceCollection(models.Product, database.products || []),
    replaceCollection(models.HomeTab, database.homeTabs || []),
    replaceCollection(
      models.HomeSection,
      Object.entries(database.homeSections || {}).map(([id, items]) => ({
        id,
        items,
      }))
    ),
    replaceCollection(models.Banner, database.banners || []),
    replaceCollection(models.FloorSection, database.floorSections || []),
    replaceCollection(models.User, database.users || []),
    replaceCollection(models.Order, database.orders || []),
  ]);
  return database;
}

// 读取当前数据库快照，执行变更函数，再统一写回。
async function mutateDatabase(mutator) {
  const database = await readDatabase();
  const updated = (await mutator(database)) || database;
  return writeDatabase(updated);
}

// 重置整套数据库数据，常用于开发调试和重新生成演示数据。
async function resetDatabase() {
  return writeDatabase(createSeedData());
}

module.exports = {
  ensureDatabase,
  readDatabase,
  writeDatabase,
  mutateDatabase,
  resetDatabase,
};
