const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const transactionController = require("../controllers/transaction.controller");

// Nhập hàng từ NCC
router.post(
  "/import-supplier",
  verifyToken,
  checkRole(["warehouse_manager", "admin"]),
  transactionController.importFromSupplier,
);

// Phân phối hàng (Kho -> Chi nhánh)
router.post(
  "/distribute",
  verifyToken,
  checkRole(["warehouse_manager", "admin"]),
  transactionController.createDistributionRequest,
);

// Lấy danh sách chờ nhập
router.get(
  "/pending-import",
  verifyToken,
  checkRole(["branch_manager", "admin", "warehouse_manager"]),
  transactionController.getPendingImports,
);

router.get(
  "/batch-history",
  verifyToken,
  transactionController.getBatchImportHistory,
);

// Xác nhận nhập kho
router.put(
  "/:id/confirm-import",
  verifyToken,
  checkRole(["branch_manager", "admin", "warehouse_manager"]),
  transactionController.confirmImport,
);

// Bán lẻ tại chi nhánh 
router.post(
  "/sell",
  verifyToken,
  checkRole(["branch_manager", "pharmacist", "admin"]),
  transactionController.sellAtBranch,
);

router.get(
  "/history",
  verifyToken,
  transactionController.getTransactionHistory,
);

router.post("/return", verifyToken, transactionController.returnToWarehouse); //trả hàng về kho tổng
router.post("/dispose", verifyToken, checkRole(["admin", "warehouse_manager"]), transactionController.disposeInventory); //hủy hàng tồn kho (hết hạn, hư hỏng)
module.exports = router;
