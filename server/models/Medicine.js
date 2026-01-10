const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // VD: V001
    name: { type: String, required: true },
    unit: { type: String }, // Đơn vị tính: Viên, Hộp, Vỉ
    price: { type: Number, required: true }, // Giá bán niêm yết
    ingredients: { type: String }, // Thành phần
    manufacturer: { type: String }, // VD: "Dược Hậu Giang", "Sanofi"
    image: { type: String }, // URL ảnh
  },
  { timestamps: true }
);
module.exports = mongoose.model("Medicine", medicineSchema);
