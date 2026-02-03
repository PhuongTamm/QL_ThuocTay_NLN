const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const transactionController = require("../controllers/transaction.controller");

// 1. Nhập hàng từ NCC
router.post(
  "/import-supplier",
  verifyToken,
  checkRole(["warehouse_manager", "admin"]),
  transactionController.importFromSupplier,
);

// 2. Phân phối hàng (Kho -> Chi nhánh)
router.post(
  "/distribute",
  verifyToken,
  checkRole(["warehouse_manager", "admin"]),
  transactionController.createDistributionRequest,
);

// Lấy danh sách chờ nhập (Cho Chi nhánh)
router.get(
  "/pending-import",
  verifyToken,
  checkRole(["branch_manager", "admin"]),
  transactionController.getPendingImports,
);

// Xác nhận nhập kho (Cho Chi nhánh)
router.put(
  "/:id/confirm-import",
  verifyToken,
  checkRole(["branch_manager", "admin"]),
  transactionController.confirmImport,
);

// 5. Bán lẻ tại chi nhánh (Dành cho Dược sĩ / Quản lý chi nhánh)
router.post(
  "/sell",
  verifyToken,
  // Cho phép cả Admin, Quản lý chi nhánh, và Dược sĩ bán hàng
  checkRole(["branch_manager", "pharmacist", "admin"]),
  transactionController.sellAtBranch,
);

// 6. Xem báo cáo doanh thu (Chỉ Quản lý chi nhánh xem được của mình)
router.get(
  "/revenue",
  verifyToken,
  checkRole(["branch_manager", "admin"]),
  transactionController.getRevenueReport,
);
module.exports = router;
