const Transaction = require("../models/Transaction");
const Inventory = require("../models/Inventory");
const MonthlyInventory = require("../models/MonthlyInventory");
const MedicineVariant = require("../models/MedicineVariant");
const mongoose = require("mongoose"); // Giữ lại để dùng Types nếu cần

// --- HELPER: Cập nhật sổ cái tồn kho tháng (Đã bỏ session) ---
const updateMonthlyReport = async (warehouseId, variantId, quantity, type) => {
  try {
    const date = new Date();
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    let report = await MonthlyInventory.findOne({
      warehouseId,
      variantId,
      month,
      year,
    });

    // Nếu chưa có báo cáo tháng này -> Tạo mới
    if (!report) {
      // Tìm tồn cuối của tháng trước
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      const prevReport = await MonthlyInventory.findOne({
        warehouseId,
        variantId,
        month: prevMonth,
        year: prevYear,
      });

      const startQty = prevReport ? prevReport.endQuantity : 0;

      report = new MonthlyInventory({
        month,
        year,
        warehouseId,
        variantId,
        startQuantity: startQty,
        importQuantity: 0,
        exportQuantity: 0,
        endQuantity: startQty,
      });
    }

    // Cập nhật số liệu
    if (type === "IMPORT") {
      report.importQuantity += quantity;
      report.endQuantity += quantity;
    } else if (type === "EXPORT") {
      report.exportQuantity += quantity;
      report.endQuantity -= quantity;
    }

    await report.save();
  } catch (err) {
    console.error("Lỗi cập nhật báo cáo tháng:", err);
    // Ở chế độ không Transaction, nếu lỗi ở đây thì số liệu báo cáo sẽ sai lệch với tồn kho thực tế
    // Cần chấp nhận rủi ro này khi test local
  }
};

