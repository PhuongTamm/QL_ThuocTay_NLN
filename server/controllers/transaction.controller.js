const Transaction = require("../models/Transaction");
const Inventory = require("../models/Inventory");
const Medicine = require("../models/Medicine");
const MonthlyInventory = require("../models/MonthlyInventory");
const MedicineVariant = require("../models/MedicineVariant");
const Customer = require("../models/Customer");
const Branch = require("../models/Branch");

//Cập nhật báo cáo xuất nhập tồn tháng (Monthly Report)
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

// NHẬP KHO TỪ NCC 
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
      if (!item.manufacturingDate) {
        throw new Error(
          `Lỗi: Lô hàng ${item.batchCode} chưa được nhập Ngày sản xuất (MFG).`,
        );
      }
      // LẤY THÔNG TIN QUY ĐỔI TỪ BIẾN THỂ
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant)
        throw new Error(`Không tìm thấy biến thể thuốc ID: ${item.variantId}`);

      const medicineId = variant.medicineId;
      // Số lượng và Giá vốn quy về đơn vị cơ sở (VD: Nhập 2 Hộp, 1 hộp 100 viên -> 200 viên)
      const baseQuantity = Number(item.quantity) * variant.conversionRate;
      const baseImportPrice = Number(item.price) / variant.conversionRate;

      // CẬP NHẬT KHO THEO MEDICINE ID VÀ SỐ LƯỢNG CƠ SỞ
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: medicineId,
      });

      // TÍNH TOÁN GIÁ VỐN BÌNH QUÂN GIA QUYỀN (MAC)
      // Công thức: [(Tồn cũ * Giá vốn cũ) + (Nhập mới * Giá nhập mới)] / (Tồn cũ + Nhập mới)
      const medicine = await Medicine.findById(medicineId);
      if (medicine) {
        const oldTotalQty = inventory ? inventory.totalQuantity : 0;
        const oldMac = medicine.mac || 0;

        // Tính MAC mới
        const newMac =
          (oldTotalQty * oldMac + baseQuantity * baseImportPrice) /
          (oldTotalQty + baseQuantity);

        // Cập nhật MAC vào Medicine
        medicine.mac = newMac;
        await medicine.save();
      }

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
          quality: "GOOD",
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
        manufacturingDate: item.manufacturingDate
          ? new Date(item.manufacturingDate)
          : null,
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

