const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // Mã phiếu (PN_123, PX_456)

    // Loại giao dịch
    type: {
      type: String,
      enum: [
        "IMPORT_SUPPLIER", // Nhập từ NCC vào Kho tổng
        "EXPORT_TO_BRANCH", // Xuất từ Kho tổng sang Chi nhánh
        "SALE_AT_BRANCH", // Bán lẻ tại chi nhánh
        "RETURN_TO_WAREHOUSE", // Trả hàng về kho tổng
      ],
      required: true,
    },

    // --- QUAN TRỌNG: TRẠNG THÁI PHIẾU ---
    // PENDING: Phiếu xuất đã tạo, trừ kho nguồn nhưng chưa nhập kho đích
    // COMPLETED: Đã hoàn thành (Nhập từ NCC mặc định là Completed)
    // CANCELLED: Đã hủy
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "CANCELLED"],
      default: "COMPLETED",
    },

    // --- THÔNG TIN NGUỒN / ĐÍCH (Sửa lại tên cho khớp Controller) ---
    fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // Nơi xuất (Kho tổng/Chi nhánh A)
    toBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // Nơi nhập (Chi nhánh B)

    supplierName: { type: String }, // Chỉ dùng cho IMPORT_SUPPLIER
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },

    details: [
      {
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MedicineVariant",
          required: true,
        },

        // Thông tin Lô
        batchCode: { type: String, required: true }, // A123
        expiryDate: { type: Date, required: true },
        manufacturingDate: { type: Date }, // Bổ sung ngày sản xuất

        quantity: { type: Number, required: true },

        // Giá này linh hoạt tùy loại phiếu:
        // - Nhập NCC: Giá nhập
        // - Xuất chi nhánh: Giá vốn (ImportPrice)
        // - Bán lẻ: Giá bán ra
        price: { type: Number },
      },
    ],

    totalValue: { type: Number },
  },
  { timestamps: true },
); // Tự động thêm createdAt, updatedAt

module.exports = mongoose.model("Transaction", transactionSchema);
