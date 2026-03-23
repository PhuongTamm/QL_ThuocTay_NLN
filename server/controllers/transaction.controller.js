const Transaction = require("../models/Transaction");
const Inventory = require("../models/Inventory");
const MonthlyInventory = require("../models/MonthlyInventory");
const MedicineVariant = require("../models/MedicineVariant");
const Customer = require("../models/Customer");

// --- HELPER: Cập nhật sổ cái (Đã đổi variantId thành medicineId) ---
const updateMonthlyReport = async (
  warehouseId,
  medicineId,
  baseQuantity,
  type,
) => {
  try {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    let report = await MonthlyInventory.findOne({
      warehouseId,
      medicineId,
      month,
      year,
    });

    if (!report) {
      let prevMonth = month === 1 ? 12 : month - 1;
      let prevYear = month === 1 ? year - 1 : year;
      const prevReport = await MonthlyInventory.findOne({
        warehouseId,
        medicineId,
        month: prevMonth,
        year: prevYear,
      });
      const startQty = prevReport ? prevReport.endQuantity : 0;

      report = new MonthlyInventory({
        month,
        year,
        warehouseId,
        medicineId,
        startQuantity: startQty,
        importQuantity: 0,
        exportQuantity: 0,
        endQuantity: startQty,
      });
    }

    if (type === "IMPORT") {
      report.importQuantity += baseQuantity;
      report.endQuantity += baseQuantity;
    } else if (type === "EXPORT") {
      report.exportQuantity += baseQuantity;
      report.endQuantity -= baseQuantity;
    }
    await report.save();
  } catch (err) {
    console.error("Lỗi cập nhật báo cáo tháng:", err);
  }
};

