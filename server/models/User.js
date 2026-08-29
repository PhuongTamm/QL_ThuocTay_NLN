const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String },
    password: { type: String, required: true }, 
    fullName: { type: String },
    role: {
      type: String,
      enum: ["admin", "warehouse_manager", "branch_manager", "pharmacist"],
      required: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, 
    email: {
      type: String,
      required: true,
      unique: true, 
      lowercase: true, // Tự động chuyển về chữ thường để tránh lỗi A@g.com khác a@g.com
      trim: true,
    },
    phone: { type: String },
    avatar: { type: String, default: "" }, 
    faceDescriptor: { type: [Number], default: [] }, // Mảng 128 số đặc trưng khuôn mặt
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
