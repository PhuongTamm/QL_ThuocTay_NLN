const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// Lấy danh sách user (Admin only)
router.get("/", verifyToken, checkRole(["admin"]), userController.getAllUsers);

// Xóa user (Admin only) - Endpoint này Frontend đang gọi
router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  userController.deleteUser,
);

// Cập nhật user
router.put(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  userController.updateUser,
);

module.exports = router;