// 1. NHẬP KHO TỪ NCC (Áp dụng thuật toán Base Unit)
exports.importFromSupplier = async (req, res) => {
  try {
    const { items, supplierName } = req.body;
    const currentBranchId = req.user.branchId;

    if (!currentBranchId) {
      return res.status(400).json({
        success: false,
        message: "Lỗi: Tài khoản chưa được gán vào Kho/Chi nhánh.",
      });
    }
    if (!items || items.length === 0) throw new Error("Danh sách hàng rỗng");

    const transactionDetails = [];
    let totalValue = 0;

    for (const item of items) {
      // BƯỚC 1: LẤY THÔNG TIN QUY ĐỔI TỪ BIẾN THỂ
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant)
        throw new Error(`Không tìm thấy biến thể thuốc ID: ${item.variantId}`);

      const medicineId = variant.medicineId;
      // Số lượng và Giá vốn quy về đơn vị cơ sở (VD: Nhập 2 Hộp, 1 hộp 100 viên -> 200 viên)
      const baseQuantity = Number(item.quantity) * variant.conversionRate;
      const baseImportPrice = Number(item.price) / variant.conversionRate;

      // BƯỚC 2: CẬP NHẬT KHO THEO MEDICINE ID VÀ SỐ LƯỢNG CƠ SỞ
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: medicineId,
      });

      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          medicineId: medicineId,
          totalQuantity: 0,
          batches: [],
        });
      }

      const existingBatchIndex = inventory.batches.findIndex(
        (b) =>
          b.batchCode === item.batchCode && b.importPrice === baseImportPrice,
      );

      if (existingBatchIndex > -1) {
        inventory.batches[existingBatchIndex].quantity += baseQuantity;
        if (!inventory.batches[existingBatchIndex].initialQuantity) {
          inventory.batches[existingBatchIndex].initialQuantity = 0;
        }
        inventory.batches[existingBatchIndex].initialQuantity += baseQuantity;
      } else {
        inventory.batches.push({
          batchCode: item.batchCode,
          expiryDate: new Date(item.expiryDate),
          manufacturingDate: new Date(item.manufacturingDate),
          quantity: baseQuantity, // Lưu số lượng viên
          initialQuantity: baseQuantity,
          importPrice: baseImportPrice, // Lưu giá vốn của 1 viên
          quality: "Good",
        });
      }

      inventory.totalQuantity += baseQuantity;
      await inventory.save();

      // Cập nhật báo cáo tháng
      await updateMonthlyReport(
        currentBranchId,
        medicineId,
        baseQuantity,
        "IMPORT",
      );

      // Transaction giữ nguyên ghi nhận nhập Hộp
      transactionDetails.push({
        variantId: item.variantId,
        batchCode: item.batchCode,
        expiryDate: new Date(item.expiryDate),
        quantity: Number(item.quantity),
        price: Number(item.price),
      });
      totalValue += Number(item.quantity) * Number(item.price);
    }

    const newTransaction = await Transaction.create({
      code: `PN${Date.now()}`,
      type: "IMPORT_SUPPLIER",
      status: "COMPLETED",
      toBranch: currentBranchId,
      createdBy: req.user.id,
      supplierName,
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

// 2. XUẤT KHO TỔNG -> CHI NHÁNH
exports.createDistributionRequest = async (req, res) => {
  try {
    const { toBranchId, items } = req.body;
    const fromBranchId = req.user.branchId;
    const details = [];

    for (const item of items) {
      const variant = await MedicineVariant.findById(item.variantId);
      const medicineId = variant.medicineId;
      const baseQtyToDeduct = Number(item.quantity) * variant.conversionRate;

      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        medicineId: medicineId,
      });

      if (!sourceInv || sourceInv.totalQuantity < baseQtyToDeduct) {
        throw new Error(
          `Thuốc không đủ hàng (Tồn: ${sourceInv?.totalQuantity || 0}, Cần xuất: ${baseQtyToDeduct} đơn vị cơ sở)`,
        );
      }

      sourceInv.batches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );
      let remainQty = baseQtyToDeduct;

      for (let i = 0; i < sourceInv.batches.length; i++) {
        if (remainQty <= 0) break;
        let batch = sourceInv.batches[i];

        if (batch.quantity > 0) {
          let take = Math.min(batch.quantity, remainQty);
          batch.quantity -= take;
          remainQty -= take;

          details.push({
            variantId: item.variantId,
            batchCode: batch.batchCode,
            expiryDate: batch.expiryDate,
            quantity: take / variant.conversionRate, // Quy ngược lại để ghi phiếu
            price: batch.importPrice * variant.conversionRate,
          });
        }
      }

      sourceInv.totalQuantity -= baseQtyToDeduct;
      await sourceInv.save();
      await updateMonthlyReport(
        fromBranchId,
        medicineId,
        baseQtyToDeduct,
        "EXPORT",
      );
    }

    const trans = await Transaction.create({
      code: `PX${Date.now()}`,
      type: "EXPORT_TO_BRANCH",
      status: "PENDING",
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      createdBy: req.user.id,
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

// 4. Xác nhận nhập kho tại Chi nhánh
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

    for (const item of trans.details) {
      const variant = await MedicineVariant.findById(item.variantId);
      const medicineId = variant.medicineId;
      const baseQuantity = Number(item.quantity) * variant.conversionRate;
      const baseImportPrice = Number(item.price) / variant.conversionRate;

      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: medicineId,
      });
      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          medicineId: medicineId,
          totalQuantity: 0,
          batches: [],
        });
      }

      inventory.batches.push({
        batchCode: item.batchCode,
        expiryDate: item.expiryDate,
        manufacturingDate: item.manufacturingDate || new Date(),
        quantity: baseQuantity,
        initialQuantity: baseQuantity,
        importPrice: baseImportPrice,
        quality: "Good",
      });

      inventory.totalQuantity += baseQuantity;
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

// 5. BÁN LẺ TẠI CHI NHÁNH
// exports.sellAtBranch = async (req, res) => {
//   try {
//     const { items } = req.body;
//     const currentBranchId = req.user.branchId;
//     if (!currentBranchId)
//       return res
//         .status(400)
//         .json({ success: false, message: "User chưa thuộc chi nhánh nào" });

//     const transactionDetails = [];
//     let totalValue = 0;

//     for (const item of items) {
//       // 1. Tìm thông tin biến thể và tỷ lệ quy đổi
//       const variant = await MedicineVariant.findById(item.variantId);
//       if (!variant)
//         throw new Error(`Không tìm thấy biến thể thuốc ID: ${item.variantId}`);

//       const medicineId = variant.medicineId;
//       const baseQtyToDeduct = Number(item.quantity) * variant.conversionRate; // VD mua 1 vỉ -> cần trừ 10 viên

//       // 2. Tìm tồn kho thuốc gốc
//       const inventory = await Inventory.findOne({
//         branchId: currentBranchId,
//         medicineId: medicineId,
//       });

//       if (!inventory || inventory.totalQuantity < baseQtyToDeduct) {
//         throw new Error(
//           `Thuốc [${variant.name}] không đủ tồn kho để bán. Yêu cầu: ${baseQtyToDeduct} đơn vị cơ sở, Tồn kho: ${inventory ? inventory.totalQuantity : 0}`,
//         );
//       }

//       // 3. Sắp xếp lô theo hạn sử dụng (FEFO)
//       inventory.batches.sort(
//         (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
//       );

//       let remainQty = baseQtyToDeduct;

