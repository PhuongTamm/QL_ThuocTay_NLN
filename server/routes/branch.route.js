const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const {
  createBranch,
  getAllBranches,
  updateBranch,
  deleteBranch,
  getBranchById,
} = require("../controllers/branch.controller");

router.get("/", verifyToken, getAllBranches);
router.post("/", verifyToken, checkRole(["admin"]), createBranch);

router.put("/:id", verifyToken, checkRole(["admin"]), updateBranch);
router.delete("/:id", verifyToken, checkRole(["admin"]), deleteBranch);
router.get(
  "/:id",
  verifyToken,
  checkRole(["admin", "branch_manager", "warehouse_manager"]),
  getBranchById,
);

module.exports = router;