//XUẤT KHO TỔNG -> CHI NHÁNH
exports.createDistributionRequest = async (req, res) => {
  try {
    const { toBranchId, items } = req.body;
    const fromBranchId = req.user.branchId;
    const details = [];

    // TIỀN KIỂM TRA 
    // Gom tất cả các lô cùng một loại thuốc để tính tổng yêu cầu
    const requiredQuantities = {};
    const today = new Date();

    for (const item of items) {
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: "Lỗi: Không tìm thấy quy cách sản phẩm.",
        });
      }

      const medId = variant.medicineId.toString();
      const baseQty = Number(item.quantity) * variant.conversionRate;

      if (!requiredQuantities[medId]) {
        requiredQuantities[medId] = { qty: 0, name: variant.name };
      }
      requiredQuantities[medId].qty += baseQty;
    }

    // Kiểm tra xem tổng tồn kho hợp lệ có đáp ứng tổng yêu cầu không
    for (const medId in requiredQuantities) {
      const reqInfo = requiredQuantities[medId];
      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        medicineId: medId,
      });

      if (!sourceInv) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy tồn kho cho thuốc ${reqInfo.name}!`,
        });
      }

      const validBatches = sourceInv.batches.filter(
        (b) =>
          b.quantity > 0 &&
          b.quality === "GOOD" &&
          new Date(b.expiryDate) > today,
      );
      const totalValidAvailable = validBatches.reduce(
        (sum, b) => sum + b.quantity,
        0,
      );

      if (totalValidAvailable < reqInfo.qty) {
        return res.status(400).json({
          success: false,
          message: `Kho tổng không đủ thuốc ĐỦ ĐIỀU KIỆN (chưa hết hạn/không lỗi) cho ${reqInfo.name}. (Tổng yêu cầu: ${reqInfo.qty}, Tồn hợp lệ: ${totalValidAvailable})`,
        });
      }
    }

    //TIẾN HÀNH TRỪ KHO 
    for (const item of items) {
      const variant = await MedicineVariant.findById(item.variantId);
      const medicineId = variant.medicineId;
      const convRate = variant.conversionRate;
      const baseQtyToDeduct = Number(item.quantity) * convRate;

      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        medicineId: medicineId,
      });

      let validBatches = sourceInv.batches.filter(
        (b) =>
          b.quantity > 0 &&
          b.quality === "GOOD" &&
          new Date(b.expiryDate) > today,
      );

      // Sắp xếp FEFO (Ưu tiên lô cận Date xuất trước)
      validBatches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );

      let remainQty = baseQtyToDeduct;

      // THUẬT TOÁN 2-PASS: TRÁNH CHIA LẺ HỘP KHI XUẤT KHO
      // PASS 1:  lấy "Chẵn hộp" (Bội số của tỷ lệ quy đổi) từ các lô
      let remainFull = Math.floor(remainQty / convRate) * convRate;

      for (let i = 0; i < validBatches.length; i++) {
        if (remainFull <= 0) break;
        let batch = validBatches[i];

        // Tìm số lượng chẵn tối đa có thể lấy từ lô này
        let maxMultiple = Math.floor(batch.quantity / convRate) * convRate;

        if (maxMultiple > 0) {
          let takeFull = Math.min(maxMultiple, remainFull);
          if (takeFull > 0) {
            batch.quantity -= takeFull;
            remainQty -= takeFull;
            remainFull -= takeFull;

            details.push({
              variantId: item.variantId,
              batchCode: batch.batchCode,
              expiryDate: batch.expiryDate,
              manufacturingDate: batch.manufacturingDate,
              quantity: takeFull / convRate, // Kết quả chắc chắn là số nguyên (chẵn hộp)
              price: batch.importPrice * convRate,
            });
          }
        }
      }

      // PASS 2: Nếu vẫn còn thiếu (do xuất lẻ, hoặc các lô cộng lại bị lẻ), lấy nốt phần dư
      if (remainQty > 0) {
        for (let i = 0; i < validBatches.length; i++) {
          if (remainQty <= 0) break;
          let batch = validBatches[i];

          if (batch.quantity > 0) {
            let take = Math.min(batch.quantity, remainQty);
            batch.quantity -= take;
            remainQty -= take;

            // Nếu lô này đã được lấy ở Pass 1, ta cộng gộp vào detail cũ để tránh tách 2 dòng trùng nhau
            const existingDetail = details.find(
              (d) =>
                d.batchCode === batch.batchCode &&
                d.variantId.toString() === item.variantId.toString(),
            );

            if (existingDetail) {
              existingDetail.quantity += take / convRate;
            } else {
              details.push({
                variantId: item.variantId,
                batchCode: batch.batchCode,
                expiryDate: batch.expiryDate,
                manufacturingDate: batch.manufacturingDate,
                quantity: take / convRate, 
                price: batch.importPrice * convRate,
              });
            }
          }
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

//Lấy danh sách chờ nhập
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

// Xác nhận nhập kho tại Chi nhánh và kho tổng
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

      // Xác định chất lượng lô hàng
      let batchQuality = "GOOD";
      if (trans.type === "RETURN_TO_WAREHOUSE" && item.reason) {
        batchQuality = item.reason;
      }

      const existingBatchIndex = inventory.batches.findIndex(
        (b) =>
          b.batchCode === item.batchCode &&
          b.quality === batchQuality &&
          Math.abs(b.importPrice - baseImportPrice) < 0.01, 
      );

      if (existingBatchIndex > -1) {
        // NẾU ĐÃ CÓ LÔ NÀY -> CỘNG DỒN SỐ LƯỢNG
        inventory.batches[existingBatchIndex].quantity += baseQuantity;

        if (!inventory.batches[existingBatchIndex].initialQuantity) {
          inventory.batches[existingBatchIndex].initialQuantity = 0;
        }
        inventory.batches[existingBatchIndex].initialQuantity += baseQuantity;
      } else {
        // NẾU CHƯA CÓ LÔ NÀY -> THÊM LÔ MỚI
        inventory.batches.push({
          batchCode: item.batchCode,
          expiryDate: item.expiryDate,
          manufacturingDate: item.manufacturingDate,
          quantity: baseQuantity,
          initialQuantity: baseQuantity,
          importPrice: baseImportPrice,
          quality: batchQuality,
        });
      }

      inventory.totalQuantity += baseQuantity;
      await inventory.save();

      // Cập nhật báo cáo XNT tháng
      await updateMonthlyReport(
        currentBranchId,
        medicineId,
        baseQuantity,
        "IMPORT",
      );
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

// BÁN LẺ TẠI CHI NHÁNH
exports.sellAtBranch = async (req, res) => {
  try {
    const { items, customerPhone, customerName, paymentMethod, customerId } =
      req.body;
    const branchId = req.body.branchId || req.user.branchId || req.user.id;

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

      if (!inventory) {
        throw new Error(`Kho không có thuốc có ID: ${variant.medicineId}`);
      }

      // LỌC THUỐC HỢP LỆ 
      const today = new Date();
      const validBatches = inventory.batches.filter(
        (b) =>
          b.quantity > 0 &&
          b.quality === "GOOD" &&
          new Date(b.expiryDate) > today,
      );

      // CHECK LẠI TỒN KHO (Chỉ đếm hàng ĐỦ ĐIỀU KIỆN)
      const totalValidAvailable = validBatches.reduce(
        (sum, b) => sum + b.quantity,
        0,
      );
      if (totalValidAvailable < baseQtyToDeduct) {
        throw new Error(
          `Kho không đủ thuốc HỢP LỆ (chưa hết hạn/không hư hỏng) để bán! Yêu cầu: ${baseQtyToDeduct}, Tồn an toàn: ${totalValidAvailable}`,
        );
      }

      // SẮP XẾP FEFO TRÊN MẢNG ĐÃ LỌC 
      validBatches.sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
      );

      let remainQty = baseQtyToDeduct;
      const convRate = variant.conversionRate;

      //  THUẬT TOÁN 2-PASS: TRÁNH CHIA LẺ ĐƠN VỊ BÁN KHI BÁN LẺ 
      // PASS 1: lấy "Chẵn đơn vị" (Bội số của tỷ lệ quy đổi) từ các lô
      let remainFull = Math.floor(remainQty / convRate) * convRate;

      for (let i = 0; i < validBatches.length; i++) {
        if (remainFull <= 0) break;
        let batch = validBatches[i];

        // Tìm số lượng chẵn tối đa có thể lấy từ lô này
        let maxMultiple = Math.floor(batch.quantity / convRate) * convRate;

        if (maxMultiple > 0) {
          let takeFull = Math.min(maxMultiple, remainFull);
          if (takeFull > 0) {
            batch.quantity -= takeFull;
            remainQty -= takeFull;
            remainFull -= takeFull;
            inventory.totalQuantity -= takeFull; // Trừ tổng kho gốc

            await updateMonthlyReport(
              branchId,
              variant.medicineId,
              takeFull,
              "EXPORT",
            );

            const variantQtyDeducted = takeFull / convRate;
            const costPriceOfVariant = batch.importPrice * convRate;

            transactionDetails.push({
              variantId: item.variantId,
              batchCode: batch.batchCode,
              manufacturingDate: batch.manufacturingDate,
              expiryDate: batch.expiryDate,
              quantity: variantQtyDeducted, // Ghi nhận số lượng bán (ví dụ: 1 hộp)
              price: item.price, // Giá bán lẻ (Doanh thu)
              costPrice: costPriceOfVariant, // Giá vốn thực tế lô đó
            });
          }
        }
      }

      // PASS 2: Nếu vẫn còn thiếu (do khách mua lẻ viên, hoặc các lô cộng lại bị lẻ), lấy nốt phần dư
      if (remainQty > 0) {
        for (let i = 0; i < validBatches.length; i++) {
          if (remainQty <= 0) break;
          let batch = validBatches[i];

          if (batch.quantity > 0) {
            let take = Math.min(batch.quantity, remainQty);
            batch.quantity -= take;
            remainQty -= take;
            inventory.totalQuantity -= take; // Trừ tổng kho gốc

            await updateMonthlyReport(
              branchId,
              variant.medicineId,
              take,
              "EXPORT",
            );

            const variantQtyDeducted = take / convRate;
            const costPriceOfVariant = batch.importPrice * convRate;

            // Kiểm tra xem lô này đã được ghi nhận ở Pass 1 chưa, nếu có thì cộng dồn tránh tách 2 dòng trùng nhau
            const existingDetail = transactionDetails.find(
              (d) =>
                d.batchCode === batch.batchCode &&
                d.variantId.toString() === item.variantId.toString(),
            );

            if (existingDetail) {
              existingDetail.quantity += variantQtyDeducted;
            } else {
              transactionDetails.push({
                variantId: item.variantId,
                batchCode: batch.batchCode,
                manufacturingDate: batch.manufacturingDate,
                expiryDate: batch.expiryDate,
                quantity: variantQtyDeducted, 
                price: item.price,
                costPrice: costPriceOfVariant,
              });
            }
          }
        }
      }

      if (remainQty > 0) {
        throw new Error(`Lỗi trừ kho: Các lô hiện tại không đủ để xuất!`);
      }

      // Lưu lại tồn kho sau khi đã trừ
      await inventory.save();

      // Cộng tiền món này vào tổng hóa đơn
      totalBillAmount += item.quantity * item.price;
    }

    // TẠO HÓA ĐƠN
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
      details: transactionDetails, 
    });

    await newTransaction.save();

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

// LẤY LỊCH SỬ NHẬP CỦA 1 LÔ CỤ THỂ 
exports.getBatchImportHistory = async (req, res) => {
  try {
    // Nhận thêm batchQuality từ giao diện
    const { branchId, medicineId, batchCode, importPrice, batchQuality } =
      req.query;

    const transactions = await Transaction.find({
      toBranch: branchId,
      status: "COMPLETED",
      $or: [
        { type: "IMPORT_SUPPLIER" },
        { type: "EXPORT_TO_BRANCH" },
        { type: "RETURN_TO_WAREHOUSE" },
      ],
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
          // Tính giá vốn cơ sở
          const basePriceOfTransaction =
            detail.price / detail.variantId.conversionRate;
          if (
            importPrice &&
            Math.abs(basePriceOfTransaction - Number(importPrice)) > 0.01
          ) {
            return;
          }

          let txQuality = "GOOD"; // Mặc định Nhập NCC và Luân chuyển là hàng An toàn (GOOD)

          // Nếu là phiếu trả hàng, trạng thái của lô sẽ tương ứng với lý do trả (DAMAGED, EXPIRED, OVERSTOCK)
          if (trans.type === "RETURN_TO_WAREHOUSE" && detail.reason) {
            txQuality = detail.reason;
          }

          // Nếu chất lượng của giao dịch này KHÔNG KHỚP với chất lượng lô đang bấm xem -> Bỏ qua
          if (batchQuality && txQuality !== batchQuality) {
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

// LẤY LỊCH SỬ PHIẾU GIAO DỊCH 
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

// XUẤT TRẢ VỀ KHO TỔNG 
exports.returnToWarehouse = async (req, res) => {
  try {
    const { items } = req.body;
    const fromBranchId = req.user.branchId;

    if (!fromBranchId) {
      return res
        .status(400)
        .json({ message: "Kho tổng không thể tự trả hàng cho chính mình!" });
    }

    const mainWarehouse = await Branch.findOne({ type: "warehouse" });
    if (!mainWarehouse) {
      return res
        .status(500)
        .json({ message: "Không tìm thấy dữ liệu Kho tổng trên hệ thống!" });
    }

    const details = [];
    let totalValue = 0;

    for (const item of items) {
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant) throw new Error("Không tìm thấy quy cách!");

      const medicineId = variant.medicineId;
      const baseQtyToDeduct = Number(item.quantity) * variant.conversionRate;

      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        medicineId: medicineId,
      });
      if (!sourceInv) throw new Error("Không tìm thấy tồn kho!");

      const batchIndex = sourceInv.batches.findIndex(
        (b) => b._id.toString() === item.batchId,
      );
      if (batchIndex === -1)
        throw new Error(`Không tìm thấy ID lô ${item.batchCode} trong kho!`);

      const batch = sourceInv.batches[batchIndex];
      if (batch.quantity < baseQtyToDeduct) {
        throw new Error(
          `Lô ${item.batchCode} không đủ số lượng để trả (Tồn: ${batch.quantity})`,
        );
      }

      batch.quantity -= baseQtyToDeduct;
      sourceInv.totalQuantity -= baseQtyToDeduct;
      await sourceInv.save();

      await updateMonthlyReport(
        fromBranchId,
        medicineId,
        baseQtyToDeduct,
        "EXPORT",
      );

      const itemValue = baseQtyToDeduct * batch.importPrice;
      totalValue += itemValue;

      details.push({
        variantId: item.variantId,
        batchCode: batch.batchCode,
        expiryDate: batch.expiryDate,
        manufacturingDate: batch.manufacturingDate,
        quantity: item.quantity,
        price: batch.importPrice * variant.conversionRate,
        reason: item.reason,
      });
    }

    const trans = await Transaction.create({
      code: `PT${Date.now()}`,
      type: "RETURN_TO_WAREHOUSE",
      status: "PENDING",
      fromBranch: fromBranchId,
      toBranch: mainWarehouse._id,
      createdBy: req.user._id || req.user.id,
      details: details,
      totalValue: totalValue,
    });

    res.status(200).json({
      success: true,
      message: "Tạo phiếu trả hàng về Kho tổng thành công!",
      transaction: trans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// XUẤT HỦY HÀNG HÓA TỔN THẤT 
exports.disposeInventory = async (req, res) => {
  try {
    const { items } = req.body;
    // Lấy branchId: Nếu là Quản lý Kho tổng thao tác thì branchId là null, nếu là Chi nhánh thì có ID.
    const currentBranchId = req.user.branchId || null;

    const details = [];
    let totalLossValue = 0; // Biến tính TỔNG CHI PHÍ TỔN THẤT

    for (const item of items) {
      const variant = await MedicineVariant.findById(item.variantId);
      if (!variant) throw new Error("Không tìm thấy quy cách!");

      const medicineId = variant.medicineId;
      const baseQtyToDeduct = Number(item.quantity) * variant.conversionRate;

      const sourceInv = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: medicineId,
      });
      if (!sourceInv) throw new Error("Không tìm thấy tồn kho!");

      // TÌM ĐÍCH DANH MÃ LÔ CẦN HỦY
      const batchIndex = sourceInv.batches.findIndex(
        (b) => b._id.toString() === item.batchId,
      );

      if (batchIndex === -1)
        throw new Error(
          `Không tìm thấy lô ${item.batchCode} (Trạng thái: ${item.batchQuality}) trong kho!`,
        );

      const batch = sourceInv.batches[batchIndex];
      if (batch.quantity < baseQtyToDeduct) {
        throw new Error(`Lô ${item.batchCode} không đủ số lượng để xuất hủy!`);
      }

      // TRỪ VĨNH VIỄN KHỎI KHO
      batch.quantity -= baseQtyToDeduct;
      sourceInv.totalQuantity -= baseQtyToDeduct;
      await sourceInv.save();

      await updateMonthlyReport(
        currentBranchId,
        medicineId,
        baseQtyToDeduct,
        "EXPORT",
      );

      // TÍNH TOÁN CHI PHÍ TỔN THẤT (Số lượng cơ sở hủy đi x Giá vốn cơ sở)
      const lossValue = baseQtyToDeduct * batch.importPrice;
      totalLossValue += lossValue;

      details.push({
        variantId: item.variantId,
        batchCode: batch.batchCode,
        expiryDate: batch.expiryDate,
        manufacturingDate: batch.manufacturingDate,
        quantity: item.quantity,
        price: batch.importPrice * variant.conversionRate,
        reason: item.reason, // Ghi nhận lý do hủy: EXPIRED, DAMAGED
      });
    }

    // TẠO PHIẾU XUẤT HỦY (không chờ ai nhận)
    const trans = await Transaction.create({
      code: `PH${Date.now()}`, 
      type: "DISPOSAL",
      status: "COMPLETED", // Hoàn tất ngay lập tức
      fromBranch: currentBranchId,
      createdBy: req.user._id || req.user.id,
      details: details,
      totalValue: totalLossValue, 
    });

    res.status(200).json({
      success: true,
      message: "Đã xuất hủy và ghi nhận chi phí tổn thất thành công!",
      transaction: trans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
