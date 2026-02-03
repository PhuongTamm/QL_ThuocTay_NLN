const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const inventoryController = require("../controllers/inventory.controller");

router.get("/", verifyToken, inventoryController.getInventoryByBranch);
router.get(
  "/monthly-report",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  inventoryController.getMonthlyReport,
);
module.exports = router;
