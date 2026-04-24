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
    const { name, address, phone } = req.body; // Không lấy biến type từ Client nữa

    if (!name || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Tên và địa chỉ là bắt buộc" });
    }

    const newBranch = await Branch.create({
      name,
      address,
      phone,
      type: "store", // Ép cứng mọi chi nhánh tạo mới đều là 'store'
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

// Cập nhật chi nhánh
exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    // Tìm xem chi nhánh này có phải kho tổng không (Không cho đổi type của kho tổng)
    const existingBranch = await Branch.findById(id);
    if (!existingBranch)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy chi nhánh" });

    const updatedBranch = await Branch.findByIdAndUpdate(
      id,
      { name, address, phone },
      { new: true },
    );
    res.status(200).json({ success: true, data: updatedBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa chi nhánh
exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    await Branch.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Đã xóa chi nhánh" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chi nhánh" });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

