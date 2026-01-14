const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const medicineController = require("../controllers/medicine.controller");

// Medicine Routes
router.get("/", verifyToken, medicineController.getAllMedicines);
router.post(
  "/",
  verifyToken,
  checkRole(["admin", "warehouse_manager"]),
  medicineController.createMedicine
);

module.exports = router;
