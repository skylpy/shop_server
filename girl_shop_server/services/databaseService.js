const createSeedData = require("./seedDataService");
const { connectDatabase } = require("../config/db");
const models = require("../models");
const { hashText } = require("./securityService");

const demoUserPasswords = [
  { id: "U1001", phone: "13800000001", password: "User@123456" },
  { id: "U1002", phone: "13800000002", password: "User@123456" },
  { id: "U1003", phone: "13800000003", password: "User@123456" },
  { id: "U1004", phone: "13800000004", password: "User@123456" },
];

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

async function replaceCollection(model, documents) {
  await model.deleteMany({});
  if (documents && documents.length) {
    await model.insertMany(documents.map((item) => stripMongoFields(item)));
  }
}

async function ensureDatabase() {
  await connectDatabase();
  const settingsCount = await models.Setting.countDocuments();
  if (settingsCount > 0) {
    await Promise.all(
      demoUserPasswords.map((item) =>
        models.User.updateOne(
          {
            id: item.id,
            phone: item.phone,
            $or: [{ passwordHash: { $exists: false } }, { passwordHash: "" }],
          },
          {
            $set: {
              passwordHash: hashText(item.password),
            },
          }
        )
      )
    );
    return;
  }
  await writeDatabase(createSeedData());
}

async function readDatabase() {
  await ensureDatabase();
  const [settings, adminUsers, categories, products, homeTabs, homeSections, banners, floorSections, users, orders, operationLogs] =
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
      models.OperationLog.find({}).sort({ createdAt: -1 }).lean(),
    ]);

  return {
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
    operationLogs: stripMongoFields(operationLogs || []),
  };
}

async function writeDatabase(database) {
  await connectDatabase();
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
    replaceCollection(models.OperationLog, database.operationLogs || []),
  ]);
  return database;
}

async function mutateDatabase(mutator) {
  const database = await readDatabase();
  const updated = (await mutator(database)) || database;
  return writeDatabase(updated);
}

async function resetDatabase() {
  return writeDatabase(createSeedData());
}

module.exports = {
  ensureDatabase,
  mutateDatabase,
  readDatabase,
  resetDatabase,
  writeDatabase,
};
