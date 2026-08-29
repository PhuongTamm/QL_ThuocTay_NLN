const Medicine = require("../models/Medicine");
const MedicineVariant = require("../models/MedicineVariant");
const Category = require("../models/Category");
const Inventory = require("../models/Inventory");
const fs = require("fs");
const path = require("path");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.checkDrugInteractions = async (req, res) => {
  try {
    const { items } = req.body; // Mảng chứa tên thuốc và hoạt chất
    if (!items || items.length < 2) {
      return res.json({ success: true, warning: null }); // Dưới 2 thuốc thì không cần check
    }

    const prompt = `
      Bạn là một Dược sĩ lâm sàng. Tôi có danh sách các thuốc và hoạt chất sau trong đơn thuốc:
      ${items.map((i) => `- ${i.name} (Hoạt chất: ${i.ingredients || "Không rõ"})`).join("\n")}
      
      Hãy kiểm tra xem có bất kỳ CẶP HOẠT CHẤT nào tương tác xấu, chống chỉ định, hoặc làm giảm tác dụng của nhau không.
      Nếu KHÔNG CÓ tương tác đáng lo ngại, hãy trả về chữ "SAFE".
      Nếu CÓ tương tác, hãy trả về một đoạn cảnh báo ngắn gọn (dưới 50 từ) giải thích lý do để dược sĩ lưu ý. KHÔNG dùng định dạng markdown.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    if (responseText === "SAFE" || responseText.includes("SAFE")) {
      return res.json({ success: true, warning: null });
    } else {
      return res.json({ success: true, warning: responseText });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateNamePrefix = (str) => {
  if (!str) return "MED";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Xóa khoảng trắng và ký tự đặc biệt
    .substring(0, 8); // Lấy 8 ký tự (VD: VITAMINA, VITAMINE)
};

// Tạo mã thuốc gốc (VD: Paracetamol -> P0001)
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

// Tạo tiền tố Đơn vị cho SKU (Lấy 4 ký tự)
const generateUnitPrefix = (str) => {
  if (!str) return "UN";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4); // VD: VIEN, HOP, CHAI
};

// Lấy danh sách thuốc (Kèm các biến thể và danh mục)
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find()
      .populate("categoryId", "name markupPercentage") // Lấy tên danh mục để hiển thị và lọc
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
// Tạo thuốc gốc (Chưa có giá, chưa có quy cách)
exports.createMedicine = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      isPrescription,
      manufacturer,
      ingredients,
      description,
      baseUnit,
    } = req.body;
    if (!name || name.trim() === "")
      return res
        .status(400)
        .json({ success: false, message: "Tên thuốc không được để trống!" });
    if (!categoryId)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn danh mục!" });

    // Chống trùng tên thuốc gốc (Không phân biệt hoa thường)
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

    // KIỂM TRA Có biến thể nào đang dùng thuốc này không?
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

    //Không được trùng Đơn vị tính (VD: 2 quy cách Hộp)
    const existingUnit = await MedicineVariant.findOne({ medicineId, unit });
    if (existingUnit)
      return res.status(400).json({
        success: false,
        message: `Quy cách '${unit}' đã tồn tại cho thuốc này!`,
      });

    if (!sku || sku.trim() === "")
      sku = `${medicine.code}-${generateUnitPrefix(unit)}`;

    // Không được trùng mã SKU
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

exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

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

//  Xóa biến thể 
exports.deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await MedicineVariant.findById(id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Không tìm thấy quy cách này." });
    }

    //KIỂM TRA Có lô thuốc nào đang tồn tại không?
    // Nếu totalQuantity > 0 nghĩa là thuốc này đang có ít nhất 1 lô còn hàng trong kho
    const activeInventory = await Inventory.findOne({
      medicineId: variant.medicineId,
      totalQuantity: { $gt: 0 } 
    });

    if (activeInventory) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa! Thuốc này đang có lô hàng tồn trong kho. Vui lòng xuất hết hoặc xuất hủy lô trước khi xóa quy cách."
      });
    }

    //Nếu an toàn (kho đã xuất sạch), tiến hành xóa
    await MedicineVariant.findByIdAndDelete(id);
    res.json({ success: true, message: "Đã xóa quy cách thành công." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    // Đọc file JSON
    const filePath = path.join(__dirname, "../data/medicines_ak.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const seedData = JSON.parse(rawData);

    // Lấy tất cả danh mục hiện có trên Database
    const categories = await Category.find();

    let successCount = 0;
    let skipCount = 0;

    // Vòng lặp Insert
    for (const item of seedData) {
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

        images: item.images || [],
      });

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

// API CẬP NHẬT ĐỒNG LOẠT GIÁ BÁN CHO TOÀN BỘ THUỐC TRONG DANH MỤC
exports.bulkUpdatePriceByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user.id;

    // Lấy thông tin Danh mục để lấy markupPercentage
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Không tìm thấy danh mục!" });
    }

    // Tìm tất cả các loại thuốc gốc thuộc danh mục 
    const medicines = await Medicine.find({ categoryId: category._id });
    if (medicines.length === 0) {
      return res.status(400).json({ success: false, message: "Danh mục này chưa có thuốc nào!" });
    }

    let updatedVariantCount = 0;

    // Vòng lặp quét qua từng loại thuốc
    for (const med of medicines) {
      // Bỏ qua các thuốc chưa có giá vốn bình quân (MAC = 0)
      if (!med.mac || med.mac <= 0) continue; 

      // Tìm tất cả các biến thể (Hộp, Vỉ, Viên...) của thuốc 
      const variants = await MedicineVariant.find({ medicineId: med._id });
      
      for (const variant of variants) {
        // TÍNH TOÁN GIÁ GỢI Ý MỚI NHẤT
        const newSuggestedPrice = Math.round(
          (med.mac * variant.conversionRate) * (1 + category.markupPercentage)
        );

        // NẾU GIÁ CÓ THAY ĐỔI -> TIẾN HÀNH CẬP NHẬT VÀ LƯU LỊCH SỬ
        if (newSuggestedPrice !== variant.currentPrice) {
          variant.currentPrice = newSuggestedPrice;
          
          // Đẩy bản ghi mới vào mảng priceHistory
          variant.priceHistory.push({
            price: newSuggestedPrice,
            updatedBy: userId,
            effectiveDate: new Date()
          });

          await variant.save();
          updatedVariantCount++;
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Cập nhật thành công! Đã áp dụng giá mới cho ${updatedVariantCount} quy cách đóng gói thuộc danh mục ${category.name}.` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API XEM LỊCH SỬ CẬP NHẬT GIÁ CỦA 1 QUY CÁCH CỤ THỂ
exports.getVariantPriceHistory = async (req, res) => {
  try {
    const { variantId } = req.params;

    // Lấy thông tin biến thể và populate tên người cập nhật từ bảng User
    const variant = await MedicineVariant.findById(variantId)
      .populate("priceHistory.updatedBy", "fullName")
      .select("name sku currentPrice unit priceHistory");

    if (!variant) {
      return res.status(404).json({ success: false, message: "Không tìm thấy quy cách này!" });
    }

    // Sắp xếp lịch sử từ mới nhất đến cũ nhất
    const historySorted = variant.priceHistory.sort(
      (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
    );

    res.status(200).json({ 
      success: true, 
      data: {
        sku: variant.sku,
        name: variant.name,
        unit: variant.unit,
        currentPrice: variant.currentPrice,
        history: historySorted
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
