const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },

  type: {
    type: String,
    enum: [
      "IMPORT_SUPPLIER",
      "EXPORT_TO_BRANCH",
      "TRANSFER_BRANCH",
      "RETURN_TO_WAREHOUSE",
    ],
    required: true,
  },
  supplierName: { type: String }, // Chỉ dùng khi type = IMPORT_SUPPLIER
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
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
      expiryDate: { type: Date },
      manufacturingDate: { type: Date },
      quantity: { type: Number, required: true },
      price: { type: Number },
      quality: {
        type: String,
        enum: ["Good", "Damaged", "Expired"],
        default: "Good",
      },
    },
  ],

  totalValue: { type: Number },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
