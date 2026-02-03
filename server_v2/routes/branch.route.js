const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const {
  createBranch,
  getAllBranches,
} = require("../controllers/branch.controller"); //chỉ lấy 2 hàm này ở branch.controller

router.get("/", verifyToken, getAllBranches);
router.post("/", verifyToken, checkRole(["admin"]), createBranch);

module.exports = router;
