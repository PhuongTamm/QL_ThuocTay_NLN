const Inventory = require("../models/Inventory");
const MonthlyInventory = require("../models/MonthlyInventory");
const MedicineVariant = require("../models/MedicineVariant");

// 1. Xem tồn kho hiện tại (Realtime)
// exports.getInventoryByBranch = async (req, res) => {
//   try {
//     let { branchId } = req.query;
//     if (req.user.role === "branch_manager" || req.user.role === "pharmacist") {
//       branchId = req.user.branchId;
//     }

//     // Populate sâu: Inventory -> Variant -> Medicine
//     const inventory = await Inventory.find({ branchId })
//       .populate({
//         path: "variantId",
//         populate: { path: "medicineId", select: "name manufacturer" }, // Lấy tên thuốc gốc
//       })
//       .lean();

//     res.status(200).json({ success: true, data: inventory });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
exports.getInventoryByBranch = async (req, res) => {
  try {
    let { branchId } = req.query;

    // 1. Xử lý logic quyền hạn Chi nhánh
    if (req.user.role === "branch_manager" || req.user.role === "pharmacist") {
      // Ép cứng xem kho của mình
      branchId = req.user.branchId;
    } else if (
      (req.user.role === "admin" || req.user.role === "warehouse_manager") &&
      !branchId
    ) {
      // Nếu là Admin/Kho tổng mà không truyền ?branchId=... trên URL
      // -> Lấy mặc định kho mà tài khoản này đang trực thuộc
      branchId = req.user.branchId;
    }

    // Xây dựng bộ lọc tìm kiếm
    const query = {};
    if (branchId) query.branchId = branchId;

    // 2. Tìm tồn kho theo medicineId (Thuốc gốc)
    const inventories = await Inventory.find(query)
      .populate("medicineId") // Nối với bảng Medicine
      .lean();

    // 3. Gắn mảng biến thể (Quy cách) vào mỗi thuốc để trả về cho Frontend
    for (let inv of inventories) {
      if (inv.medicineId) {
        inv.variants = await MedicineVariant.find({
          medicineId: inv.medicineId._id,
        }).lean();
      } else {
        inv.variants = [];
      }
    }

    // 4. Lọc bỏ các data rác (Trường hợp thuốc gốc đã bị xóa nhưng tồn kho vẫn kẹt lại)
    const validInventories = inventories.filter(
      (inv) => inv.medicineId !== null,
    );

    res.status(200).json({ success: true, data: validInventories });
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
