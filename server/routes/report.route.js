const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const reportController = require("../controllers/report.controller");

router.use(verifyToken);

// Thống kê Dashboard 
router.get(
  "/dashboard",
  checkRole(["admin", "branch_manager", "warehouse_manager"]),
  reportController.getDashboardStats,
);

//Báo cáo doanh thu 
router.get(
  "/revenue",
  checkRole(["admin", "branch_manager", "warehouse_manager"]),
  reportController.getRevenueReport,
);

// Top thuốc bán chạy
router.get(
  "/top-medicines",
  checkRole(["admin", "branch_manager", "warehouse_manager", "pharmacist"]),
  reportController.getTopMedicines,
);

router.get(
  "/profit-analytics",
  verifyToken,
  checkRole(["admin", "warehouse_manager", "branch_manager"]),
  reportController.getProfitAnalytics,
);

module.exports = router;
