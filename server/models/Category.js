const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // VD: Kháng sinh, Giảm đau, TPCN
    description: { type: String },
    isActive: { type: Boolean, default: true },

    // Biên độ lợi nhuận kỳ vọng. Ví dụ: 0.2 (tương đương 20%), 0.35 (35%)
    markupPercentage: { type: Number, default: 0.2 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", categorySchema);
