const Medicine = require("../models/Medicine");
const MedicineVariant = require("../models/MedicineVariant");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");
const Branch = require("../models/Branch");
const Category = require("../models/Category");
const Customer = require("../models/Customer");

const resolveTargetBranch = async (user, requestedBranchName) => {
  // 1. Dược sĩ / QL Chi nhánh -> Ép cứng trả về đúng nhánh của họ, KHÔNG cho phép xem nhánh khác
  if (user.role === "pharmacist" || user.role === "branch_manager") {
    return user.branchId;
  }

  // 2. Admin / QL Kho tổng -> Nếu có hỏi đích danh tên 1 chi nhánh nào đó
  if (
    requestedBranchName &&
    (user.role === "admin" || user.role === "warehouse_manager")
  ) {
    const branch = await Branch.findOne({
      name: { $regex: new RegExp(requestedBranchName, "i") },
    });
    if (branch) return branch._id;
    return "NOT_FOUND"; // Cờ báo lỗi không tìm thấy nhánh
  }

  if (user.role === "pharmacist" || user.role === "branch_manager") {
    return user.branchId;
  }
  if (
    requestedBranchName &&
    (user.role === "admin" || user.role === "warehouse_manager")
  ) {
    const branch = await Branch.findOne({
      name: { $regex: new RegExp(requestedBranchName, "i") },
    });
    if (branch) return branch._id;
    return "NOT_FOUND";
  }

  // 3. Admin không chỉ định nhánh -> null (sẽ truy xuất toàn hệ thống hoặc Kho tổng)
  return null;
};

