const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true }, // VD: Paracetamol

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true, // Bắt buộc phải chọn nhóm khi tạo thuốc
    },

    // Bổ sung thêm cờ để phân loại thuốc kê đơn (Quan trọng trong y tế)
    isPrescription: { type: Boolean, default: false },

    manufacturer: { type: String }, // VD: Dược Hậu Giang
    ingredients: { type: String }, // Hoạt chất
    description: { type: String },

    images: [{ type: String }],
    baseUnit: { type: String, required: true, default: "Viên" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Medicine", medicineSchema);
