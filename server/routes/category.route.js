const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// Tạo danh mục 
router.post(
  "/",
  verifyToken,
  checkRole(["admin"]),
  categoryController.createCategory,
);

// Lấy danh sách danh mục 
router.get("/", verifyToken, categoryController.getAllCategories);
router.put('/:id', verifyToken, checkRole(["admin"]), categoryController.updateCategory);    
router.delete('/:id', verifyToken, checkRole(["admin"]), categoryController.deleteCategory); 

module.exports = router;
