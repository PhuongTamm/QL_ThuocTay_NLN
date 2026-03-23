const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const customerController = require("../controllers/customer.controller");

router.get("/", verifyToken, customerController.getAllCustomers);

module.exports = router;
