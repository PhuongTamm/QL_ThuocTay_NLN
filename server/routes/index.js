const authRoutes = require("../routes/auth.route");
const { notFound, errorHandler } = require("../middleware/errorHandler");
// const inventoryRoutes = require('../routes/inventory.route'); // (Sẽ thêm sau)
// const invoiceRoutes = require('../routes/invoice.route');     // (Sẽ thêm sau)

const initRoutes = (app) => {
  app.use("/api/auth", authRoutes);

  app.use(notFound);
  app.use(errorHandler);
};
module.exports = initRoutes;
