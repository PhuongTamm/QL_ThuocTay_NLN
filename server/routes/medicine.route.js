const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const medicineController = require("../controllers/medicine.controller");
const uploadCloud = require("../configs/cloudinary");

// --- API THUỐC GỐC (Bổ sung uploadCloud vào POST và PUT) ---
router.get("/", verifyToken, medicineController.getAllMedicines);
router.post(
  "/",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  uploadCloud.array("images", 10), // CHUYỂN UPLOAD ẢNH VỀ ĐÂY
  medicineController.createMedicine,
);
router.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  uploadCloud.array("images", 10), // Hỗ trợ upload thêm ảnh khi sửa thuốc gốc
  medicineController.updateMedicine,
);
router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.deleteMedicine,
);

// --- API BIẾN THỂ / QUY CÁCH (Xóa uploadCloud đi) ---
router.get("/variants", verifyToken, medicineController.getAllVariants);
router.post(
  "/variants",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.createVariant,
);
router.put(
  "/variants/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.updateVariant,
);
router.delete(
  "/variants/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.deleteVariant,
);

module.exports = router;
