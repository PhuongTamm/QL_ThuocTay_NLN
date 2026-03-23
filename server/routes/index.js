const authRoutes = require("../routes/auth.route");
const medicineRoutes = require("../routes/medicine.route");
const transactionRoutes = require("../routes/transaction.route");
const branchRoutes = require("../routes/branch.route");
const inventoryRoutes = require("../routes/inventory.route");
const categoryRoutes = require("../routes/category.route");
const userRoutes = require("../routes/user.route");
const reportRoutes = require("../routes/report.route");
const customerRoutes = require("../routes/customer.route");
const { notFound, errorHandler } = require("../middleware/errorHandler");

const initRoutes = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/medicines", medicineRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/branches", branchRoutes);
  app.use("/api/inventories", inventoryRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/reports", reportRoutes);

  app.use(notFound);
  app.use(errorHandler);
};
module.exports = initRoutes;
