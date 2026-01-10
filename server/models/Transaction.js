const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: [
        "IMPORT_SUPPLIER",
        "EXPORT_TO_BRANCH",
        "TRANSFER_BRANCH",
        "RETURN_TO_WAREHOUSE",
      ],
    },
    fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // Null nếu nhập từ NCC
    toBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // Null nếu hủy/xuất thẳng
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    details: [
      {
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
        batchCode: { type: String },
        expiryDate: { type: Date }, // Bắt buộc nếu là Import mới
        quantity: { type: Number, required: true },
        price: { type: Number }, // Giá nhập hoặc giá vốn lúc chuyển
        quality: {
          type: String,
          enum: ["Good", "Damaged", "Expired"],
          default: "Good",
        },
      },
    ],
    totalValue: { type: Number },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Transaction", transactionSchema);
