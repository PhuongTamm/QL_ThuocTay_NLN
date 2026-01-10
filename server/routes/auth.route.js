// auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller"); // Import controller
const { verifyToken, checkRole } = require("../middleware/authMiddleware"); // Import middleware

// Route công khai
router.post("/login", authController.login);

// Route đăng ký (Chỉ Admin mới tạo được User mới - Tùy nghiệp vụ của bạn)
// Nếu muốn tạo Admin đầu tiên, bạn có thể tạm thời bỏ verifyToken, checkRole
router.post(
  "/register",
  verifyToken,
  checkRole(["admin"]),
  authController.register
);

// Route lấy thông tin cá nhân (Yêu cầu phải đăng nhập)
router.get("/me", verifyToken, authController.getMe);

module.exports = router;
