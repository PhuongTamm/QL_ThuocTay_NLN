const Medicine = require("../models/Medicine");
const MedicineVariant = require("../models/MedicineVariant");
const Category = require("../models/Category");
const fs = require("fs");
const path = require("path");

const generateNamePrefix = (str) => {
  if (!str) return "MED";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Xóa khoảng trắng và ký tự đặc biệt
    .substring(0, 8); // Lấy 8 ký tự (VD: VITAMINA, VITAMINE)
};

// 1. Hàm Helper: Tạo mã thuốc gốc (VD: Paracetamol -> P0001)
const generateMedicineCode = async (name) => {
  // Lấy chữ cái đầu tiên (xóa dấu, in hoa)
  let firstLetter = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .charAt(0)
    .toUpperCase()
    .replace(/[^A-Z]/g, "M"); // Nếu không phải chữ cái thì mặc định là 'M'

  if (!firstLetter) firstLetter = "M";

  // Tìm mã lớn nhất trong DB có chữ cái bắt đầu bằng firstLetter (VD: Pxxxx)
  const regex = new RegExp(`^${firstLetter}(\\d{4})$`);
  const lastMedicine = await Medicine.findOne({ code: regex }).sort({
    code: -1,
  });

  let nextNumber = 1;
  if (lastMedicine && lastMedicine.code) {
    const match = lastMedicine.code.match(regex);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  let code = `${firstLetter}${String(nextNumber).padStart(4, "0")}`;

  // Đề phòng trùng lặp (nếu bị xóa/sửa)
  while (await Medicine.exists({ code })) {
    nextNumber++;
    code = `${firstLetter}${String(nextNumber).padStart(4, "0")}`;
  }

  return code;
};

// 2. Hàm Helper: Tạo tiền tố Đơn vị cho SKU (Lấy 4 ký tự)
const generateUnitPrefix = (str) => {
  if (!str) return "UN";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4); // VD: VIEN, HOP, CHAI
};