//       // 4. Quét qua các lô để lấy hàng
//       for (let i = 0; i < inventory.batches.length; i++) {
//         if (remainQty <= 0) break;
//         let batch = inventory.batches[i];

//         if (batch.quantity > 0) {
//           // Lấy số viên tối đa có thể từ lô này
//           let take = Math.min(batch.quantity, remainQty);

//           batch.quantity -= take;
//           remainQty -= take;

//           // Ghi nhận vào hóa đơn (Quy đổi số viên vừa lấy ngược lại thành Đơn vị hiển thị: Vỉ/Hộp)
//           transactionDetails.push({
//             variantId: item.variantId,
//             batchCode: batch.batchCode,
//             expiryDate: batch.expiryDate,
//             // SỬA BUG: Lấy số viên thực tế chia cho tỷ lệ quy đổi
//             quantity: take / variant.conversionRate,
//             price: item.price,
//           });
//         }
//       }

//       if (remainQty > 0)
//         throw new Error(
//           `Lỗi tính toán FEFO: Không đủ lô hàng hợp lệ cho ${variant.name}`,
//         );

//       // 5. Cập nhật tổng kho và lưu lại
//       inventory.totalQuantity -= baseQtyToDeduct;
//       await inventory.save();

//       totalValue += item.quantity * item.price;
//     }