// 1. NHẬP KHO TỪ NCC (Không dùng Transaction)
exports.importFromSupplier = async (req, res) => {
  try {
    const { items, supplierName } = req.body;
    const currentBranchId = req.user.branchId;

    if (!currentBranchId) {
      return res.status(400).json({
        success: false,
        message:
          "Lỗi: Tài khoản của bạn chưa được gán vào Kho/Chi nhánh nào. Vui lòng đăng nhập bằng tài khoản Thủ Kho (Warehouse Manager).",
      });
    }

    if (!items || items.length === 0) throw new Error("Danh sách hàng rỗng");

    const transactionDetails = [];
    let totalValue = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      // --- A. Cập nhật Inventory (Realtime) ---
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        variantId: item.variantId,
      });

      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          variantId: item.variantId,
          totalQuantity: 0,
          batches: [],
        });
      }

      // Logic gộp lô
      // const existingBatchIndex = inventory.batches.findIndex(
      //   (b) => b.batchCode === item.batchCode,
      // );

      // if (existingBatchIndex > -1) {
      //   inventory.batches[existingBatchIndex].quantity += quantity;
      //   inventory.batches[existingBatchIndex].importPrice = price;
      // } else {
      //   inventory.batches.push({
      //     batchCode: item.batchCode,
      //     expiryDate: new Date(item.expiryDate),
      //     manufacturingDate: new Date(item.manufacturingDate),
      //     quantity: quantity,
      //     importPrice: price,
      //     quality: "Good",
      //   });
      // }
      // --- KHÚC QUAN TRỌNG: SỬA ĐỔI TẠI ĐÂY ---

      // Tìm xem có lô nào CÙNG MÃ và CÙNG GIÁ không
      const existingBatchIndex = inventory.batches.findIndex(
        (b) => b.batchCode === item.batchCode && b.importPrice === price,
      );

      if (existingBatchIndex > -1) {
        // TRƯỜNG HỢP 1: Đã có lô này với giá y hệt -> Cộng dồn số lượng
        inventory.batches[existingBatchIndex].quantity += quantity;

        if (!inventory.batches[existingBatchIndex].initialQuantity) {
          inventory.batches[existingBatchIndex].initialQuantity = 0;
        }
        inventory.batches[existingBatchIndex].initialQuantity += quantity;
      } else {
        // TRƯỜNG HỢP 2: Lô mới HOẶC Lô cũ nhưng giá mới -> Tạo dòng riêng
        // Điều này giúp giữ nguyên giá trị vốn của từng lần nhập
        inventory.batches.push({
          batchCode: item.batchCode,
          expiryDate: new Date(item.expiryDate),
          manufacturingDate: new Date(item.manufacturingDate),
          quantity: quantity,
          initialQuantity: quantity,
          importPrice: price, // Giá chính xác của lần nhập này
          quality: "Good",
        });
      }
      // ----------------------------------------

      inventory.totalQuantity += quantity;
      await inventory.save(); // Bỏ session

      // --- B. Cập nhật Báo Cáo Tháng ---
      await updateMonthlyReport(
        currentBranchId,
        item.variantId,
        quantity,
        "IMPORT",
      );

      // --- C. Chuẩn bị Transaction Detail ---
      transactionDetails.push({
        variantId: item.variantId,
        batchCode: item.batchCode,
        expiryDate: new Date(item.expiryDate),
        quantity: quantity,
        price: price,
      });
      totalValue += quantity * price;
    }

    // --- D. Tạo Transaction ---
    const newTransaction = await Transaction.create({
      code: `PN${Date.now()}`,
      type: "IMPORT_SUPPLIER",
      status: "COMPLETED",
      toBranch: currentBranchId,
      createdBy: req.user._id,
      supplierName: supplierName,
      details: transactionDetails,
      totalValue: totalValue,
    });

    return res.status(200).json({
      success: true,
      message: "Nhập kho thành công",
      transaction: newTransaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. XUẤT KHO TỔNG -> CHI NHÁNH (Logic FEFO + Giữ lại xác lô để xem hiệu suất)
exports.createDistributionRequest = async (req, res) => {
  try {
    const { toBranchId, items } = req.body;
    const fromBranchId = req.user.branchId;

    // --- DEBUG LOG (Xóa sau khi fix xong) ---
    console.log("--- DEBUG XUẤT KHO ---");
    console.log("Người thực hiện (Branch ID):", fromBranchId);

    const details = [];

    for (const item of items) {
      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        variantId: item.variantId,
      });

      // 1. Kiểm tra xem có tìm thấy kho không?
      if (!sourceInv) {
        throw new Error(
          `CRITICAL: Không tìm thấy tồn kho của thuốc ${item.variantId} tại chi nhánh ${fromBranchId}. (Trong DB, thuốc này đang nằm ở kho nào?)`,
        );
      }

      console.log(
        `Tồn hiện tại: ${sourceInv.totalQuantity}, Yêu cầu xuất: ${item.quantity}`,
      );

      // 2. Kiểm tra số lượng
      if (sourceInv.totalQuantity < item.quantity) {
        throw new Error(
          `Biến thể ${item.variantId} không đủ hàng (Tồn: ${sourceInv.totalQuantity}, Cần: ${item.quantity})`,
        );
      }
      // Kiểm tra tổng tồn kho có đủ xuất không
      // if (!sourceInv || sourceInv.totalQuantity < item.quantity) {
      //   throw new Error(`Biến thể ${item.variantId} không đủ hàng để xuất`);
      // }

      // --- 1. SẮP XẾP FEFO (Hết hạn trước -> Lên đầu) ---
      sourceInv.batches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );

      let remainQty = item.quantity;

      // --- 2. QUÉT QUA CÁC LÔ ĐỂ TRỪ ---
      for (let i = 0; i < sourceInv.batches.length; i++) {
        if (remainQty <= 0) break; // Đã lấy đủ hàng

        let batch = sourceInv.batches[i];

        // Chỉ lấy từ những lô còn hàng (quantity > 0)
        if (batch.quantity > 0) {
          let take = Math.min(batch.quantity, remainQty);

          // --- TRỪ KHO ---
          batch.quantity -= take; // Trừ số lượng thực tế
          // batch.initialQuantity GIỮ NGUYÊN (Không đụng vào)

          remainQty -= take;

          // Lưu chi tiết vào phiếu xuất (kèm giá vốn của lô đó để tính lãi lỗ)
          details.push({
            variantId: item.variantId,
            batchCode: batch.batchCode,
            expiryDate: batch.expiryDate,
            quantity: take,
            price: batch.importPrice,
          });

          // --- QUAN TRỌNG: KHÔNG XÓA LÔ KHI HẾT HÀNG ---
          // Code cũ: if (batch.quantity === 0) sourceInv.batches.splice(i, 1);
          // Code mới: Bỏ dòng splice đi.
          // Kết quả: Lô đó vẫn nằm trong mảng với quantity = 0, initialQuantity = 500 => Biết là đã bán hết 500/500.
        }
      }

      if (remainQty > 0)
        throw new Error(
          `Lỗi tính toán FEFO (Dữ liệu không đồng bộ) cho ${item.variantId}`,
        );

      // Trừ tổng tồn kho (Realtime stock)
      sourceInv.totalQuantity -= item.quantity;
      await sourceInv.save();

      // Cập nhật Báo Cáo Tháng
      // (Hàm updateMonthlyReport bạn lấy từ code tôi gửi ở các bước trước)
      await updateMonthlyReport(
        fromBranchId,
        item.variantId,
        item.quantity,
        "EXPORT",
      );
    }

    // Tạo Transaction
    const trans = await Transaction.create({
      code: `PX${Date.now()}`,
      type: "EXPORT_TO_BRANCH",
      status: "PENDING",
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      createdBy: req.user._id,
      details: details,
    });

    res.status(200).json({
      success: true,
      message: "Tạo phiếu xuất kho thành công",
      transaction: trans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Lấy danh sách chờ nhập
exports.getPendingImports = async (req, res) => {
  try {
    const currentBranchId = req.user.branchId;
    const transactions = await Transaction.find({
      toBranch: currentBranchId,
      status: "PENDING",
    })
      .populate("details.variantId")
      .populate("fromBranch", "name");

    res.status(200).json({ success: true, data: transactions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// 4. Xác nhận nhập kho tại Chi nhánh (Không dùng Transaction)
exports.confirmImport = async (req, res) => {
  try {
    const { id } = req.params;
    const currentBranchId = req.user.branchId;

    const trans = await Transaction.findById(id);

    if (!trans)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    if (trans.status !== "PENDING")
      return res
        .status(400)
        .json({ success: false, message: "Phiếu không hợp lệ" });
    if (trans.toBranch.toString() !== currentBranchId.toString())
      return res.status(403).json({ message: "Không có quyền" });

    // Cập nhật kho chi nhánh
    for (const item of trans.details) {
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        variantId: item.variantId,
      });

      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          variantId: item.variantId,
          totalQuantity: 0,
          batches: [],
        });
      }

      inventory.batches.push({
        batchCode: item.batchCode,
        expiryDate: item.expiryDate,
        manufacturingDate: item.manufacturingDate || new Date(), // Fallback nếu thiếu
        quantity: item.quantity,
        initialQuantity: item.quantity,
        importPrice: item.price,
        quality: "Good",
      });

      inventory.totalQuantity += item.quantity;
      await inventory.save();
    }

    trans.status = "COMPLETED";
    await trans.save();

    return res
      .status(200)
      .json({ success: true, message: "Nhập kho thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. BÁN LẺ TẠI CHI NHÁNH (SALE)
exports.sellAtBranch = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ variantId, quantity, price }] (Price ở đây là giá bán ra)
    const currentBranchId = req.user.branchId;

    if (!currentBranchId) {
      return res
        .status(400)
        .json({ success: false, message: "User chưa thuộc chi nhánh nào" });
    }

    const transactionDetails = [];
    let totalValue = 0;

    for (const item of items) {
      // 1. Tìm tồn kho của thuốc này tại chi nhánh
      const inventory = await Inventory.findOne({
        branchId: currentBranchId,
        variantId: item.variantId,
      });

      if (!inventory || inventory.totalQuantity < item.quantity) {
        throw new Error(
          `Thuốc (ID: ${item.variantId}) không đủ tồn kho để bán.`,
        );
      }

      // 2. SẮP XẾP FEFO (Hết hạn trước bán trước)
      inventory.batches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );

      let remainQty = item.quantity;
      let currentItemCost = 0; // Để tính lợi nhuận nếu cần (không bắt buộc)

      // 3. QUÉT QUA CÁC LÔ ĐỂ TRỪ KHO
      for (let i = 0; i < inventory.batches.length; i++) {
        if (remainQty <= 0) break;

        let batch = inventory.batches[i];

        if (batch.quantity > 0) {
          let take = Math.min(batch.quantity, remainQty);

          // --- TRỪ TỒN KHO THỰC TẾ ---
          batch.quantity -= take;
          // batch.initialQuantity GIỮ NGUYÊN (Để biết lô này từng nhập bao nhiêu)

          remainQty -= take;

          // Lưu chi tiết lô nào đã được bán (Để truy vết khi khách khiếu nại hoặc thu hồi)
          // Lưu ý: item.price là Giá Bán, còn batch.importPrice là Giá Vốn
          transactionDetails.push({
            variantId: item.variantId,
            batchCode: batch.batchCode,
            expiryDate: batch.expiryDate,
            quantity: take,
            price: item.price, // Giá bán thực tế cho khách
          });

          // Không xóa lô khi hết hàng (giữ để báo cáo)
        }
      }

      if (remainQty > 0)
        throw new Error(
          `Lỗi tính toán: Không đủ lô hàng hợp lệ cho ${item.variantId}`,
        );

      // 4. Cập nhật tổng tồn kho
      inventory.totalQuantity -= item.quantity;
      await inventory.save();

      totalValue += item.quantity * item.price;
    }

    // 5. TẠO PHIẾU BÁN HÀNG (Transaction)
    const newTrans = await Transaction.create({
      code: `HD${Date.now()}`, // Mã hóa đơn
      type: "SALE_AT_BRANCH",
      status: "COMPLETED", // Bán là xong luôn
      fromBranch: currentBranchId, // Bán từ kho này
      toBranch: null, // Không chuyển đi đâu cả
      createdBy: req.user._id,
      details: transactionDetails,
      totalValue: totalValue,
    });

    return res.status(200).json({
      success: true,
      message: "Bán hàng thành công",
      transaction: newTrans,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. BÁO CÁO DOANH THU THEO KHOẢNG THỜI GIAN
// 6. BÁO CÁO DOANH THU (Hỗ trợ Admin lọc theo chi nhánh)
exports.getRevenueReport = async (req, res) => {
  try {
    const { fromDate, toDate, branchId } = req.query; // Thêm tham số branchId từ Client gửi lên
    const userRole = req.user.role;
    const userBranchId = req.user.branchId;

    // 1. XỬ LÝ QUYỀN XEM CHI NHÁNH
    let targetBranchId = null;

    if (userRole === "admin" || userRole === "warehouse_manager") {
      // Nếu là Admin:
      // - Nếu gửi branchId lên -> Xem chi nhánh đó
      // - Nếu không gửi -> Xem tất cả (targetBranchId = null)
      if (branchId) {
        targetBranchId = new mongoose.Types.ObjectId(branchId);
      }
    } else {
      // Nếu là Branch Manager / Dược sĩ -> Bắt buộc xem chi nhánh của mình
      if (!userBranchId) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Tài khoản không gắn với chi nhánh nào",
          });
      }
      targetBranchId = new mongoose.Types.ObjectId(userBranchId);
    }

    // 2. TẠO QUERY FILTER
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu thời gian lọc (fromDate, toDate)",
        });
    }

    const matchQuery = {
      type: "SALE_AT_BRANCH",
      status: "COMPLETED",
      createdAt: { $gte: start, $lte: end },
    };

    // Nếu có targetBranchId thì lọc theo chi nhánh, không thì lấy hết (cho Admin xem tổng)
    if (targetBranchId) {
      matchQuery.fromBranch = targetBranchId;
    }

    // 3. TÍNH TOÁN AGGREGATION
    const revenueStats = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalValue" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // 4. LẤY DANH SÁCH CHI TIẾT (Optional)
    const orders = await Transaction.find(matchQuery)
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName")
      .populate("fromBranch", "name"); // Populate thêm tên chi nhánh để Admin biết đơn của ai

    const result =
      revenueStats.length > 0
        ? revenueStats[0]
        : { totalRevenue: 0, totalOrders: 0 };

    res.status(200).json({
      success: true,
      filter: {
        branch: targetBranchId ? "Theo chi nhánh cụ thể" : "Toàn hệ thống",
        fromDate,
        toDate,
      },
      data: {
        summary: result,
        orders: orders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
