const Branch = require("../models/Branch");

// GET /api/branches
exports.getAllBranches = async (req, res) => {
  try {
    // Lấy tất cả, trừ kho tổng (nếu muốn) hoặc lấy hết tùy logic
    // Ở đây ta lấy hết để hiển thị tên
    const branches = await Branch.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Thêm chi nhánh mới
exports.createBranch = async (req, res) => {
  try {
    const { name, address, phone, type } = req.body;

    // 1. Validate cơ bản
    if (!name || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Tên và địa chỉ là bắt buộc" });
    }

    // 2. Tạo chi nhánh mới
    const newBranch = await Branch.create({
      name,
      address,
      phone,
      type: type || "store", // Mặc định là 'store' nếu không gửi type
    });

    res.status(201).json({
      success: true,
      message: "Tạo chi nhánh thành công",
      data: newBranch,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};