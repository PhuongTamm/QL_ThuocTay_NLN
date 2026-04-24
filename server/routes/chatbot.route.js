const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const chatbotController = require("../controllers/chatbot.controller");

// Phải đăng nhập mới được chat
router.post("/", verifyToken, chatbotController.chatWithBot);

module.exports = router;