// 1. Lấy danh sách thuốc (Kèm các biến thể và danh mục)
exports.getAllMedicines = async (req, res) => {
  try {
    // SỬA TẠI ĐÂY: Thêm .populate("categoryId") và .sort({ createdAt: -1 })
    const medicines = await Medicine.find()
      .populate("categoryId", "name") // Lấy thêm tên danh mục để hiển thị và lọc
      .sort({ createdAt: -1 }) // Mặc định sắp xếp thuốc mới nhất lên đầu
      .lean();

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
    // const {
    //   name,
    //   categoryId,
    //   isPrescription,
    //   manufacturer,
    //   ingredients,
    //   description,
    // } = req.body;
    const {
      name,
      categoryId,
      isPrescription,
      manufacturer,
      ingredients,
      description,
      baseUnit,
    } = req.body;
    // [RÀNG BUỘC] 1. Thiếu thông tin
    if (!name || name.trim() === "")
      return res
        .status(400)
        .json({ success: false, message: "Tên thuốc không được để trống!" });
    if (!categoryId)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn danh mục!" });

    // [RÀNG BUỘC] 2. Chống trùng tên thuốc gốc (Không phân biệt hoa thường)
    const existMed = await Medicine.findOne({
      name: { $regex: new RegExp("^" + name.trim() + "$", "i") },
    });
    if (existMed) {
      return res.status(400).json({
        success: false,
        message: `Thuốc gốc mang tên "${name.trim()}" đã tồn tại trong hệ thống!`,
      });
    }

    let imageLinks = [];
    if (req.files && req.files.length > 0) {
      imageLinks = req.files.map((file) => file.path);
    }

    const code = await generateMedicineCode(name);
    const newMed = await Medicine.create({
      code,
      name: name.trim(),
      categoryId,
      isPrescription,
      manufacturer,
      ingredients,
      description,
      baseUnit,
      images: imageLinks,
    });

    res.status(201).json({ success: true, data: newMed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật thuốc gốc
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Xóa field images khỏi updateData thuần để tránh lỗi đè chuỗi
    if (updateData.images) delete updateData.images;

    // Nếu có up ảnh mới thì dùng $push để nối thêm vào mảng cũ
    if (req.files && req.files.length > 0) {
      const newLinks = req.files.map((file) => file.path);
      updateData.$push = { images: { $each: newLinks } };
    }

    const updatedMed = await Medicine.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedMed)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thuốc" });

    res.json({ success: true, data: updatedMed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa thuốc gốc
exports.deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    // KIỂM TRA RÀNG BUỘC: Có biến thể nào đang dùng thuốc này không?
    const existingVariants = await MedicineVariant.findOne({ medicineId: id });
    if (existingVariants) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa! Thuốc này đang có các quy cách/biến thể. Vui lòng xóa các biến thể trước.",
      });
    }

    const deletedMed = await Medicine.findByIdAndDelete(id);
    if (!deletedMed) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thuốc" });
    }

    res.json({ success: true, message: "Xóa thuốc gốc thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createVariant = async (req, res) => {
  try {
    let {
      medicineId,
      sku,
      name,
      unit,
      packagingSpecification,
      currentPrice,
      conversionRate,
    } = req.body;

    // [RÀNG BUỘC] 1. Kiểm tra dữ liệu đầu vào
    if (!name || name.trim() === "")
      return res.status(400).json({
        success: false,
        message: "Tên hiển thị quy cách không được để trống!",
      });
    if (
      currentPrice === undefined ||
      currentPrice === null ||
      Number(currentPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Giá bán lẻ phải là số và lớn hơn hoặc bằng 0đ!",
      });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Thuốc gốc không tồn tại" });

    // [RÀNG BUỘC] 2. Không được trùng Đơn vị tính (VD: 2 quy cách Hộp)
    const existingUnit = await MedicineVariant.findOne({ medicineId, unit });
    if (existingUnit)
      return res.status(400).json({
        success: false,
        message: `Quy cách '${unit}' đã tồn tại cho thuốc này!`,
      });

    if (!sku || sku.trim() === "")
      sku = `${medicine.code}-${generateUnitPrefix(unit)}`;

    // [RÀNG BUỘC] 3. Không được trùng mã SKU
    const existSku = await MedicineVariant.findOne({ sku });
    if (existSku)
      return res.status(400).json({
        success: false,
        message: `Mã vạch (SKU) ${sku} đã tồn tại trong hệ thống!`,
      });

    const newVariant = await MedicineVariant.create({
      medicineId,
      sku,
      name: name.trim(),
      unit,
      packagingSpecification,
      currentPrice: Number(currentPrice),
      conversionRate: Number(conversionRate),
      priceHistory: [{ price: Number(currentPrice), updatedBy: req.user.id }],
    });

    res.status(201).json({ success: true, data: newVariant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Cập nhật hàm updateVariant (Logic: Cộng thêm ảnh mới vào ảnh cũ)
exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // [RÀNG BUỘC] Tên và Giá khi cập nhật
    if (updateData.name && updateData.name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Tên hiển thị không được để trống!" });
    }
    if (
      updateData.currentPrice !== undefined &&
      Number(updateData.currentPrice) < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Giá bán lẻ không được là số âm!" });
    }

    if (updateData.currentPrice) {
      const oldVariant = await MedicineVariant.findById(id);
      if (
        oldVariant &&
        Number(oldVariant.currentPrice) !== Number(updateData.currentPrice)
      ) {
        updateData.$push = {
          priceHistory: {
            price: Number(updateData.currentPrice),
            updatedBy: req.user.id,
            effectiveDate: new Date(),
          },
        };
      }
    }

    const updatedVariant = await MedicineVariant.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
    if (!updatedVariant)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy biến thể" });

    res.json({ success: true, data: updatedVariant });
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

exports.seedMedicines = async (req, res) => {
  try {
    // 1. Đọc file JSON
    const filePath = path.join(__dirname, "../data/medicines_ak.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const seedData = JSON.parse(rawData);

    // 2. Lấy tất cả danh mục hiện có trên Database
    const categories = await Category.find();

    let successCount = 0;
    let skipCount = 0;

    // 3. Vòng lặp Insert
    for (const item of seedData) {
      // BƯỚC A: TÌM DANH MỤC PHÙ HỢP (Giải thuật Smart Matching bằng Regex)
      // Chuyển keyword thành Regex không phân biệt hoa thường
      const keywordRegex = new RegExp(item.categoryKeyword, "i");
      const matchedCategory = categories.find((cat) =>
        keywordRegex.test(cat.name),
      );

      if (!matchedCategory) {
        console.log(
          `Bỏ qua [${item.name}]: Không tìm thấy danh mục chứa từ khóa "${item.categoryKeyword}"`,
        );
        skipCount++;
        continue;
      }

      // Kiểm tra trùng tên thuốc
      const existMed = await Medicine.findOne({
        name: { $regex: new RegExp("^" + item.name.trim() + "$", "i") },
      });

      if (existMed) {
        console.log(`Bỏ qua [${item.name}]: Thuốc đã tồn tại.`);
        skipCount++;
        continue;
      }

      // BƯỚC B: TẠO THUỐC GỐC
      const code = await generateMedicineCode(item.name);
      const newMed = await Medicine.create({
        code: code,
        name: item.name,
        categoryId: matchedCategory._id,
        isPrescription: item.isPrescription,
        manufacturer: item.manufacturer,
        ingredients: item.ingredients,
        description: item.description,
        baseUnit: item.baseUnit,

        // SỬA Ở DÒNG NÀY: Lấy mảng images từ JSON, nếu JSON không có thì gán mảng rỗng
        images: item.images || [],
      });

      // BƯỚC C: TẠO CÁC BIẾN THỂ (QUY CÁCH)
      if (item.variants && item.variants.length > 0) {
        for (const variant of item.variants) {
          const sku = `${newMed.code}-${generateUnitPrefix(variant.unit)}`;

          await MedicineVariant.create({
            medicineId: newMed._id,
            sku: sku,
            name: variant.name,
            unit: variant.unit,
            packagingSpecification: variant.packagingSpecification,
            currentPrice: variant.currentPrice,
            conversionRate: variant.conversionRate,
            priceHistory: [
              {
                price: variant.currentPrice,
                // Trong seeder không có req.user.id nên ta để null hoặc bỏ trống
              },
            ],
          });
        }
      }
      successCount++;
    }

    res.status(200).json({
      success: true,
      message: "Seed dữ liệu hoàn tất!",
      result: `Thành công: ${successCount} thuốc. Bỏ qua: ${skipCount} thuốc.`,
    });
  } catch (error) {
    console.error("Lỗi Seed data:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
