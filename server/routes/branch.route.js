const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const {
  createBranch,
  getAllBranches,
  updateBranch,
  deleteBranch,
} = require("../controllers/branch.controller"); //chỉ lấy 2 hàm này ở branch.controller

router.get("/", verifyToken, getAllBranches);
router.post("/", verifyToken, checkRole(["admin"]), createBranch);

router.put("/:id", verifyToken, checkRole(["admin"]), updateBranch);
router.delete("/:id", verifyToken, checkRole(["admin"]), deleteBranch);

module.exports = router;
