const mongoose = require("mongoose");

const monthlyInventorySchema = new mongoose.Schema(
  {
    month: { type: Number, required: true }, // Tháng 1-12
    year: { type: Number, required: true }, // Năm 2025
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    }, // ID của kho tổng
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineVariant",
      required: true,
    },

    // Công thức: Cuối kỳ = Đầu kỳ + Nhập - Xuất
    startQuantity: { type: Number, default: 0 }, // Tồn đầu kỳ
    importQuantity: { type: Number, default: 0 }, // Nhập trong kỳ
    exportQuantity: { type: Number, default: 0 }, // Xuất trong kỳ
    endQuantity: { type: Number, default: 0 }, // Tồn cuối kỳ
  },
  { timestamps: true }
);

// Đảm bảo mỗi thuốc chỉ có 1 dòng báo cáo trong 1 tháng tại kho
monthlyInventorySchema.index(
  { month: 1, year: 1, warehouseId: 1, variantId: 1 },
  { unique: true }
);

module.exports = mongoose.model("MonthlyInventory", monthlyInventorySchema);
