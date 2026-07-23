const mongoose = require("mongoose");
const crypto = require("crypto");
const vectorService = require("../services/vector.service");

const medicineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true }, // VD: Paracetamol

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true, // Bắt buộc phải chọn nhóm khi tạo thuốc
    },

    // Bổ sung thêm cờ để phân loại thuốc kê đơn (Quan trọng trong y tế)
    isPrescription: { type: Boolean, default: false },

    manufacturer: { type: String }, // VD: Dược Hậu Giang
    ingredients: { type: String }, // Hoạt chất
    description: { type: String },

    images: [{ type: String }],
    baseUnit: { type: String, required: true, default: "Viên" },

    // MAC: Giá vốn bình quân gia quyền tính trên 1 Đơn Vị Cơ Sở
    mac: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Hàm tạo nội dung văn bản hoàn chỉnh để AI đọc hiểu dễ dàng
const generateTextForEmbedding = (doc, categoryName) => {
  return `Thuốc: ${doc.name}. Mã: ${doc.code}. Danh mục: ${categoryName}. Hoạt chất/Thành phần: ${doc.ingredients || 'Không rõ'}. Mô tả công dụng: ${doc.description || 'Không có mô tả'}. Nhà sản xuất: ${doc.manufacturer || 'Không rõ'}. Thuốc này là loại ${doc.isPrescription ? 'Kê đơn' : 'Không kê đơn'}.`;
};

// Chuyển MongoDB ObjectId thành UUID (Qdrant yêu cầu ID là UUID hoặc số nguyên)
const objectIdToUUID = (id) => {
  const hash = crypto.createHash("md5").update(id.toString()).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
};

// Hook SAU KHI LƯU (Thêm mới hoặc Cập nhật)
medicineSchema.post("save", async function (doc) {
  try {
    const Category = mongoose.model("Category");
    const categoryInfo = await Category.findById(doc.categoryId).lean();
    const categoryName = categoryInfo ? categoryInfo.name : "Chưa phân loại";

    const textToEmbed = generateTextForEmbedding(doc, categoryName);
    const qdrantId = objectIdToUUID(doc._id);
    
    await vectorService.upsertDocument(
      qdrantId,
      { type: "medicine", mongoId: doc._id.toString(), name: doc.name },
      textToEmbed
    );
    console.log(`✅ Đã đồng bộ thuốc ${doc.name} (Danh mục: ${categoryName}) lên Qdrant.`);
  } catch (error) {
    console.error("❌ Lỗi đồng bộ Qdrant:", error);
  }
});

// Hook SAU KHI XÓA
medicineSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const qdrantId = objectIdToUUID(doc._id);
    await vectorService.deleteDocument(qdrantId);
  }
});

module.exports = mongoose.model("Medicine", medicineSchema);
