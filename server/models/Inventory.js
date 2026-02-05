const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    }, // Nếu null hoặc định nghĩa ID riêng thì là Kho tổng
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineVariant",
      required: true,
    },

    totalQuantity: { type: Number, default: 0 }, // Tổng tất cả các lô

    batches: [
      {
        batchCode: { type: String, required: true }, // A123
        expiryDate: { type: Date, required: true },
        manufacturingDate: { type: Date },

        // Số lượng hiện tại còn trong kho (Realtime stock)
        quantity: { type: Number, default: 0 },

        initialQuantity: { type: Number, default: 0 }, // Số lượng ban đầu khi nhập lô (dùng để tính toán hiệu suất)

        // Giá nhập (có thể dùng giá bình quân gia quyền hoặc giá nhập lần cuối tùy nghiệp vụ)
        importPrice: { type: Number },

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

// Tìm nhanh biến thể thuốc tại 1 kho
inventorySchema.index({ branchId: 1, variantId: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);
