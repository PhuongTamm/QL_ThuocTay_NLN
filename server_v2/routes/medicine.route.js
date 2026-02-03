const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const medicineController = require("../controllers/medicine.controller");
const uploadCloud = require("../configs/cloudinary"); // Import middleware upload

// Medicine Routes
router.get("/", verifyToken, medicineController.getAllMedicines);
router.post(
  "/",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.createMedicine,
);

router.get("/variants", verifyToken, medicineController.getAllVariants); // Mới

router.post(
  "/variants",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  // Đổi .single("image") thành .array("images", 10) -> Cho phép tối đa 10 ảnh
  uploadCloud.array("images", 10),
  medicineController.createVariant,
);

// 2. Cập nhật biến thể (Upload thêm ảnh)
router.put(
  "/variants/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  uploadCloud.array("images", 10),
  medicineController.updateVariant,
);

// 3. Xóa biến thể
router.delete(
  "/variants/:id",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.deleteVariant,
);

module.exports = router;
