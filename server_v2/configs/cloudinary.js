const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// 1. Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Cấu hình nơi lưu trữ (Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pharmacy-medicines", // Tên thư mục trên Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp", "avif"], // Định dạng cho phép
    transformation: [{ width: 500, height: 500, crop: "limit" }], // (Tùy chọn) Resize ảnh cho nhẹ
  },
});

// 3. Khởi tạo Multer upload
const uploadCloud = multer({ storage });

module.exports = uploadCloud;
