const Transaction = require("../models/Transaction");
const Medicine = require("../models/Medicine");
const Branch = require("../models/Branch");
const Inventory = require("../models/Inventory");
const MedicineVariant = require("../models/MedicineVariant");
const mongoose = require("mongoose");

// --- HELPER: Phân quyền xem dữ liệu ---
const getBranchFilter = (userRole, userBranchId, queryBranchId) => {
  if (userRole === "admin" || userRole === "warehouse_manager") {
    return queryBranchId ? new mongoose.Types.ObjectId(queryBranchId) : null;
  }
  if (!userBranchId) throw new Error("Tài khoản chưa phân bổ chi nhánh!");
  return new mongoose.Types.ObjectId(userBranchId);
};

// 1. API: THỐNG KÊ TỔNG QUAN CHO DASHBOARD
exports.getDashboardStats = async (req, res) => {
  try {
    const { branchId, startDate, endDate, transactionType } = req.query;
    const targetBranchId = getBranchFilter(
      req.user.role,
      req.user.branchId,
      branchId,
    );

    // --- 1. XÂY DỰNG BỘ LỌC TÌM KIẾM THEO NGÀY VÀ LOẠI ---
    const matchQuery = { status: "COMPLETED" };
    if (targetBranchId) {
      // Nếu là chi nhánh, họ có thể là người xuất (fromBranch) hoặc người nhận (toBranch)
      matchQuery.$or = [
        { fromBranch: targetBranchId },
        { toBranch: targetBranchId },
      ];
    }

    if (transactionType && transactionType !== "ALL") {
      matchQuery.type = transactionType;
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // --- 2. TÍNH DOANH THU & SỐ ĐƠN BÁN LẺ ---
    // Đảm bảo lấy đúng doanh thu bán hàng tại nhánh
    const salesFilter = targetBranchId ? { fromBranch: targetBranchId } : {};
    const salesQuery = {
      ...matchQuery,
      ...salesFilter,
      type: "SALE_AT_BRANCH",
    };
    // Xóa $or đi để tránh lỗi conflict query trong aggregation
    delete salesQuery.$or;

    const revenueAgg = await Transaction.aggregate([
      { $match: salesQuery },
      {
        $group: {
          _id: null,
          // Hỗ trợ cả 2 trường để tránh lỗi dữ liệu cũ/mới
          totalRevenue: {
            $sum: { $ifNull: ["$totalAmount", "$totalValue", 0] },
          },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
    const totalOrders = revenueAgg.length > 0 ? revenueAgg[0].totalOrders : 0;

    // --- 3. ĐẾM THUỐC SẮP HẾT HÀNG & CẬN/HẾT HẠN TRONG KHO (INVENTORY) ---
    const invQuery = targetBranchId ? { branchId: targetBranchId } : {};
    const inventories = await Inventory.find(invQuery);

    let lowStockCount = 0;
    let expiredCount = 0;

    const today = new Date();
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(today.getDate() + 90); // Mốc Cận date là 90 ngày tới

    inventories.forEach((inv) => {
      // Đếm sắp hết hàng (Lưu ý: totalQuantity tính theo Đơn vị cơ sở - ví dụ: Viên)
      if (inv.totalQuantity < 20 && inv.totalQuantity > 0) lowStockCount++;

      // Đếm cận/hết hạn
      const hasExpiredOrNear = inv.batches.some((b) => {
        if (b.quantity <= 0) return false;
        return new Date(b.expiryDate) <= nearExpiryDate; // Lô này đã hết hạn HOẶC sẽ hết hạn trong 90 ngày tới
      });
      if (hasExpiredOrNear) expiredCount++;
    });

    // --- 4. LẤY DANH SÁCH GIAO DỊCH GẦN ĐÂY ---
    const recentTransactions = await Transaction.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("fromBranch", "name")
      .populate("toBranch", "name")
      .populate("createdBy", "fullName");

    // 1. Ép kiểu và cấu hình lại giờ để bao trọn cả ngày
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Kết thúc ở 23:59:59 của ngày đó

    // 2. Chạy Query với Date object chuẩn
    const disposalAgg = await Transaction.aggregate([
      {
        $match: {
          type: "DISPOSAL",
          status: "COMPLETED",
          createdAt: { $gte: start, $lte: end }, // <- Dùng biến start và end đã xử lý
        },
      },
      { $group: { _id: null, totalLoss: { $sum: "$totalValue" } } },
    ]);

    const totalDisposalLoss =
      disposalAgg.length > 0 ? disposalAgg[0].totalLoss : 0;
    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalDisposalLoss,
        lowStockCount,
        expiredCount,
        recentTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. API: BÁO CÁO DOANH THU CHI TIẾT (Kèm dữ liệu vẽ biểu đồ)
exports.getRevenueReport = async (req, res) => {
  try {
    const { fromDate, toDate, branchId } = req.query;
    const targetBranchId = getBranchFilter(
      req.user.role,
      req.user.branchId,
      branchId,
    );

    // Thiết lập thời gian mặc định nếu không truyền (Lấy 30 ngày gần nhất)
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = fromDate ? new Date(fromDate) : new Date();
    if (!fromDate) start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    const matchQuery = {
      type: "SALE_AT_BRANCH",
      status: "COMPLETED",
      createdAt: { $gte: start, $lte: end },
    };
    if (targetBranchId) matchQuery.fromBranch = targetBranchId;

    // 1. Dữ liệu tổng quan
    const summaryAgg = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          // ĐÃ SỬA: Lấy totalAmount, nếu không có thì lấy totalValue
          totalRevenue: {
            $sum: { $ifNull: ["$totalAmount", "$totalValue", 0] },
          },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // 2. Dữ liệu gộp theo NGÀY (Dùng để vẽ biểu đồ trên Frontend)
    const chartData = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Nhóm theo YYYY-MM-DD
          // ĐÃ SỬA: Lấy totalAmount, nếu không có thì lấy totalValue
          revenue: { $sum: { $ifNull: ["$totalAmount", "$totalValue", 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sắp xếp theo ngày tăng dần
    ]);

    const summary =
      summaryAgg.length > 0
        ? summaryAgg[0]
        : { totalRevenue: 0, totalOrders: 0 };

    res.status(200).json({
      success: true,
      data: { summary, chartData },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. API: TOP THUỐC BÁN CHẠY NHẤT
exports.getTopMedicines = async (req, res) => {
  try {
    const targetBranchId = getBranchFilter(
      req.user.role,
      req.user.branchId,
      req.query.branchId,
    );

    const matchQuery = { type: "SALE_AT_BRANCH", status: "COMPLETED" };
    if (targetBranchId) matchQuery.fromBranch = targetBranchId;

    const topMedicines = await Transaction.aggregate([
      { $match: matchQuery },
      { $unwind: "$details" }, // Tách mảng hàng hóa trong hóa đơn ra
      {
        $group: {
          _id: "$details.variantId",
          totalQuantitySold: { $sum: "$details.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$details.quantity", "$details.price"] },
          },
        },
      },
      { $sort: { totalQuantitySold: -1 } }, // Xếp giảm dần theo số lượng bán
      { $limit: 10 }, // Lấy Top 10
      // Nối với bảng MedicineVariant để lấy tên
      {
        $lookup: {
          from: "medicinevariants",
          localField: "_id",
          foreignField: "_id",
          as: "variantInfo",
        },
      },
      { $unwind: "$variantInfo" },
      {
        $project: {
          _id: 0,
          variantId: "$_id",
          name: "$variantInfo.name",
          sku: "$variantInfo.sku",
          unit: "$variantInfo.unit",
          totalQuantitySold: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: topMedicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: PHÂN TÍCH HIỆU QUẢ KINH DOANH THEO TỪNG LOẠI THUỐC
exports.getProfitAnalytics = async (req, res) => {
  try {
    const { fromDate, toDate, branchId } = req.query;
    let targetBranchId = null;

    if (req.user.role === "admin" || req.user.role === "warehouse_manager") {
      targetBranchId = branchId ? new mongoose.Types.ObjectId(branchId) : null;
    } else {
      targetBranchId = new mongoose.Types.ObjectId(req.user.branchId);
    }

    // Lọc thời gian
    const matchQuery = { status: "COMPLETED" };
    if (targetBranchId) matchQuery.fromBranch = targetBranchId;
    if (fromDate || toDate) {
      matchQuery.createdAt = {};
      if (fromDate)
        matchQuery.createdAt.$gte = new Date(
          new Date(fromDate).setHours(0, 0, 0, 0),
        );
      if (toDate)
        matchQuery.createdAt.$lte = new Date(
          new Date(toDate).setHours(23, 59, 59, 999),
        );
    }

    // 1. TÍNH DOANH THU & GIÁ VỐN (TỪ HÓA ĐƠN BÁN LẺ)
    const salesData = await Transaction.aggregate([
      { $match: { ...matchQuery, type: "SALE_AT_BRANCH" } },
      { $unwind: "$details" },
      {
        $group: {
          _id: "$details.variantId",
          totalQuantitySold: { $sum: "$details.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$details.quantity", "$details.price"] },
          },
          totalCost: {
            $sum: {
              $multiply: [
                "$details.quantity",
                { $ifNull: ["$details.costPrice", 0] },
              ],
            },
          },
        },
      },
    ]);

    // 2. TÍNH CHI PHÍ HAO HỤT (TỪ PHIẾU HỦY HÀNG)
    const disposalData = await Transaction.aggregate([
      { $match: { ...matchQuery, type: "DISPOSAL" } },
      { $unwind: "$details" },
      {
        $group: {
          _id: "$details.variantId",
          totalDisposalQty: { $sum: "$details.quantity" },
          totalDisposalLoss: {
            $sum: { $multiply: ["$details.quantity", "$details.price"] },
          }, // price trong phiếu hủy chính là importPrice * conversionRate
        },
      },
    ]);

    // 3. MAP VỚI THÔNG TIN THUỐC & TỔNG HỢP (KẾT HỢP CÁCH 2 & 3)
    const allVariantIds = [
      ...new Set([...salesData, ...disposalData].map((d) => d._id.toString())),
    ];
    const variantsInfo = await MedicineVariant.find({
      _id: { $in: allVariantIds },
    })
      .populate("medicineId", "name code categoryId")
      .lean();

    let totalSystemRevenue = 0;
    let totalSystemCost = 0;
    let totalSystemDisposalLoss = 0;

    const reportDetails = variantsInfo.map((variant) => {
      const sale = salesData.find(
        (s) => s._id.toString() === variant._id.toString(),
      ) || { totalQuantitySold: 0, totalRevenue: 0, totalCost: 0 };
      const disposal = disposalData.find(
        (d) => d._id.toString() === variant._id.toString(),
      ) || { totalDisposalQty: 0, totalDisposalLoss: 0 };

      const grossProfit = sale.totalRevenue - sale.totalCost; // CÁCH 2
      const netProfit = grossProfit - disposal.totalDisposalLoss; // CÁCH 3

      // Cộng dồn cho toàn hệ thống
      totalSystemRevenue += sale.totalRevenue;
      totalSystemCost += sale.totalCost;
      totalSystemDisposalLoss += disposal.totalDisposalLoss;

      return {
        variantId: variant._id,
        sku: variant.sku,
        medicineName: variant.medicineId?.name || "Không rõ",
        categoryId: variant.medicineId?.categoryId,
        unit: variant.unit,
        soldQty: sale.totalQuantitySold,
        disposalQty: disposal.totalDisposalQty,
        revenue: sale.totalRevenue,
        cogs: sale.totalCost, // Cost of Goods Sold
        grossProfit: grossProfit,
        disposalLoss: disposal.totalDisposalLoss,
        netProfit: netProfit,
        margin:
          sale.totalRevenue > 0 ? (grossProfit / sale.totalRevenue) * 100 : 0,
      };
    });

    // Sắp xếp Lợi nhuận thuần giảm dần
    reportDetails.sort((a, b) => b.netProfit - a.netProfit);

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue: totalSystemRevenue,
        totalCost: totalSystemCost,
        grossProfit: totalSystemRevenue - totalSystemCost,
        totalDisposalLoss: totalSystemDisposalLoss,
        netProfit:
          totalSystemRevenue - totalSystemCost - totalSystemDisposalLoss,
      },
      details: reportDetails,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
