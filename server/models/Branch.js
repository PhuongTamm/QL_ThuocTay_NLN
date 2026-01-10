const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    type: { type: String, enum: ["warehouse", "store"], default: "store" }, // warehouse: Kho tổng, store: Chi nhánh
  },
  { timestamps: true }
);
module.exports = mongoose.model("Branch", branchSchema);
