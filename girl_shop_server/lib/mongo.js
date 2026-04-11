const { connectDatabase } = require("../config/db");
const models = require("../models");

module.exports = {
  connectMongo: connectDatabase,
  models,
};
