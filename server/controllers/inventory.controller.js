const Inventory = require("../models/Inventory");
const MonthlyInventory = require("../models/MonthlyInventory");

// 1. Xem tồn kho hiện tại (Realtime)
exports.getInventoryByBranch = async (req, res) => {
  try {
    let { branchId } = req.query;
    if (req.user.role === "branch_manager" || req.user.role === "pharmacist") {
      branchId = req.user.branchId;
    }

    // Populate sâu: Inventory -> Variant -> Medicine
    const inventory = await Inventory.find({ branchId })
      .populate({
        path: "variantId",
        populate: { path: "medicineId", select: "name manufacturer" }, // Lấy tên thuốc gốc
      })
      .lean();

    res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Xem báo cáo xuất nhập tồn tháng (Yêu cầu của thầy)
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, warehouseId } = req.query;

    if (!month || !year || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin lọc (tháng, năm, kho)",
      });
    }

    const report = await MonthlyInventory.find({
      month,
      year,
      warehouseId,
    }).populate({
      path: "variantId",
      select: "sku name unit", // Lấy tên biến thể và đơn vị tính
      populate: { path: "medicineId", select: "name" },
    });

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