//     // 6. Tạo hóa đơn
//     const newTrans = await Transaction.create({
//       code: `HD${Date.now()}`,
//       type: "SALE_AT_BRANCH",
//       status: "COMPLETED",
//       fromBranch: currentBranchId,
//       toBranch: null,
//       createdBy: req.user.id,
//       details: transactionDetails,
//       totalValue: totalValue,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Bán hàng thành công",
//       transaction: newTrans,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
exports.sellAtBranch = async (req, res) => {
  try {
    const { items, customerPhone, customerName, paymentMethod, customerId } =
      req.body;
    const branchId = req.user.branchId || req.user.id;

    // 1. XỬ LÝ KHÁCH HÀNG (Upsert)
    let finalCustomerId = customerId || null;
    if (customerPhone && !finalCustomerId) {
      let existingCustomer = await Customer.findOne({ phone: customerPhone });
      if (existingCustomer) {
        finalCustomerId = existingCustomer._id;
      } else {
        const newCustomer = await Customer.create({
          phone: customerPhone,
          name: customerName || "Khách Vãng Lai",
        });
        finalCustomerId = newCustomer._id;
      }
    }

    let totalBillAmount = 0;
    const transactionDetails = []; // Mảng chứa chi tiết hóa đơn (Đã được bóc tách theo lô FEFO)

    // 2. VÒNG LẶP XỬ LÝ TỪNG MÓN HÀNG TRONG GIỎ
    for (const item of items) {
      // Tìm thông tin Quy cách để lấy Tỷ lệ quy đổi
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant) throw new Error("Không tìm thấy thông tin quy cách thuốc!");

      const baseQtyToDeduct = item.quantity * variant.conversionRate;

      // Tìm Tồn kho của thuốc này tại Chi nhánh hiện tại
      const inventory = await Inventory.findOne({
        branchId,
        medicineId: variant.medicineId,
      });
      if (!inventory || inventory.totalQuantity < baseQtyToDeduct) {
        throw new Error(
          `Kho không đủ số lượng cho thuốc có ID: ${variant.medicineId}`,
        );
      }

      // Sắp xếp các lô theo Hạn sử dụng (FEFO - Hết hạn trước nằm trên)
      inventory.batches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );

      let remainingBaseQtyToDeduct = baseQtyToDeduct;

      // 3. THUẬT TOÁN TRỪ LÔ (FEFO)
      for (let batch of inventory.batches) {
        if (remainingBaseQtyToDeduct <= 0) break;

        if (batch.quantity > 0) {
          const deductAmount = Math.min(
            batch.quantity,
            remainingBaseQtyToDeduct,
          );

          // Trừ kho
          batch.quantity -= deductAmount;
          remainingBaseQtyToDeduct -= deductAmount;
          inventory.totalQuantity -= deductAmount;

          // GHI VÀO LỊCH SỬ GIAO DỊCH CHÍNH XÁC MÃ LÔ NÀY
          // Quy đổi số lượng BaseUnit vừa bị trừ ngược lại thành Unit của Frontend (VD: Trừ 30 viên -> Ghi vào hóa đơn là 1 Hộp)
          const variantQtyDeducted = deductAmount / variant.conversionRate;

          transactionDetails.push({
            variantId: item.variantId,
            batchCode: batch.batchCode, // ĐÃ CÓ MÃ LÔ
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate, // ĐÃ CÓ HẠN SỬ DỤNG
            quantity: variantQtyDeducted,
            price: item.price,
          });
        }
      }

      if (remainingBaseQtyToDeduct > 0) {
        throw new Error(`Lỗi trừ kho: Các lô hiện tại không đủ để xuất!`);
      }

      // Lưu lại tồn kho sau khi đã trừ
      await inventory.save();

      // Cộng tiền món này vào tổng hóa đơn
      totalBillAmount += item.quantity * item.price;
    }

    // 4. TẠO PHIẾU GIAO DỊCH (HÓA ĐƠN)
    const newTransaction = new Transaction({
      code: "HD" + Date.now(),
      type: "SALE_AT_BRANCH",
      status: "COMPLETED",
      createdBy: req.user._id || req.user.id,
      fromBranch: branchId,
      customerId: finalCustomerId,
      customerName: customerName || (customerPhone ? "" : "Khách lẻ"),
      customerPhone: customerPhone || "",
      paymentMethod: paymentMethod || "CASH",
      totalAmount: totalBillAmount,
      details: transactionDetails, // <-- Truyền mảng đã được bóc tách lô FEFO vào đây
    });

    await newTransaction.save();

    // 5. CỘNG ĐIỂM / DOANH THU CHO KHÁCH HÀNG (Nếu có)
    if (finalCustomerId) {
      await Customer.findByIdAndUpdate(finalCustomerId, {
        $inc: { totalSpent: totalBillAmount },
      });
    }

    res.status(200).json({
      success: true,
      message: "Thanh toán thành công",
      data: newTransaction,
    });
  } catch (error) {
    console.error("Lỗi bán hàng:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- LẤY LỊCH SỬ NHẬP CỦA 1 LÔ CỤ THỂ ---
exports.getBatchImportHistory = async (req, res) => {
  try {
    // BỔ SUNG: Nhận thêm tham số importPrice từ Frontend
    const { branchId, medicineId, batchCode, importPrice } = req.query;

    const transactions = await Transaction.find({
      toBranch: branchId,
      status: "COMPLETED",
      $or: [{ type: "IMPORT_SUPPLIER" }, { type: "EXPORT_TO_BRANCH" }],
    })
      .populate("details.variantId")
      .populate("fromBranch", "name")
      .populate("createdBy", "fullName");

    const history = [];

    transactions.forEach((trans) => {
      trans.details.forEach((detail) => {
        if (
          detail.batchCode === batchCode &&
          detail.variantId &&
          detail.variantId.medicineId.toString() === medicineId
        ) {
          // BỔ SUNG LOGIC LỌC THEO GIÁ VỐN
          // Tính giá vốn cơ sở của tờ hóa đơn này (Ví dụ: 15.000đ / 10 viên = 1.500đ/viên)
          const basePriceOfTransaction =
            detail.price / detail.variantId.conversionRate;

          // Nếu Frontend có truyền importPrice lên, và giá vốn không khớp -> Bỏ qua, không đưa vào lịch sử
          if (
            importPrice &&
            Math.abs(basePriceOfTransaction - Number(importPrice)) > 0.01
          ) {
            return;
          }

          history.push({
            transactionCode: trans.code,
            date: trans.createdAt,
            source:
              trans.type === "IMPORT_SUPPLIER"
                ? trans.supplierName
                : `Kho nội bộ: ${trans.fromBranch?.name || ""}`,
            createdBy: trans.createdBy?.fullName || "Hệ thống",
            variantName: detail.variantId.name,
            unit: detail.variantId.unit,
            quantity: detail.quantity,
            unitPrice: detail.price,
            totalValue: detail.quantity * detail.price,
          });
        }
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- LẤY LỊCH SỬ PHIẾU GIAO DỊCH KHÔNG ---
exports.getTransactionHistory = async (req, res) => {
  try {
    const { role, branchId } = req.user;

    let query = {};
    // Nếu là Dược sĩ / Quản lý chi nhánh -> Chỉ xem phiếu của chi nhánh mình (Nhập từ kho tổng hoặc Xuất trả)
    if (role !== "admin" && role !== "warehouse_manager") {
      query = {
        $or: [{ fromBranch: branchId }, { toBranch: branchId }],
      };
    }

    // Lấy danh sách phiếu, sắp xếp mới nhất lên đầu
    const transactions = await Transaction.find(query)
      .populate("fromBranch", "name")
      .populate("toBranch", "name")
      .populate("createdBy", "fullName")
      .populate("details.variantId", "name sku unit conversionRate")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
