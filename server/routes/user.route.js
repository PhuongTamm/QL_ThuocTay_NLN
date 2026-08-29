const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// Lấy danh sách user 
router.get("/", verifyToken, checkRole(["admin"]), userController.getAllUsers);

// Xóa user
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
