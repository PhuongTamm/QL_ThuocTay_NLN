const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // SĐT là duy nhất
    points: { type: Number, default: 0 }, // tích điểm 
    totalSpent: { type: Number, default: 0 }, // Tổng tiền khách đã mua
  },
  { timestamps: true },
);

module.exports = mongoose.model("Customer", customerSchema);
