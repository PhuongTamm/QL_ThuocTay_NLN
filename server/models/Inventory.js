const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    // Tổng số lượng tồn của thuốc này tại chi nhánh (để query nhanh)
    totalQuantity: { type: Number, default: 0 },
    // Chi tiết từng lô đang có tại chi nhánh này
    batches: [
      {
        batchCode: { type: String, required: true }, // Mã lô
        expiryDate: { type: Date, required: true }, // Hạn sử dụng (quan trọng cho FEFO)
        manufacturingDate: { type: Date, required: true }, // ngay san xuat
        initialQuantity: { type: Number, required: true }, // Số lượng gốc lúc nhập vào kho này
        quantity: { type: Number, required: true }, // Số lượng còn lại của lô này
        importPrice: { type: Number }, // Giá nhập của lô này
        quality: {
          type: String,
          enum: ["Good", "Damaged", "Expired"],
          default: "Good",
        },
      },
    ],
  },
  { timestamps: true }
);
// Index để tìm nhanh thuốc tại 1 chi nhánh
inventorySchema.index({ branchId: 1, medicineId: 1 }, { unique: true });
module.exports = mongoose.model("Inventory", inventorySchema);
