const Transaction = require("../models/Transaction");
const Inventory = require("../models/Inventory");
const mongoose = require("mongoose");

// 1. Nhập kho từ Nhà cung cấp (Chỉ Kho tổng làm việc này)
exports.importFromSupplier = async (req, res) => {
  try {
    const { items, supplierName } = req.body;

    // Lấy ID kho hiện tại từ user đang đăng nhập (thường là Warehouse Manager)
    const currentBranchId = req.user.branchId;

    // --- VALIDATION DỮ LIỆU ĐẦU VÀO ---
    if (!currentBranchId) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản của bạn chưa được gán vào Kho/Chi nhánh nào.",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách hàng nhập không được để trống.",
      });
    }

    if (!supplierName || supplierName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên Nhà cung cấp.",
      });
    }

    const transactionDetails = [];
    let totalValue = 0;

    // --- XỬ LÝ TỪNG MẶT HÀNG ---
    for (const item of items) {
      // Kiểm tra logic ngày tháng (Backend validation để an toàn)
      if (new Date(item.expiryDate) <= new Date(item.manufacturingDate)) {
        return res.status(400).json({
          success: false,
          message: `Lỗi tại thuốc ${
            item.medicineName || item.medicineId
          }: Hạn sử dụng phải sau ngày sản xuất.`,
        });
      }

      // 1. Tìm bản ghi Tồn kho (Inventory) của thuốc này tại Kho hiện tại
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: item.medicineId,
      });

      // Nếu chưa có (thuốc mới nhập lần đầu), tạo mới document Inventory
      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          medicineId: item.medicineId,
          totalQuantity: 0,
          batches: [],
        });
      }

      // 2. Thêm lô thuốc mới vào mảng batches
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      inventory.batches.push({
        batchCode: item.batchCode,
        expiryDate: new Date(item.expiryDate),
        manufacturingDate: new Date(item.manufacturingDate),
        initialQuantity: quantity,
        quantity: quantity,
        importPrice: price,
        quality: "Good", // Mặc định hàng nhập mới là tốt
      });

      // 3. Cập nhật tổng số lượng tồn kho
      inventory.totalQuantity += quantity;

      // Lưu Inventory vào DB
      await inventory.save();

      // 4. Chuẩn bị dữ liệu cho chi tiết Transaction
      transactionDetails.push({
        medicineId: item.medicineId,
        batchCode: item.batchCode,
        expiryDate: new Date(item.expiryDate),
        manufacturingDate: new Date(item.manufacturingDate),
        quantity: quantity,
        price: price, // Giá nhập
        quality: "Good",
      });

      // Cộng dồn tổng giá trị phiếu nhập
      totalValue += quantity * price;
    }

    // --- TẠO PHIẾU GIAO DỊCH (TRANSACTION) ---
    const newTransaction = await Transaction.create({
      code: `PN${Date.now()}`, // Tạo mã phiếu nhập tự động (VD: PN1710123456)
      type: "IMPORT_SUPPLIER",
      status: "COMPLETED", // Nhập từ NCC thì hoàn thành ngay (hàng đã vào kho)
      toBranch: currentBranchId, // Kho nhận hàng
      createdBy: req.user._id, // Người tạo phiếu
      supplierName: supplierName, // <--- LƯU TÊN NHÀ CUNG CẤP
      details: transactionDetails,
      totalValue: totalValue,
      date: Date.now(),
    });

    // --- TRẢ KẾT QUẢ VỀ CLIENT ---
    return res.status(200).json({
      success: true,
      message: "Nhập kho từ Nhà cung cấp thành công.",
      transaction: newTransaction,
    });
  } catch (error) {
    console.error("Lỗi Import Supplier:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi Server: " + error.message,
    });
  }
};

