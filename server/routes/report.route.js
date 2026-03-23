const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const reportController = require("../controllers/report.controller");

// Tất cả các route báo cáo đều yêu cầu đăng nhập
router.use(verifyToken);

// 1. Thống kê Dashboard (Cho phép Admin và Quản lý chi nhánh)
router.get(
  "/dashboard",
  checkRole(["admin", "branch_manager", "warehouse_manager"]),
  reportController.getDashboardStats,
);

// 2. Báo cáo doanh thu (Kèm chart data)
router.get(
  "/revenue",
  checkRole(["admin", "branch_manager"]),
  reportController.getRevenueReport,
);

// 3. Top thuốc bán chạy
router.get(
  "/top-medicines",
  checkRole(["admin", "branch_manager", "pharmacist"]),
  reportController.getTopMedicines,
);

module.exports = router;
