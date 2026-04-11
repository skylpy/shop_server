const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { ensureDatabase } = require("./services/databaseService");
const routes = require("./routes");
const legacyProxy = require("./middlewares/legacyProxy");
const auditTrail = require("./middlewares/auditTrail");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true, quiet: true });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "public")));
app.use(legacyProxy);
app.use(auditTrail);
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3000;

ensureDatabase()
  .then(() => {
    app.listen(port, () => {
      logger.info(`server running @http://localhost:${port}`);
    });
  })
  .catch((error) => {
    logger.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

module.exports = app;
