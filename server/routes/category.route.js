const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// Tạo danh mục (Chỉ Admin/Thủ kho)
router.post(
  "/",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  categoryController.createCategory,
);

// Lấy danh sách danh mục (Ai cũng xem được)
router.get("/", verifyToken, categoryController.getAllCategories);

module.exports = router;
