const authRoutes = require("../routes/auth.route");
const medicineRoutes = require("../routes/medicine.route");
const transactionRoutes = require("../routes/transaction.route");
const branchRoutes = require("../routes/branch.route");
const inventoryRoutes = require("../routes/inventory.route");
const categoryRoutes = require("../routes/category.route");
const { notFound, errorHandler } = require("../middleware/errorHandler");

const initRoutes = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/medicines", medicineRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/branches", branchRoutes);
  app.use("/api/inventories", inventoryRoutes);
  app.use("/api/categories", categoryRoutes);

  app.use(notFound);
  app.use(errorHandler);
};
module.exports = initRoutes;
