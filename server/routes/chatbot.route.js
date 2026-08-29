const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const chatbotController = require("../controllers/chatbot.controller");

router.post("/", verifyToken, chatbotController.chatWithBot);

module.exports = router;
