// scripts/sync-vector.js
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");

const Medicine = require("../models/Medicine");
const MedicineVariant = require("../models/MedicineVariant");
const Category = require("../models/Category");
const Branch = require("../models/Branch");
const vectorService = require("../services/vector.service");

// Hàm băm ID
const objectIdToUUID = (id) => {
  const hash = crypto.createHash("md5").update(id.toString()).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
};

// 1. Text cho Medicine (Đã ghép thêm Variant)
const generateMedicineText = (med, variants) => {
  let text = `Thuốc: ${med.name}. Mã: ${med.code}. Hoạt chất: ${med.ingredients || "Không rõ"}. Mô tả: ${med.description || "Không có"}. NSX: ${med.manufacturer || "Không rõ"}. Loại: ${med.isPrescription ? "Kê đơn" : "Không kê đơn"}. `;

  if (variants && variants.length > 0) {
    const variantStr = variants
      .map((v) => `${v.name} (${v.packagingSpecification || v.unit})`)
      .join(", ");
    text += `Quy cách đóng gói hiện có: ${variantStr}.`;
  }
  return text;
};

// 2. Text cho Category
const generateCategoryText = (cat) => {
  return `Danh mục hệ thống: ${cat.name}. Thuộc tính: Nhóm thuốc/sản phẩm. Mô tả: ${cat.description || "Không có mô tả chi tiết"}.`;
};

// 3. Text cho Branch
const generateBranchText = (branch) => {
  const typeName =
    branch.type === "warehouse" ? "Kho tổng phân phối" : "Chi nhánh bán lẻ";
  return `Cơ sở y tế: ${branch.name}. Phân loại: ${typeName}. Địa chỉ: ${branch.address || "Đang cập nhật"}. Điện thoại: ${branch.phone || "Chưa có"}.`;
};

const syncAllData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await vectorService.initQdrant();

    console.log("🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU LÊN VECTOR DATABASE...\n");

    // ==============================================
    // SYNC 1: BRANCH (CHI NHÁNH)
    // ==============================================
    const branches = await Branch.find().lean();
    console.log(`📍 Đang đồng bộ ${branches.length} Chi nhánh...`);
    for (const branch of branches) {
      await vectorService.upsertDocument(
        objectIdToUUID(branch._id),
        { type: "branch", mongoId: branch._id.toString(), name: branch.name },
        generateBranchText(branch),
      );
    }

    // ==============================================
    // SYNC 2: CATEGORY (DANH MỤC)
    // ==============================================
    const categories = await Category.find().lean();
    console.log(`📁 Đang đồng bộ ${categories.length} Danh mục...`);
    for (const cat of categories) {
      await vectorService.upsertDocument(
        objectIdToUUID(cat._id),
        { type: "category", mongoId: cat._id.toString(), name: cat.name },
        generateCategoryText(cat),
      );
    }

    // ==============================================
    // SYNC 3: MEDICINE + VARIANTS (THUỐC)
    // ==============================================
    const medicines = await Medicine.find().lean();
    console.log(
      `💊 Đang đồng bộ ${medicines.length} Thuốc gốc (kèm quy cách)...`,
    );

    for (const med of medicines) {
      // Tìm các biến thể của thuốc này để ghép vào chuỗi Text
      const variants = await MedicineVariant.find({
        medicineId: med._id,
      }).lean();

      await vectorService.upsertDocument(
        objectIdToUUID(med._id),
        { type: "medicine", mongoId: med._id.toString(), name: med.name },
        generateMedicineText(med, variants),
      );
    }

    console.log("\n🎉 ĐỒNG BỘ TẤT CẢ DỮ LIỆU HOÀN TẤT!");
  } catch (error) {
    console.error("💥 Lỗi hệ thống:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

syncAllData();
