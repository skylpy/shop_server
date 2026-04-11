const mongoose = require("mongoose");

let connectPromise = null;

function connectDatabase() {
  if (!connectPromise) {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/girl_shop_admin";
    connectPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return connectPromise;
}

module.exports = {
  connectDatabase,
};
