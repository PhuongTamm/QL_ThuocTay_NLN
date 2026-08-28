import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  Search,
  Tag,
  PackageCheck,
  Layers,
  User,
  CalendarDays,
  Store,
  Pill,
  X,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import { useAuth } from "../../context/AuthContext";

const ImportSupplier = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ─── STATE QUẢN LÝ DỮ LIỆU GỐC HỆ THỐNG ─────────────────────────────────
  const [supplierName, setSupplierName] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);

  // ─── STATE BỘ LỌC TÌM KIẾM (BÊN TRÁI) ──────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterRx, setFilterRx] = useState("ALL");

  // ─── STATE MODAL CHI TIẾT THUỐC ────────────────────────────────────────
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ─── STATE PHIẾU NHẬP HÀNG (BÊN PHẢI) ──────────────────────────────────
  const [items, setItems] = useState([]);

  const todayString = new Date().toLocaleDateString("vi-VN");
  const todayISOString = new Date().toISOString().split("T")[0];

  // Tìm ID của Kho Tổng để lọc tồn kho
  const warehouseBranch = branches.find((b) => b.type === "warehouse");
  const warehouseId = warehouseBranch?._id;

  // ─── TẢI DỮ LIỆU TỪ BACKEND KHI KHỞI CHẠY ──────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [medRes, varRes, catRes, invRes, branchRes] = await Promise.all([
          api.get("/medicines"),
          api.get("/medicines/variants"),
          api.get("/categories"),
          api.get("/inventories"),
          api.get("/branches"),
        ]);
        setMedicines(medRes.data?.data || medRes.data || []);
        setAllVariants(varRes.data?.data || varRes.data || []);
        setCategories(catRes.data?.data || catRes.data || []);
        setInventories(invRes.data?.data || invRes.data || []);
        setBranches(branchRes.data?.data || branchRes.data || []);
      } catch (error) {
        console.error("Lỗi tải dữ liệu hệ thống:", error);
      }
    };
    loadInitialData();
  }, []);

  // ─── XỬ LÝ LỌC THUỐC ĐA TIÊU CHÍ (DANH SÁCH BÊN TRÁI) ───────────────────
  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.ingredients &&
        med.ingredients.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "" ||
      med.categoryId?._id === selectedCategory ||
      med.categoryId === selectedCategory;

    const matchesRx =
      filterRx === "ALL" ||
      (filterRx === "RX" && med.isPrescription === true) ||
      (filterRx === "NON_RX" && med.isPrescription === false);

    return matchesSearch && matchesCategory && matchesRx;
  });

  // Mở modal xem thông tin chi tiết thuốc
  const handleOpenDetailModal = (medicine) => {
    setSelectedMedicine(medicine);
    setIsModalOpen(true);
  };

  // ─── LOGIC THÊM THUỐC VÀO PHIẾU NHẬP ────────────────────────
  const handleSelectVariantToImport = (medicine, variant) => {
    const isExist = items.some(
      (item) => item.variantId === variant._id && item.batchSelection === "NEW",
    );

    // if (isExist) {
    //   alert(
    //     `Sản phẩm ${variant.name} đang có dòng chờ điền thông tin lô mới trong phiếu nhập.`,
    //   );
    //   return;
    // }

    const newItem = {
      medicineId: medicine._id,
      medicineName: medicine.name,
      medicineCode: medicine.code,
      variantId: variant._id,
      variantName: variant.name,
      unit: variant.unit,
      conversionRate: variant.conversionRate || 1,
      batchSelection: "NEW", // NEW hoặc mã lô cụ thể
      batchCode: "",
      manufacturingDate: "",
      expiryDate: "",
      quantity: 1,
      price: "", // Khởi tạo rỗng để người dùng bắt buộc nhập giá nhập (không lấy currentPrice giá bán)
    };

    setItems([...items, newItem]);
    setIsModalOpen(false); // Đóng modal nếu gọi từ modal
  };

  // ─── CÁC HÀM THAO TÁC TRÊN PHIẾU NHẬP ──────────────────────────────────
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleBatchSelection = (index, batchCodeValue, availableBatches) => {
    const newItems = [...items];
    newItems[index].batchSelection = batchCodeValue;

    if (batchCodeValue === "NEW") {
      newItems[index].batchCode = "";
      newItems[index].manufacturingDate = "";
      newItems[index].expiryDate = "";
    } else {
      const selectedBatch = availableBatches.find(
        (b) => b.batchCode === batchCodeValue,
      );
      if (selectedBatch) {
        newItems[index].batchCode = selectedBatch.batchCode;
        newItems[index].manufacturingDate = selectedBatch.manufacturingDate
          ? new Date(selectedBatch.manufacturingDate)
              .toISOString()
              .split("T")[0]
          : "";
        newItems[index].expiryDate = selectedBatch.expiryDate
          ? new Date(selectedBatch.expiryDate).toISOString().split("T")[0]
          : "";
      }
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách nhập?")) {
      setItems([]);
    }
  };

  // Tính tổng tiền dựa trên số lượng và giá trị người dùng vừa gõ
  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0,
  );

  // ─── LOGIC IN PHIẾU PDF ───────────────────────────────────────────────
  const generatePDF = async (transaction) => {
    const toName =
      branches.find((b) => b._id === user?.branchId)?.name || "Kho Tổng";
    const txDate = new Date(transaction.createdAt).toLocaleString("vi-VN");

    let totalVal = 0;
    let htmlRows = "";

    transaction.details.forEach((item, idx) => {
      const variant = allVariants.find((v) => v._id === item.variantId);
      const name = variant ? variant.name : "Sản phẩm không rõ";
      const unit = variant ? variant.unit : "---";
      const expiry = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
        : "---";

      const itemTotal = (item.quantity || 0) * (item.price || 0);
      totalVal += itemTotal;

      htmlRows += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${name}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.batchCode || "---"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${expiry}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${unit}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.price || 0).toLocaleString("vi-VN")}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">${itemTotal.toLocaleString("vi-VN")}</td>
        </tr>
      `;
    });

    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 30px; color: #000; width: 1000px; margin: 0 auto; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">HỆ THỐNG PHARMA APP</h3>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị giao (NCC): <strong>${supplierName}</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị nhận: <strong>${toName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">Mã phiếu: ${transaction.code}</p>
            <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${txDate}</p>
          </div>
        </div>

        <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">PHIẾU NHẬP KHO</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #000; padding: 10px; width: 5%;">STT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 30%;">Tên hàng hóa</th>
              <th style="border: 1px solid #000; padding: 10px; width: 12%;">Số lô</th>
              <th style="border: 1px solid #000; padding: 10px; width: 12%;">Hạn SD</th>
              <th style="border: 1px solid #000; padding: 10px; width: 8%;">ĐVT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 8%;">S.Lượng</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Đơn giá</th>
              <th style="border: 1px solid #000; padding: 10px; width: 15%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; text-transform: uppercase;">Cộng thành tiền:</td>
              <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">${totalVal.toLocaleString("vi-VN")} đ</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px;">
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người lập phiếu</strong>
            <span>${user?.fullName || "Hệ thống"}</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người giao hàng</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Thủ kho nhận</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Giám đốc</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
        </div>
      </div>
    `;

    const printDiv = document.createElement("div");
    printDiv.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `${transaction.code}_${new Date().getTime()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await html2pdf().set(opt).from(printDiv).save();
  };

  // ─── LOGIC LƯU PHIẾU NHẬP ────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      alert("Vui lòng nhập tên Nhà cung cấp.");
      return;
    }

    if (items.length === 0) {
      alert("Phiếu nhập phải có ít nhất 1 mặt hàng.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const finalBatchCode =
        item.batchSelection === "NEW" ? item.batchCode : item.batchSelection;

      if (!finalBatchCode.trim()) {
        alert(`Dòng số ${i + 1}: Vui lòng điền Mã Lô.`);
        return;
      }
      if (!item.manufacturingDate || !item.expiryDate) {
        alert(
          `Dòng số ${i + 1}: Vui lòng điền đầy đủ Ngày sản xuất & Hạn sử dụng.`,
        );
        return;
      }
      if (item.price === "" || Number(item.price) <= 0) {
        alert(`Dòng số ${i + 1}: Vui lòng điền Giá Nhập hợp lệ (lớn hơn 0).`);
        return;
      }
      const mfgDate = new Date(item.manufacturingDate);
      const expDate = new Date(item.expiryDate);
      if (mfgDate > today) {
        alert(`Dòng số ${i + 1}: Ngày sản xuất không được ở tương lai.`);
        return;
      }
      if (expDate <= mfgDate) {
        alert(`Dòng số ${i + 1}: Ngày sản xuất phải nhỏ hơn Hạn sử dụng.`);
        return;
      }
      if (expDate <= today) {
        alert(`Dòng số ${i + 1}: Lô thuốc này đã hết hạn sử dụng!`);
        return;
      }
      if (item.quantity <= 0) {
        alert(`Dòng số ${i + 1}: Số lượng nhập phải lớn hơn 0.`);
        return;
      }
    }

    try {
      // SỬA TỪ 'details' THÀNH 'items' Ở ĐÂY ĐỂ ĐỒNG BỘ VỚI BACKEND
      const payload = {
        supplierName: supplierName.trim(),
        items: items.map((item) => ({
          variantId: item.variantId,
          batchCode:
            item.batchSelection === "NEW"
              ? item.batchCode.trim().toUpperCase()
              : item.batchSelection,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quantity: Number(item.quantity),
          price: Number(parseFloat(item.price).toFixed(2)), // Đồng bộ format giá như bản cũ
        })),
      };

      const res = await api.post("/transactions/import-supplier", payload);

      if (res.data?.success || res.success) {
        const wantToPrint = window.confirm(
          "Nhập hàng thành công! Bạn có muốn in PHIẾU NHẬP KHO không?",
        );
        if (wantToPrint && (res.data?.transaction || res.transaction)) {
          await generatePDF(res.data?.transaction || res.transaction);
        }
        setItems([]);
        setSupplierName("");
        navigate("/inventory");
      } else {
        alert(res.data?.message || "Có lỗi xảy ra khi nhập hàng.");
      }
    } catch (error) {
      console.error("Lỗi gửi dữ liệu nhập kho:", error);
      alert(error.response?.data?.message || "Lỗi kết nối máy chủ.");
    }
  };

  const inputBase =
    "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800 bg-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50 read-only:text-slate-500 read-only:font-bold";

  return (
    <div
      className="flex flex-col h-[calc(100vh-10px)] bg-gradient-to-br from-sky-50 via-blue-50
      to-slate-50 p-6 font-sans"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        /* HIỆU ỨNG FLOAT BAY LÊN (FADE UP) CHO TOÀN BỘ TRANG */
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-up {
          animation: floatUp 0.5s ease-out forwards;
        }

        /* Hiệu ứng Fade In cho Modal */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4 shrink-0 animate-float-up">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
            boxShadow: "0 4px 14px rgba(14, 165, 233, 0.3)",
          }}>
          <PackageCheck size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Nhập Hàng Từ Nhà Cung Cấp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tạo phiếu nhập kho mới vào Kho Tổng
          </p>
        </div>
      </div>

      {/* WORKSPACE CHIA LÀM 2 PHẦN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden animate-float-up">
        {/* ==================== PHẦN BÊN TRÁI: DANH SÁCH THUỐC ==================== */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pill
                size={16}
                className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5"
              />{" "}
              Tìm & Chọn Thuốc
            </h2>

            {/* Thanh tìm kiếm nâng cao */}
            <div className="relative mb-3">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Tìm theo tên thuốc, mã, hoạt chất..."
                className="w-full pl-10 pr-4 py-2.5 bg-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bộ lọc đa tiêu chí */}
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-600 focus:border-sky-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-600 focus:border-sky-500"
                value={filterRx}
                onChange={(e) => setFilterRx(e.target.value)}>
                <option value="ALL">Tất cả phân loại</option>
                <option value="RX">Thuốc kê đơn (Rx)</option>
                <option value="NON_RX">Không kê đơn</option>
              </select>
            </div>
          </div>

          {/* Khối hiển thị danh sách thuốc (Có nút chọn quy cách ra ngoài) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30 scrollbar-thin">
            {filteredMedicines.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                Không tìm thấy loại thuốc nào phù hợp.
              </div>
            ) : (
              filteredMedicines.map((med) => {
                const medVariants = allVariants.filter(
                  (v) =>
                    v.medicineId?._id === med._id || v.medicineId === med._id,
                );

                return (
                  <div
                    key={med._id}
                    className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-sky-500 hover:shadow-md transition-all duration-200 flex flex-col">
                    {/* Phần top: Click mở Modal chi tiết */}
                    <div
                      className="flex justify-between items-start mb-2 cursor-pointer group"
                      onClick={() => handleOpenDetailModal(med)}>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {med.code}
                          </span>
                          {med.isPrescription && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100">
                              Rx
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-sky-600 transition-colors">
                          {med.name}
                        </h3>
                        <p
                          className="text-xs text-slate-400 truncate mt-0.5"
                          title={med.ingredients}>
                          Hoạt chất: {med.ingredients || "---"}
                        </p>
                      </div>
                      <div
                        className="shrink-0 p-1.5 bg-slate-50 group-hover:bg-sky-50 text-slate-400 group-hover:text-sky-600 rounded-lg transition-colors"
                        title="Xem chi tiết">
                        <Info size={16} />
                      </div>
                    </div>

                    {/* Danh sách quy cách (Biến thể) - Đã cập nhật hiển thị Tồn kho Kho tổng */}
                    <div className="mt-1 pt-2 border-t border-slate-100 space-y-1.5">
                      {medVariants.length === 0 ? (
                        <p className="text-[11px] text-amber-500 italic">
                          Chưa cấu hình đơn vị bán.
                        </p>
                      ) : (
                        medVariants.map((variant) => {
                          // Tự động tìm kho tổng để lọc số lượng tồn
                          const medInv = inventories.find(
                            (inv) =>
                              (inv.medicineId === med._id ||
                                inv.medicineId?._id === med._id) &&
                              (!inv.branchId ||
                                inv.branchId === warehouseId ||
                                inv.branchId?._id === warehouseId),
                          );
                          const totalBaseQty = medInv
                            ? medInv.totalQuantity
                            : 0;
                          const variantQty = Math.floor(
                            totalBaseQty / (variant.conversionRate || 1),
                          );

                          return (
                            <div
                              key={variant._id}
                              className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-sky-200 transition-colors">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-semibold text-slate-700 block line-clamp-1">
                                  {variant.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  ĐV: {variant.unit} (
                                  {variant.packagingSpecification ||
                                    "Chưa cập nhật"}
                                  ){" "}
                                  <span className="mx-1 text-slate-300">|</span>{" "}
                                  Tồn:{" "}
                                  <span
                                    className={`font-bold ${variantQty === 0 ? "text-red-500" : "text-sky-600"}`}>
                                    {" "}
                                    {variantQty}
                                  </span>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Ngăn chặn sự kiện click mở modal
                                  handleSelectVariantToImport(med, variant);
                                }}
                                className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1.5 rounded-md hover:bg-sky-600 hover:text-white transition-colors border border-sky-100 hover:border-sky-600">
                                <Plus size={12} strokeWidth={3} /> Chọn
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== PHẦN BÊN PHẢI: GIAO DIỆN PHIẾU NHẬP THUỐC ==================== */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
          {/* Thông tin nhà cung cấp và Header phiếu */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            {/* Box Thông Tin Phiếu: Ngày Lập, Nhân Viên, Vị Trí Nhập (Cùng 1 hàng ngang) */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <CalendarDays size={14} /> Ngày lập:
                </span>
                <span className="font-bold text-slate-800">{todayString}</span>
              </div>
              <div className="w-px h-4 bg-slate-200 hidden md:block"></div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <User size={14} /> Nhân viên:
                </span>
                <span className="font-bold text-slate-800">
                  {user?.fullName || "Hệ thống"}
                </span>
              </div>
              <div className="w-px h-4 bg-slate-200 hidden md:block"></div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Store size={14} /> Vị trí nhập:
                </span>
                <span className="font-bold text-slate-800">
                  {branches.find((b) => b._id === user?.branchId)?.name ||
                    "Kho Tổng"}
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Box Nhà Cung Cấp */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tên Nhà Cung Cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Dược Hậu Giang, Pymepharco..."
                  className="w-full px-3 py-2 text-sm outline-none border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-semibold text-slate-800"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Dải tiêu đề của Bảng chi tiết mặt hàng */}
          <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-sky-600" />
              <span className="text-sm font-bold text-slate-700">
                Chi tiết nhập hàng ({items.length})
              </span>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors">
                <Trash2 size={14} /> Xóa tất cả
              </button>
            )}
          </div>

          {/* Bảng chi tiết các cột thuộc tính phiếu nhập dữ liệu tự động wrap responsive */}
          <div className="flex-1 overflow-auto p-4 bg-slate-50/30 scrollbar-thin">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-10">
                <Tag size={40} className="text-slate-200" />
                <p className="text-sm font-medium text-slate-500">
                  Chưa có sản phẩm nào trong phiếu.
                </p>
                <p className="text-xs text-slate-400">
                  Chọn quy cách thuốc ở danh sách bên trái để thêm vào phiếu.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                {items.map((item, index) => {
                  // Chỉ lấy lượng lô tồn tại Kho Tổng cho dropdown chọn lô
                  const medInventory = inventories.find(
                    (inv) =>
                      (inv.medicineId === item.medicineId ||
                        inv.medicineId?._id === item.medicineId) &&
                      (!inv.branchId ||
                        inv.branchId === warehouseId ||
                        inv.branchId?._id === warehouseId),
                  );

                  let availableBatches = [];
                  if (medInventory && medInventory.batches) {
                    const batchMap = new Map();
                    medInventory.batches.forEach((b) => {
                      if (batchMap.has(b.batchCode)) {
                        // Nếu đã tồn tại mã lô này trong Map, cộng dồn số lượng
                        batchMap.get(b.batchCode).quantity += b.quantity;
                      } else {
                        // Nếu chưa có, thêm mới (sao chép ra object mới để không ảnh hưởng dữ liệu gốc)
                        batchMap.set(b.batchCode, { ...b });
                      }
                    });
                    availableBatches = Array.from(batchMap.values());
                  }

                  const isExistingBatch = item.batchSelection !== "NEW";

                  return (
                    <div
                      key={`${item.variantId}-${index}`}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-sky-300 transition-colors">
                      <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {item.variantName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mã thuốc: {item.medicineCode} | ĐV: {item.unit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="Xóa dòng">
                          <X size={16} />
                        </button>
                      </div>

                      {/* Sử dụng Responsive Grid linh hoạt */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {/* Chọn Lô - Hiển thị kèm lượng tồn quy đổi */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Loại Lô
                          </label>
                          <select
                            value={item.batchSelection}
                            onChange={(e) =>
                              handleBatchSelection(
                                index,
                                e.target.value,
                                availableBatches,
                              )
                            }
                            className={inputBase}>
                            <option value="NEW">➕ Tạo Lô Mới</option>
                            {availableBatches.map((b) => {
                              const batchVariantQty = Math.floor(
                                b.quantity / (item.conversionRate || 1),
                              );
                              return (
                                <option key={b.batchCode} value={b.batchCode}>
                                  Lô: {b.batchCode} - Tồn: {batchVariantQty}{" "}
                                  {item.unit}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Mã Lô */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Mã Lô <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Mã Lô..."
                            readOnly={isExistingBatch}
                            className={`${inputBase} uppercase font-bold ${isExistingBatch ? "bg-slate-50 text-slate-500" : "text-slate-800"}`}
                            value={item.batchCode}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "batchCode",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {/* NSX */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Ngày SX <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            max={todayISOString}
                            readOnly={isExistingBatch}
                            className={`${inputBase} ${isExistingBatch ? "bg-slate-50 text-slate-500" : ""}`}
                            value={item.manufacturingDate}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "manufacturingDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {/* HSD */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Hạn SD <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            min={item.manufacturingDate || todayISOString}
                            readOnly={isExistingBatch}
                            className={`${inputBase} ${isExistingBatch ? "bg-slate-50 text-slate-500" : ""}`}
                            value={item.expiryDate}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "expiryDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {/* Số lượng */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Số Lượng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            className={`${inputBase} text-center font-extrabold text-sky-600 text-sm`}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                Math.max(1, parseInt(e.target.value) || 1),
                              )
                            }
                          />
                        </div>

                        {/* Giá Nhập */}
                        <div>
                          <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-wide mb-1">
                            Giá Nhập (đ) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            required
                            placeholder="Nhập giá"
                            className={`${inputBase} text-right font-extrabold text-rose-600 text-sm focus:border-rose-400 focus:ring-rose-100`}
                            value={item.price}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "price",
                                e.target.value === ""
                                  ? ""
                                  : Math.max(0, parseFloat(e.target.value)),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER: HIỂN THỊ TỔNG TIỀN VÀ NÚT LƯU PHIẾU CHỐT SỐ LIỆU */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm text-slate-600 font-bold uppercase tracking-wide">
                Tổng tiền phiếu nhập:
              </span>
              <span className="text-xl font-black text-rose-600 tracking-tight">
                {totalValue.toLocaleString()}{" "}
                <span className="text-sm font-bold ml-0.5 text-rose-500">
                  đ
                </span>
              </span>
            </div>

            <button
              type="submit"
              disabled={items.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  items.length > 0
                    ? "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)"
                    : "#94a3b8",
                boxShadow:
                  items.length > 0
                    ? "0 4px 14px rgba(14, 165, 233, 0.3)"
                    : "none",
              }}>
              <Save size={18} />
              Hoàn Tất Nhập Kho
            </button>
          </div>
        </form>
      </div>

      {/* ==================== DIALOG MODAL: CHI TIẾT THUỐC ==================== */}
      {isModalOpen && selectedMedicine && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
                  <Pill size={16} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-base leading-tight">
                    Thông Tin Chi Tiết Thuốc
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mã thuốc hệ thống:{" "}
                    <span className="font-bold text-slate-600">
                      {selectedMedicine.code}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-slate-700">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Tên thuốc gốc
                </p>
                <p className="font-bold text-slate-800 text-base mt-0.5">
                  {selectedMedicine.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Phân loại đơn
                  </p>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {selectedMedicine.isPrescription ? (
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        Thuốc Kê Đơn (Rx)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Thuốc Không Kê Đơn
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Đơn vị cơ sở gốc
                  </p>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {selectedMedicine.baseUnit || "Viên"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Đơn vị cơ sở gốc
                  </p>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {selectedMedicine.baseUnit || "Viên"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Thành phần / Hoạt chất chính
                </p>
                <p className="font-medium text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                  {selectedMedicine.ingredients ||
                    "Chưa cập nhật dữ liệu hoạt chất lâm sàng."}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Hãng / Nhà sản xuất
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedMedicine.manufacturer || "Chưa rõ nguồn gốc xuất xứ"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSupplier;
