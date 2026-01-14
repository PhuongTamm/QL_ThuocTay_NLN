const Medicine = require("../models/Medicine");

// Lấy danh sách thuốc
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.json({ success: true, data: medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo thuốc mới
exports.createMedicine = async (req, res) => {
  try {
    const { code, name, unit, price, ingredients } = req.body;

    const exists = await Medicine.findOne({ code });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Mã thuốc đã tồn tại" });

    const newMed = await Medicine.create({
      code,
      name,
      unit,
      price,
      ingredients,
    });
    res
      .status(201)
      .json({ success: true, message: "Thêm thuốc thành công", data: newMed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
