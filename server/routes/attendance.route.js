const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const { verifyToken } = require("../middleware/authMiddleware"); // Import middleware

// Route public cho máy chấm công dùng chung ở cửa hàng
router.post("/check-in", attendanceController.checkInWithFace);

// Route đăng ký mặt (cần token)
router.post("/register-face", attendanceController.registerFace);

// Yêu cầu đăng nhập
router.get("/my-history", verifyToken, attendanceController.getMyAttendanceHistory);

module.exports = router;
