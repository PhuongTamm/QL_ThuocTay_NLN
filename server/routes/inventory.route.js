const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const inventoryController = require("../controllers/inventory.controller");

router.get("/", verifyToken, inventoryController.getInventoryByBranch);

module.exports = router;