const chatbotService = {
  // 1. Tra cứu giá thuốc
  getMedicinePrice: async ({ medicineName }) => {
    try {
      // Tìm thuốc gốc (Không phân biệt hoa thường)
      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(medicineName, "i") },
      });
      if (!medicine)
        return {
          message: `Không tìm thấy thuốc nào tên là ${medicineName} trong hệ thống.`,
        };

      // Tìm các quy cách đóng gói và giá
      const variants = await MedicineVariant.find({
        medicineId: medicine._id,
      }).select("name unit currentPrice packagingSpecification");
      if (variants.length === 0)
        return {
          message: `Thuốc ${medicine.name} chưa được cấu hình giá bán.`,
        };

      return {
        medicineName: medicine.name,
        variants: variants.map((v) => ({
          name: v.name,
          unit: v.unit,
          price: v.currentPrice,
          specification: v.packagingSpecification,
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 2. Tra cứu tồn kho (Tự động lọc theo Chi nhánh của người đang chat)
  getInventoryStatus: async ({ medicineName, branchName }, user) => {
    try {
      const targetBranchId = await resolveTargetBranch(user, branchName);
      if (targetBranchId === "NOT_FOUND")
        return {
          message: `Không tìm thấy chi nhánh nào tên là ${branchName}.`,
        };

      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(medicineName, "i") },
      });
      if (!medicine)
        return { message: `Không tìm thấy thuốc ${medicineName}.` };

      // Nếu targetBranchId là null (Admin tra cứu) -> Tìm kho tổng (nơi branchId = null)
      const inventory = await Inventory.findOne({
        branchId: targetBranchId,
        medicineId: medicine._id,
      });

      const locationName = targetBranchId
        ? branchName || "chi nhánh của bạn"
        : "Kho tổng";
      if (!inventory)
        return {
          message: `Thuốc ${medicine.name} hiện không có trong ${locationName}.`,
        };

      return {
        location: locationName,
        medicineName: medicine.name,
        totalBaseQuantity: inventory.totalQuantity,
        batches: inventory.batches.map((b) => ({
          batchCode: b.batchCode,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  // 3. Kiểm tra thuốc sắp hết hạn
  getExpiringMedicines: async ({ days = 90 }, user) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      // Phân quyền: Lấy đúng ID chi nhánh của user đang chat
      const targetBranchId = await resolveTargetBranch(user, null);

      const query = {};
      if (targetBranchId && targetBranchId !== "NOT_FOUND") {
        query.branchId = targetBranchId;
      }

      // Populate thêm branchId để lỡ Admin có hỏi thì biết nó nằm ở kho nào
      const inventories = await Inventory.find(query)
        .populate("medicineId", "name")
        .populate("branchId", "name");

      let expiringItems = [];

      inventories.forEach((inv) => {
        inv.batches.forEach((batch) => {
          if (batch.quantity > 0 && new Date(batch.expiryDate) <= targetDate) {
            expiringItems.push({
              location: inv.branchId ? inv.branchId.name : "Kho tổng",
              medicine: inv.medicineId
                ? inv.medicineId.name
                : "Thuốc không xác định",
              batchCode: batch.batchCode,
              quantity: batch.quantity,
              expiryDate: new Date(batch.expiryDate).toLocaleDateString(
                "vi-VN",
              ),
            });
          }
        });
      });

      if (expiringItems.length === 0)
        return {
          message: `Không có lô thuốc nào sắp hết hạn trong ${days} ngày tới.`,
        };
      return { expiringItems };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 4. Lấy thông tin chi tiết của thuốc (Hoạt chất, NSX, Kê đơn...)
  getMedicineInfo: async ({ medicineName }) => {
    try {
      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(medicineName, "i") },
      }).populate("categoryId", "name");

      if (!medicine)
        return { message: `Không tìm thấy dữ liệu về thuốc ${medicineName}.` };

      return {
        name: medicine.name,
        category: medicine.categoryId
          ? medicine.categoryId.name
          : "Chưa phân loại",
        isPrescription: medicine.isPrescription
          ? "Thuốc kê đơn (Cần chỉ định của bác sĩ)"
          : "Thuốc không kê đơn",
        manufacturer: medicine.manufacturer,
        ingredients: medicine.ingredients || "Đang cập nhật",
        description: medicine.description || "Không có mô tả thêm",
        baseUnit: medicine.baseUnit,
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 5. Xem nhanh doanh thu hôm nay của Chi nhánh
  getTodayRevenue: async ({ branchName }, user) => {
    try {
      const targetBranchId = await resolveTargetBranch(user, branchName);
      if (targetBranchId === "NOT_FOUND")
        return { message: `Không tìm thấy chi nhánh ${branchName}.` };

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const query = {
        type: "SALE_AT_BRANCH",
        status: "COMPLETED",
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      };
      if (targetBranchId) query.fromBranch = targetBranchId;

      const sales = await Transaction.find(query);
      const totalRevenue = sales.reduce(
        (sum, t) => sum + (t.totalAmount || t.totalValue || 0),
        0,
      );

      return {
        location: targetBranchId
          ? branchName || "chi nhánh của bạn"
          : "Toàn bộ hệ thống",
        reportDate: startOfDay.toLocaleDateString("vi-VN"),
        totalRevenue: totalRevenue,
        totalOrders: sales.length,
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  // 6. Gợi ý Top thuốc bán chạy
  getTopSellingMedicines: async ({ limit = 10 }, user) => {
    try {
      // Phân quyền tương tự
      const targetBranchId = await resolveTargetBranch(user, null);

      const matchQuery = { type: "SALE_AT_BRANCH", status: "COMPLETED" };
      if (targetBranchId && targetBranchId !== "NOT_FOUND") {
        matchQuery.fromBranch = targetBranchId;
      }

      const topMedicines = await Transaction.aggregate([
        { $match: matchQuery },
        { $unwind: "$details" },
        // ... (Giữ nguyên toàn bộ phần code Aggregate ở dưới của bạn) ...
        {
          $group: {
            _id: "$details.variantId",
            totalQuantitySold: { $sum: "$details.quantity" },
          },
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: limit },
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
            name: "$variantInfo.name",
            totalQuantitySold: 1,
          },
        },
      ]);

      if (topMedicines.length === 0)
        return { message: "Chưa có dữ liệu bán hàng để thống kê." };
      return { topMedicines };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 7. Cảnh báo thuốc sắp hết hàng (Low Stock)
  getLowStockMedicines: async ({ threshold = 50, branchName }, user) => {
    try {
      const targetBranchId = await resolveTargetBranch(user, branchName);
      if (targetBranchId === "NOT_FOUND")
        return { message: `Không tìm thấy chi nhánh ${branchName}.` };

      // Tìm trong kho có thuốc nào số lượng > 0 nhưng nhỏ hơn threshold (tính theo đơn vị cơ sở: viên, ống...)
      const query = { totalQuantity: { $lt: threshold, $gt: 0 } };
      if (targetBranchId) query.branchId = targetBranchId;

      const lowStockItems = await Inventory.find(query)
        .populate("medicineId", "name baseUnit")
        .limit(10); // Lấy top 10 để tránh AI bị quá tải text

      if (lowStockItems.length === 0)
        return {
          message: "Hiện tại không có thuốc nào chạm ngưỡng sắp hết hàng.",
        };

      return {
        location: targetBranchId
          ? branchName || "chi nhánh của bạn"
          : "Toàn bộ hệ thống",
        lowStockMedicines: lowStockItems.map((item) => ({
          name: item.medicineId.name,
          remainingQuantity: `${item.totalQuantity} ${item.medicineId.baseUnit}`,
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 8. Tìm thuốc theo Danh mục (VD: Có thuốc kháng sinh nào không?)
  getMedicinesByCategory: async ({ categoryName }) => {
    try {
      const category = await Category.findOne({
        name: { $regex: new RegExp(categoryName, "i") },
      });
      if (!category)
        return {
          message: `Không tìm thấy danh mục thuốc nào mang tên "${categoryName}".`,
        };

      const medicines = await Medicine.find({ categoryId: category._id })
        .select("name isPrescription")
        .limit(10);

      if (medicines.length === 0)
        return {
          message: `Hiện chưa có thuốc nào thuộc danh mục ${category.name}.`,
        };

      return {
        category: category.name,
        medicines: medicines.map((m) => ({
          name: m.name,
          type: m.isPrescription ? "Kê đơn" : "Không kê đơn",
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 9. Tra cứu thông tin Khách hàng (Điểm tích lũy, Lịch sử mua)
  getCustomerInfo: async ({ phone }) => {
    try {
      // Chuẩn hóa số điện thoại (bỏ khoảng trắng)
      const cleanPhone = phone.replace(/\s+/g, "");
      const customer = await Customer.findOne({ phone: cleanPhone });

      if (!customer)
        return {
          message: `Không tìm thấy khách hàng nào với số điện thoại ${cleanPhone}.`,
        };

      return {
        name: customer.name,
        phone: customer.phone,
        points: customer.points,
        totalSpent: customer.totalSpent,
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 10. Tra cứu chi tiết một đơn hàng bằng Mã hóa đơn (VD: HD123456)
  getTransactionDetails: async ({ transactionCode }, user) => {
    try {
      const transaction = await Transaction.findOne({
        code: { $regex: new RegExp(`^${transactionCode}$`, "i") },
      })
        .populate("fromBranch", "name")
        .populate("createdBy", "fullName")
        .populate("details.variantId", "name unit");

      if (!transaction)
        return {
          message: `Không tìm thấy hóa đơn mang mã ${transactionCode}.`,
        };

      // Kiểm tra quyền (Chỉ Admin hoặc nhân viên thuộc chi nhánh đó mới được xem)
      if (user.role !== "admin" && user.role !== "warehouse_manager") {
        if (
          transaction.fromBranch &&
          transaction.fromBranch._id.toString() !== user.branchId.toString() &&
          transaction.toBranch &&
          transaction.toBranch._id.toString() !== user.branchId.toString()
        ) {
          return {
            message:
              "Bạn không có quyền xem chi tiết hóa đơn của chi nhánh khác.",
          };
        }
      }

      return {
        code: transaction.code,
        type: transaction.type,
        status: transaction.status,
        date: transaction.createdAt,
        staff: transaction.createdBy
          ? transaction.createdBy.fullName
          : "Hệ thống",
        customer: transaction.customerName || "Khách lẻ",
        totalAmount: transaction.totalAmount || transaction.totalValue,
        items: transaction.details.map((d) => ({
          name: d.variantId ? d.variantId.name : "Sản phẩm không xác định",
          quantity: `${d.quantity} ${d.variantId ? d.variantId.unit : ""}`,
          price: d.price,
          // BỔ SUNG 2 DÒNG DƯỚI ĐÂY ĐỂ AI BIẾT THÔNG TIN LÔ
          batchCode: d.batchCode || "Không có",
          expiryDate: d.expiryDate
            ? new Date(d.expiryDate).toLocaleDateString("vi-VN")
            : "Không rõ",
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  // 11. Tra cứu lịch sử của một MÃ LÔ cụ thể
  getBatchHistory: async ({ medicineName, batchCode }, user) => {
    try {
      // 1. Tìm thuốc gốc
      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(medicineName, "i") },
      });
      if (!medicine)
        return { message: `Không tìm thấy thuốc ${medicineName}.` };

      // 2. Lấy danh sách ID các biến thể của thuốc này
      const variants = await MedicineVariant.find({
        medicineId: medicine._id,
      }).select("_id");
      const variantIds = variants.map((v) => v._id);

      // 3. Tìm các Transaction có chứa variantId và batchCode tương ứng
      const query = {
        "details.variantId": { $in: variantIds },
        "details.batchCode": { $regex: new RegExp(`^${batchCode}$`, "i") },
        status: "COMPLETED",
      };

      // 4. Lọc theo quyền (Chi nhánh chỉ xem được giao dịch liên quan tới nhánh mình)
      const targetBranchId = await resolveTargetBranch(user, null);
      if (targetBranchId && targetBranchId !== "NOT_FOUND") {
        query.$or = [
          { fromBranch: targetBranchId },
          { toBranch: targetBranchId },
        ];
      }

      const transactions = await Transaction.find(query)
        .populate("fromBranch", "name")
        .populate("toBranch", "name")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 });

      if (transactions.length === 0) {
        return {
          message: `Không tìm thấy lịch sử giao dịch nào cho lô '${batchCode}' của thuốc ${medicineName}.`,
        };
      }

      // 5. Bóc tách và định dạng dữ liệu trả về cho AI
      const history = transactions.map((t) => {
        // Lấy chính xác detail của lô đó trong hóa đơn
        const detail = t.details.find(
          (d) =>
            variantIds.some((vid) => vid.equals(d.variantId)) &&
            d.batchCode.toLowerCase() === batchCode.toLowerCase(),
        );

        return {
          date: t.createdAt.toLocaleDateString("vi-VN"),
          transactionCode: t.code,
          type: t.type,
          staff: t.createdBy?.fullName || "Hệ thống",
          location: t.fromBranch?.name || "Kho tổng",
          quantityEffect: d.quantity, // AI sẽ tự diễn giải là cộng hay trừ dựa vào type
          reason: detail?.reason || "Không có",
        };
      });

      return { medicineName, batchCode, history };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 12. Tra cứu lịch sử nhập/xuất/hủy chung (Giao dịch gần đây)
  getRecentTransactions: async (
    { transactionType, limit = 5, branchName },
    user,
  ) => {
    try {
      const targetBranchId = await resolveTargetBranch(user, branchName);
      if (targetBranchId === "NOT_FOUND")
        return { message: `Không tìm thấy chi nhánh ${branchName}.` };

      const query = { type: transactionType, status: "COMPLETED" };

      // Xử lý nhánh liên quan
      if (targetBranchId) {
        if (
          transactionType === "IMPORT_SUPPLIER" ||
          transactionType === "EXPORT_TO_BRANCH"
        ) {
          query.toBranch = targetBranchId; // Hàng đi vào nhánh
        } else {
          query.fromBranch = targetBranchId; // Hàng đi ra từ nhánh
        }
      }

      const transactions = await Transaction.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .limit(limit);

      if (transactions.length === 0) {
        return {
          message: `Không có giao dịch loại ${transactionType} nào gần đây.`,
        };
      }

      return {
        transactionType,
        transactions: transactions.map((t) => ({
          code: t.code,
          date: t.createdAt.toLocaleDateString("vi-VN"),
          staff: t.createdBy?.fullName || "Hệ thống",
          totalValue: t.totalAmount || t.totalValue || 0,
          itemCount: t.details.length,
        })),
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // 13. Tra cứu danh sách các lô của 1 loại thuốc
  getBatchesByMedicine: async ({ medicineName, branchName }, user) => {
    try {
      // 1. Phân quyền và tìm chi nhánh
      const targetBranchId = await resolveTargetBranch(user, branchName);
      if (targetBranchId === "NOT_FOUND") {
        return { message: `Không tìm thấy chi nhánh ${branchName}.` };
      }

      // 2. Tìm thuốc gốc
      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(medicineName, "i") },
      });
      if (!medicine) {
        return {
          message: `Không tìm thấy thuốc ${medicineName} trong hệ thống.`,
        };
      }

      // 3. Xây dựng Query tìm tồn kho
      const query = { medicineId: medicine._id };
      // Nếu có targetBranchId thì lọc theo nhánh đó. Nếu null (Admin) thì tìm trên TOÀN HỆ THỐNG
      if (targetBranchId && targetBranchId !== "NOT_FOUND") {
        query.branchId = targetBranchId;
      }

      // Dùng find() thay vì findOne() để lấy tồn kho ở nhiều chi nhánh
      const inventories = await Inventory.find(query).populate(
        "branchId",
        "name",
      );

      if (!inventories || inventories.length === 0) {
        const locationName = targetBranchId
          ? branchName || "chi nhánh của bạn"
          : "toàn hệ thống";
        return {
          message: `Thuốc ${medicine.name} hiện không có lô hàng nào tồn trong ${locationName}.`,
        };
      }

      // 4. Gom tất cả các lô từ các chi nhánh lại
      let allActiveBatches = [];

      inventories.forEach((inv) => {
        // Nếu branchId null thì là Kho tổng, ngược lại lấy tên chi nhánh
        const branchNameStr = inv.branchId ? inv.branchId.name : "Kho tổng";

        const activeBatchesInThisBranch = inv.batches
          .filter((b) => b.quantity > 0)
          .map((b) => ({
            location: branchNameStr, // Bổ sung thông tin lô này đang nằm ở đâu
            batchCode: b.batchCode,
            quantity: b.quantity,
            manufacturingDate: b.manufacturingDate
              ? new Date(b.manufacturingDate).toLocaleDateString("vi-VN")
              : "Không rõ",
            expiryDate: new Date(b.expiryDate).toLocaleDateString("vi-VN"),
            quality: b.quality,
          }));

        allActiveBatches = [...allActiveBatches, ...activeBatchesInThisBranch];
      });

      if (allActiveBatches.length === 0) {
        return {
          message: `Tất cả các lô của ${medicine.name} trên toàn hệ thống đều đã hết số lượng.`,
        };
      }

      // 5. Trả dữ liệu về cho AI
      return {
        medicineName: medicine.name,
        baseUnit: medicine.baseUnit,
        batches: allActiveBatches,
      };
    } catch (error) {
      return { error: error.message };
    }
  },
};

module.exports = chatbotService;
