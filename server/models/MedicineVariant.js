const mongoose = require("mongoose");

const medicineVariantSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    sku: { type: String, required: true, unique: true }, // Mã định danh riêng biến thể (VD: PARA-SUI, PARA-NEN)

    name: { type: String, required: true }, // VD: Paracetamol sủi 500mg
    unit: { type: String, required: true }, // Đơn vị tính: Hộp, Chai, Vỉ
    packagingSpecification: { type: String }, // Quy cách: Hộp 20 vỉ x 10 viên

    // Quản lý giá theo thời gian (Tương ứng bảng DONGIA trong CDM)
    currentPrice: { type: Number, required: true }, // Giá hiện tại để bán nhanh
    priceHistory: [
      {
        price: { type: Number, required: true },
        effectiveDate: { type: Date, default: Date.now }, // Ngày áp dụng
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    conversionRate: { type: Number, required: true, default: 1 }, // Tỷ lệ quy đổi về đơn vị gốc (VD: 1 Hộp = 20 Vỉ x 10 Viên = 200 Viên => conversionRate = 200)
  },
  { timestamps: true },
);

module.exports = mongoose.model("MedicineVariant", medicineVariantSchema);