// 2. Xuất kho tổng -> Chi nhánh (Tạo phiếu xuất - Bước 1)
exports.createDistributionRequest = async (req, res) => {
  try {
    const { toBranchId, items } = req.body; // items: [{ medicineId, quantity }]
    const fromBranchId = req.user.branchId;
    const details = [];

    for (const item of items) {
      const sourceInv = await Inventory.findOne({
        branchId: fromBranchId,
        medicineId: item.medicineId,
      });

      if (!sourceInv || sourceInv.totalQuantity < item.quantity) {
        throw new Error(`Thuốc ID ${item.medicineId} không đủ tồn kho`);
      }

      // --- THUẬT TOÁN FEFO ---
      // Sắp xếp lô theo hạn dùng tăng dần
      sourceInv.batches.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
      );

      let remainQty = item.quantity;

      // Trừ kho nguồn
      for (let i = 0; i < sourceInv.batches.length; i++) {
        if (remainQty <= 0) break;

        let batch = sourceInv.batches[i];

        if (batch.quantity > 0) {
          let take = Math.min(batch.quantity, remainQty);

          // Đẩy vào chi tiết phiếu xuất
          details.push({
            medicineId: item.medicineId,
            batchCode: batch.batchCode,
            expiryDate: batch.expiryDate,
            manufacturingDate: batch.manufacturingDate,
            quantity: take,
            quality: "Good",
          });

          batch.quantity -= take;
          remainQty -= take;

          if (batch.quantity === 0) {
            sourceInv.batches.splice(i, 1);
            i--;
          }
        }
      }

      sourceInv.totalQuantity -= item.quantity;
      await sourceInv.save();
    }

    // Tạo Transaction trạng thái PENDING
    const trans = await Transaction.create({
      code: `PX_${Date.now()}`,
      type: "EXPORT_TO_BRANCH",
      status: "PENDING",
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      createdBy: req.user._id,
      details: details,
    });

    res.status(200).json({
      success: true,
      message: "Tạo phiếu xuất thành công",
      transaction: trans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Lấy danh sách phiếu chờ nhập (Cho Branch Manager)
// GET /api/transactions/pending-import
exports.getPendingImports = async (req, res) => {
  try {
    const currentBranchId = req.user.branchId;

    if (!currentBranchId) {
      return res
        .status(400)
        .json({ success: false, message: "User không thuộc chi nhánh nào" });
    }

    const transactions = await Transaction.find({
      toBranch: currentBranchId,
      status: "PENDING",
      type: { $in: ["EXPORT_TO_BRANCH", "TRANSFER_BRANCH"] }, // Các loại phiếu chuyển đến
    })
      .populate("details.medicineId", "name code unit") // Lấy tên thuốc hiển thị
      .populate("fromBranch", "name") // Lấy tên kho nguồn
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Xác nhận nhập kho (Confirm Import)
// PUT /api/transactions/:id/confirm-import
exports.confirmImport = async (req, res) => {
  try {
    const { id } = req.params;
    const currentBranchId = req.user.branchId;
    
    // 1. Tìm phiếu xuất
    const trans = await Transaction.findById(id); // Bỏ .session(session)
    
    if (!trans) {
      return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy phiếu giao dịch" });
    }
    
    // 2. Validate
    if (trans.status !== "PENDING") {
      return res
      .status(400)
      .json({
        success: false,
        message: "Phiếu này đã được xử lý hoặc đã hủy",
      });
    }

    if (trans.toBranch.toString() !== currentBranchId.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Bạn không có quyền nhập phiếu của chi nhánh khác",
        });
    }

    // 3. Cập nhật kho (Cộng hàng vào chi nhánh)
    for (const item of trans.details) {
      // Tìm Inventory tại chi nhánh đích
      let inventory = await Inventory.findOne({
        branchId: currentBranchId,
        medicineId: item.medicineId,
      }); // Bỏ .session(session)

      // Nếu chưa có thuốc này trong kho -> Tạo mới document
      if (!inventory) {
        inventory = new Inventory({
          branchId: currentBranchId,
          medicineId: item.medicineId,
          totalQuantity: 0,
          batches: [],
        });
      }

      // Thêm lô thuốc vào mảng batches
      inventory.batches.push({
        batchCode: item.batchCode,
        expiryDate: item.expiryDate,
        manufacturingDate: item.manufacturingDate,
        initialQuantity: item.quantity,
        quantity: item.quantity,
        importPrice: item.price,
        quality: item.quality || "Good",
      });

      // Cộng tổng tồn
      inventory.totalQuantity += item.quantity;

      await inventory.save(); // Bỏ { session }
    }

    // 4. Cập nhật trạng thái Transaction
    trans.status = "COMPLETED";
    await trans.save(); // Bỏ { session }

    // KHÔNG CẦN commitTransaction
    return res
      .status(200)
      .json({ success: true, message: "Xác nhận nhập kho thành công" });
  } catch (error) {
    // KHÔNG CẦN abortTransaction
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};