const Inventory = require("../models/Inventory");
const MonthlyInventory = require("../models/MonthlyInventory");
const MedicineVariant = require("../models/MedicineVariant");

// 1. Xem tồn kho hiện tại (Realtime)
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

// 2. Xem báo cáo xuất nhập tồn tháng (Monthly Report)
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, warehouseId } = req.query;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn tháng và năm." });
    }

    // Xử lý Phân quyền
    let targetBranchId = warehouseId;
    if (req.user.role === "branch_manager" || req.user.role === "pharmacist") {
      targetBranchId = req.user.branchId;
    } else if (
      !warehouseId &&
      (req.user.role === "admin" || req.user.role === "warehouse_manager")
    ) {
      targetBranchId = req.user.branchId;
    }

    if (!targetBranchId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Không xác định được Kho cần xem báo cáo.",
        });
    }

    // 1. Lấy dữ liệu Xuất Nhập Tồn tháng
    const report = await MonthlyInventory.find({
      month: Number(month),
      year: Number(year),
      warehouseId: targetBranchId,
    })
      .populate("medicineId", "code name baseUnit")
      .lean();

    // 2. Lấy Tồn kho hiện tại (để móc ra chi tiết các Lô)
    const inventories = await Inventory.find({
      branchId: targetBranchId,
    }).lean();

    // 3. Ghép mảng lô (batches) vào báo cáo tháng
    const enrichedReport = report.map((r) => {
      const inv = inventories.find(
        (i) =>
          i.medicineId &&
          r.medicineId &&
          i.medicineId.toString() === r.medicineId._id.toString(),
      );
      return {
        ...r,
        batches: inv ? inv.batches : [], // Gắn mảng batches vào đây
      };
    });

    // 4. Sắp xếp theo tên thuốc A-Z
    enrichedReport.sort((a, b) => {
      const nameA = a.medicineId?.name || "";
      const nameB = b.medicineId?.name || "";
      return nameA.localeCompare(nameB);
    });

    res.status(200).json({ success: true, data: enrichedReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
