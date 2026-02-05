const Medicine = require("../models/Medicine");
const MedicineVariant = require("../models/MedicineVariant");

// 1. Lấy danh sách thuốc (Kèm các biến thể của nó)
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().lean();

    // Lấy kèm variants cho từng thuốc (nếu cần hiển thị dạng tree)
    for (let med of medicines) {
      med.variants = await MedicineVariant.find({ medicineId: med._id });
    }

    res.json({ success: true, data: medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Tạo thuốc gốc (Chưa có giá, chưa có quy cách)
exports.createMedicine = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      isPrescription,
      manufacturer,
      ingredients,
      description,
    } = req.body;

    // Validate
    if (!categoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn danh mục thuốc" });
    }

    const newMed = await Medicine.create({
      name,
      categoryId,
      isPrescription,
      manufacturer,
      ingredients,
      description,
    });

    res.status(201).json({
      success: true,
      message:
        "Tạo thuốc gốc thành công. Hãy thêm biến thể (quy cách) cho thuốc này.",
      data: newMed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1. Cập nhật hàm createVariant
exports.createVariant = async (req, res) => {
  try {
    const {
      medicineId,
      sku,
      name,
      unit,
      packagingSpecification,
      currentPrice,
    } = req.body;

    // --- XỬ LÝ NHIỀU ẢNH ---
    // req.files là mảng chứa thông tin các file đã upload
    let imageLinks = [];
    if (req.files && req.files.length > 0) {
      imageLinks = req.files.map((file) => file.path); // Lấy đường dẫn Cloudinary của từng ảnh
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Thuốc gốc không tồn tại" });

    const existSku = await MedicineVariant.findOne({ sku });
    if (existSku)
      return res
        .status(400)
        .json({ success: false, message: "Mã SKU biến thể đã tồn tại" });

    const newVariant = await MedicineVariant.create({
      medicineId,
      sku,
      name,
      unit,
      packagingSpecification,
      currentPrice,
      priceHistory: [{ price: currentPrice, updatedBy: req.user._id }],
      images: imageLinks, // Lưu mảng ảnh
    });

    res.status(201).json({
      success: true,
      message: "Thêm biến thể thành công",
      data: newVariant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Cập nhật hàm updateVariant (Logic: Cộng thêm ảnh mới vào ảnh cũ)
exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // --- XỬ LÝ ẢNH MỚI (NẾU CÓ) ---
    // Sử dụng $push để thêm ảnh mới vào mảng images có sẵn
    let dbUpdateOperation = { ...updateData };

    // Xóa field images khỏi updateData thuần để tránh ghi đè sai (xử lý riêng bên dưới)
    delete dbUpdateOperation.images;

    // Nếu có file mới upload lên
    if (req.files && req.files.length > 0) {
      const newLinks = req.files.map((file) => file.path);
      // Dùng toán tử $push với $each để thêm nhiều phần tử vào mảng
      dbUpdateOperation.$push = { images: { $each: newLinks } };
    }

    // Logic lịch sử giá (Giữ nguyên)
    if (updateData.currentPrice) {
      const oldVariant = await MedicineVariant.findById(id);
      if (
        oldVariant &&
        Number(oldVariant.currentPrice) !== Number(updateData.currentPrice)
      ) {
        const historyEntry = {
          price: updateData.currentPrice,
          updatedBy: req.user._id,
          effectiveDate: new Date(),
        };
        // Nếu đã có $push cho ảnh rồi thì merge vào, nếu chưa thì tạo mới
        if (!dbUpdateOperation.$push) dbUpdateOperation.$push = {};
        dbUpdateOperation.$push.priceHistory = historyEntry;
      }
    }

    const updatedVariant = await MedicineVariant.findByIdAndUpdate(
      id,
      dbUpdateOperation,
      {
        new: true,
      },
    );

    if (!updatedVariant) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy biến thể thuốc" });
    }

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: updatedVariant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Thêm hàm Xóa biến thể (Tùy chọn)
exports.deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    await MedicineVariant.findByIdAndDelete(id);
    res.json({ success: true, message: "Đã xóa biến thể" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Lấy danh sách biến thể (Để hiển thị khi nhập kho)
exports.getAllVariants = async (req, res) => {
  try {
    const variants = await MedicineVariant.find().populate(
      "medicineId",
      "name manufacturer",
    );
    res.json({ success: true, data: variants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
