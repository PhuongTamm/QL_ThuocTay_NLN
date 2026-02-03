const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./configs/db");
const initRoutes = require("./routes"); // tự lấy file index.js trong routes

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());

// Parse dữ liệu JSON từ body request
app.use(express.json());

// Parse dữ liệu từ form urlencoded
app.use(express.urlencoded({ extended: true }));

db.connectDB();
initRoutes(app);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});
