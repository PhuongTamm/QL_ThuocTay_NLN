const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String },
    password: { type: String, required: true }, // Cần hash password bằng bcrypt
    fullName: { type: String },
    role: {
      type: String,
      enum: ["admin", "warehouse_manager", "branch_manager", "pharmacist"],
      required: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // Null nếu là Admin/Warehouse Manager tổng
    email: {
      type: String,
      required: true,
      unique: true, // Quan trọng: Không được trùng email
      lowercase: true, // Tự động chuyển về chữ thường để tránh lỗi A@g.com khác a@g.com
      trim: true,
    },
    phone: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
