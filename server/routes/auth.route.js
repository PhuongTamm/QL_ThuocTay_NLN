// auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const uploadCloud = require("../configs/cloudinary");

// Route công khai
router.post("/login", authController.login);

// Route đăng ký (Chỉ Admin mới tạo được User mới)
router.post(
  "/register",
  verifyToken,
  checkRole(["admin"]),
  authController.register
);

router.get(
  "/users",
  verifyToken,
  checkRole(["admin"]),
  authController.getAllUsers,
);

// Route lấy thông tin cá nhân (Yêu cầu phải đăng nhập)
router.get("/me", verifyToken, authController.getMe);

router.put(
  "/profile",
  verifyToken,
  uploadCloud.single("avatar"),
  authController.updateProfile,
);

module.exports = router;
