const Inventory = require("../models/Inventory");

// GET /api/inventory?branchId=...
exports.getInventoryByBranch = async (req, res) => {
  try {
    let { branchId } = req.query;

    // Nếu user là Branch Manager, ép buộc chỉ xem branch của họ (Bảo mật)
    if (req.user.role === "branch_manager" || req.user.role === "pharmacist") {
      branchId = req.user.branchId;
    }

    if (!branchId) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu branchId" });
    }

    const inventory = await Inventory.find({ branchId })
      .populate("medicineId", "code name unit price manufacturer") // Lấy thông tin thuốc
      .lean(); // Convert sang JSON object thuần để xử lý nhanh hơn

    // Lọc bỏ các thuốc có totalQuantity = 0 nếu muốn gọn (tùy chọn)
    // const activeInventory = inventory.filter(item => item.totalQuantity > 0);

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
