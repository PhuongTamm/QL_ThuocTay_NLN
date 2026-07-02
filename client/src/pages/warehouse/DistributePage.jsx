import {
  AlertCircle,
  ArrowRightLeft,
  Plus,
  Save,
  Search,
  Store,
  Trash,
  Trash2,
  Undo2,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import html2pdf from "html2pdf.js";

const DistributePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("DISTRIBUTE");
  const [allBranches, setAllBranches] = useState([]); // Chứa TẤT CẢ kho/nhánh để lấy tên khi in phiếu
  const [branches, setBranches] = useState([]); // Chỉ chứa chi nhánh để chọn
  const [toBranchId, setToBranchId] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [items, setItems] = useState([
    {
      medicineId: "",
      medicineSearchTerm: "",
      isMedicineDropdownOpen: false,
      variantId: "",
      batchCode: "",
      batchId: "",
      reason: "OVERSTOCK",
      quantity: 1,
    },
  ]);

  useEffect(() => {
    fetchBaseData();
  }, []);
  useEffect(() => {
    fetchInventoryForMode();
  }, [mode]);

  const fetchBaseData = async () => {
    try {
      const [branchRes, medRes, varRes] = await Promise.all([
        api.get("/branches"),
        api.get("/medicines"),
        api.get("/medicines/variants"),
      ]);
      const fetchedBranches = branchRes.data.data || [];
      setAllBranches(fetchedBranches);
      setBranches(fetchedBranches.filter((b) => b.type !== "warehouse"));
      setMedicines(medRes.data.data || []);
      setAllVariants(varRes.data.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu nền", err);
    }
  };

  const fetchInventoryForMode = async () => {
    try {
      const branchQuery =
        (mode === "RETURN" || mode === "DISPOSE") && user.branchId
          ? `?branchId=${user.branchId}`
          : "";
      const invRes = await api.get(`/inventories${branchQuery}`);
      setInventories(invRes.data.data || []);
      setItems([
        {
          medicineId: "",
          medicineSearchTerm: "",
          isMedicineDropdownOpen: false,
          variantId: "",
          batchCode: "",
          batchId: "",
          reason: "OVERSTOCK",
          quantity: 1,
        },
      ]);
    } catch (err) {
      console.error("Lỗi tải tồn kho", err);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === "medicineSearchTerm") {
      newItems[index].isMedicineDropdownOpen = true;
      newItems[index].medicineId = "";
      newItems[index].variantId = "";
      newItems[index].batchCode = "";
      newItems[index].batchId = "";
    }
    setItems(newItems);
  };

  const handleSelectMedicine = (index, medicine) => {
    const newItems = [...items];
    newItems[index].medicineId = medicine._id;
    newItems[index].medicineSearchTerm = medicine.name;
    newItems[index].isMedicineDropdownOpen = false;
    newItems[index].variantId = "";
    newItems[index].batchCode = "";
    newItems[index].batchId = "";
    setItems(newItems);
  };

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));
  const addItemRow = () =>
    setItems([
      ...items,
      {
        medicineId: "",
        medicineSearchTerm: "",
        isMedicineDropdownOpen: false,
        variantId: "",
        batchCode: "",
        batchId: "",
        reason: "OVERSTOCK",
        quantity: 1,
      },
    ]);

  /* ─── LOGIC IN PHIẾU PDF ─── */
  const generatePDF = async (transaction, currentMode, targetBranchId) => {
    // 1. Xác định tên người Gửi / Nhận
    let fromName = "Kho Tổng";
    let toName = "Kho Tổng";

    if (currentMode === "DISTRIBUTE") {
      fromName =
        allBranches.find((b) => b._id === user.branchId)?.name || "Kho Tổng";
      toName =
        allBranches.find((b) => b._id === targetBranchId)?.name ||
        "Chi nhánh...";
    } else if (currentMode === "RETURN") {
      fromName =
        allBranches.find((b) => b._id === user.branchId)?.name ||
        "Chi nhánh...";
      toName = "Kho Tổng";
    }

    const title =
      currentMode === "DISTRIBUTE"
        ? "PHIẾU XUẤT KHO"
        : "PHIẾU TRẢ HÀNG VỀ KHO TỔNG";
    const txDate = new Date(transaction.createdAt).toLocaleString("vi-VN");

    // 2. Tạo HTML cho các dòng hàng hóa
    let totalValue = 0;
    let htmlRows = "";

    transaction.details.forEach((item, idx) => {
      const variant = allVariants.find((v) => v._id === item.variantId);
      const name = variant ? variant.name : "Sản phẩm không rõ";
      const unit = variant ? variant.unit : "---";
      const expiry = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
        : "---";

      const itemTotal = (item.quantity || 0) * (item.price || 0);
      totalValue += itemTotal;

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

    // 3. Lắp ráp HTML Khung Phiếu
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 30px; color: #000; width: 1000px; margin: 0 auto; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">HỆ THỐNG PHARMA APP</h3>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị xuất: <strong>${fromName}</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị nhận: <strong>${toName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">Mã phiếu: ${transaction.code}</p>
            <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${txDate}</p>
          </div>
        </div>

        <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">${title}</h2>

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
              <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">${totalValue.toLocaleString("vi-VN")} đ</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px;">
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người lập phiếu</strong>
            <span>${user?.fullName || "Hệ thống"}</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người nhận</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Thủ kho xuất</strong>
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
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }, // In ngang để bảng rộng rãi
    };

    await html2pdf().set(opt).from(printDiv).save();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Ràng buộc: Kho tổng KHÔNG thể tự trả hàng
      if (mode === "RETURN") {
        if (
          !user.branchId ||
          user.role === "admin" ||
          user.role === "warehouse_manager"
        ) {
          return alert(
            "Lỗi: Kho tổng không thể thao tác trả hàng về chính Kho tổng!",
          );
        }
      }

      if (mode === "DISTRIBUTE" && !toBranchId)
        return alert("Vui lòng chọn chi nhánh nhận hàng!");

      for (let i = 0; i < items.length; i++) {
        if (!items[i].medicineId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
        if (!items[i].variantId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
        if ((mode === "RETURN" || mode === "DISPOSE") && !items[i].batchId)
          return alert(`Dòng thứ ${i + 1}: Vui lòng chọn Mã lô cần thao tác!`);
        if (items[i].quantity <= 0)
          return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);
      }

      const payloadItems = items.map((item) => ({
        variantId: item.variantId,
        batchCode: mode !== "DISTRIBUTE" ? item.batchCode : undefined,
        batchId: mode !== "DISTRIBUTE" ? item.batchId : undefined,
        reason: mode !== "DISTRIBUTE" ? item.reason : undefined,
        quantity: Number(item.quantity),
      }));

      let endpoint = "/transactions/distribute";
      if (mode === "RETURN") endpoint = "/transactions/return";
      if (mode === "DISPOSE") endpoint = "/transactions/dispose";

      const response = await api.post(endpoint, {
        toBranchId: mode === "DISTRIBUTE" ? toBranchId : undefined,
        items: payloadItems,
      });

      if (response?.data?.success) {
        // Hỏi in phiếu sau khi thành công (Áp dụng cho Xuất đi và Trả về)
        if (mode === "DISTRIBUTE" || mode === "RETURN") {
          const wantToPrint = window.confirm(
            `Giao dịch thành công! Bạn có muốn in ${mode === "RETURN" ? "PHIẾU TRẢ HÀNG" : "PHIẾU XUẤT KHO"} không?`,
          );
          if (wantToPrint && response.data.transaction) {
            await generatePDF(response.data.transaction, mode, toBranchId);
          }
        } else {
          alert("Giao dịch xuất hủy thành công!");
        }

        navigate("/inventory");
      } else {
        alert(response.message || "Đã có lỗi xảy ra!");
      }
    } catch (error) {
      alert(
        "Lỗi giao dịch: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const themes = {
    DISTRIBUTE: {
      icon: <ArrowRightLeft size={22} color="white" />,
      gradient: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
      shadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
      bannerBg: "bg-[#1d5fa7]/5",
      bannerBorder: "border-[#1d5fa7]/20",
      rowHover: "hover:border-[#1d5fa7]/30 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
      submitShadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
      addBtn: "text-[#1d5fa7] border-[#1d5fa7]/40 hover:bg-[#1d5fa7]/5",
      title: "Luân Chuyển Xuất Kho",
      subtitle: "Phân phối hàng hóa từ Kho tổng đến các Chi nhánh",
      submitLabel: "Hoàn tất",
      addLabel: "Thêm dòng mặt hàng",
      focusRing: "focus:border-[#1d5fa7] focus:ring-[#1d5fa7]/20",
      textPrimary: "text-[#1d5fa7]",
    },
    RETURN: {
      icon: <Undo2 size={22} color="white" />,
      gradient: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
      shadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
      bannerBg: "bg-[#1d5fa7]/5",
      bannerBorder: "border-[#1d5fa7]/20",
      rowHover: "hover:border-[#1d5fa7]/30 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
      submitShadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
      addBtn: "text-[#1d5fa7] border-[#1d5fa7]/40 hover:bg-[#1d5fa7]/5",
      title: "Trả Hàng Về Kho Tổng",
      subtitle: "Gửi trả hàng cận date, bán chậm về lại Kho tổng",
      submitLabel: "Hoàn tất",
      addLabel: "Thêm dòng hàng trả về",
      focusRing: "focus:border-[#1d5fa7] focus:ring-[#1d5fa7]/20",
      textPrimary: "text-[#1d5fa7]",
    },
    DISPOSE: {
      icon: <Trash size={22} color="white" />,
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      shadow: "0 4px 14px rgba(239,68,68,.35)",
      bannerBg: "bg-red-50/50",
      bannerBorder: "border-red-200",
      rowHover: "hover:border-red-300 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
      submitShadow: "0 4px 14px rgba(239,68,68,.35)",
      addBtn: "text-[#dc2626] border-red-300 hover:bg-red-50",
      title: "Lập Phiếu Xuất Hủy",
      subtitle: "Hủy bỏ hàng hóa hết hạn, hư hỏng (Ghi nhận vào tổn thất)",
      submitLabel: "Chốt Phiếu Xuất Hủy",
      addLabel: "Thêm dòng hàng hủy",
      focusRing: "focus:border-red-500 focus:ring-red-500/20",
      textPrimary: "text-red-600",
    },
  };
  const t = themes[mode];

  const inputBase = `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-sm text-slate-800 bg-white outline-none transition ${t.focusRing} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-400`;
  const labelBase =
    "block text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-500";

  return (
    <div
      className="cat-root min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 p-6"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }
      `}</style>

      <div className="animate-page-in space-y-6">
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{
              background: t.gradient,
              boxShadow: t.shadow,
            }}>
            {t.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {t.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* ── Mode Tabs (Giống giao diện Branch Management) ── */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 mb-4 w-fit">
          {[
            { key: "DISTRIBUTE", label: "Xuất đi" },
            { key: "RETURN", label: "Trả về" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === key
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
              style={
                mode === key
                  ? { background: "linear-gradient(135deg, #1d5fa7, #2c78d6)" }
                  : {}
              }>
              {label}
            </button>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ── Banner Info ── */}
          <div
            className={`${t.bannerBg} border-b ${t.bannerBorder} px-6 py-4 flex items-start gap-3`}>
            <div>
              {mode === "DISTRIBUTE" ? (
                <div className="max-w-sm">
                  <label className={`${labelBase} text-slate-600`}>
                    Chọn chi nhánh nhận hàng{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className={inputBase}>
                    <option value="">-- Chọn --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        Chi nhánh: {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : mode === "RETURN" ? (
                <>
                  <p className="text-sm font-bold text-[#1d5fa7] mb-1">
                    Nơi nhận: Kho Tổng
                  </p>
                  <p className="text-xs text-[#12427a] leading-relaxed">
                    Hàng hóa trả về sẽ được chuyển vào khu vực chờ kiểm duyệt.
                    Hàng lỗi/cận date sẽ không được phân phối lại.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#b91c1c] mb-1">
                    Lưu ý nghiệp vụ Hủy hàng
                  </p>
                  <p className="text-xs text-[#991b1b] leading-relaxed">
                    Phiếu xuất hủy sẽ trừ vĩnh viễn số lượng tồn kho và hạch
                    toán vào <strong>Chi phí tổn thất</strong>.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit}>
            <div className="p-5">
              {/* Section Label */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Layers size={14} className="text-slate-500" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Danh sách mặt hàng
                </span>
                <span className="bg-slate-100 text-slate-500 text-[11px] font-bold rounded-md px-2 py-0.5">
                  {items.length} dòng
                </span>
              </div>

              {/* ── Item Rows ── */}
              <div className="flex flex-col gap-3">
                {items.map((item, index) => {
                  const searchedMedicines = medicines.filter(
                    (m) =>
                      m.name
                        .toLowerCase()
                        .includes(item.medicineSearchTerm.toLowerCase()) ||
                      m.code
                        .toLowerCase()
                        .includes(item.medicineSearchTerm.toLowerCase()),
                  );
                  const filteredVariants = allVariants.filter(
                    (v) =>
                      v.medicineId === item.medicineId ||
                      v.medicineId?._id === item.medicineId,
                  );
                  const medInventory = inventories.find(
                    (inv) =>
                      inv.medicineId === item.medicineId ||
                      inv.medicineId?._id === item.medicineId,
                  );
                  const baseUnit = medInventory
                    ? medInventory.medicineId.baseUnit
                    : "đ.vị";

                  const activeBatches = medInventory
                    ? medInventory.batches.filter((b) => {
                        if (b.quantity <= 0) return false;
                        if (mode === "DISTRIBUTE") {
                          const today = new Date();
                          return (
                            b.quality === "GOOD" &&
                            new Date(b.expiryDate) > today
                          );
                        }
                        return true;
                      })
                    : [];

                  const totalValidBaseQty = activeBatches.reduce(
                    (sum, b) => sum + b.quantity,
                    0,
                  );

                  return (
                    <div
                      key={index}
                      className={`bg-white border border-slate-200 rounded-xl p-4 transition-all duration-200 ${t.rowHover}`}>
                      {/* Row number badge & delete */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-[11px] font-bold text-slate-400">
                          {index + 1}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all duration-150">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* ── ROW GRID ── */}
                      <div className="grid grid-cols-12 gap-3">
                        {/* 1. TÌM THUỐC */}
                        <div
                          className={`col-span-12 ${mode === "DISTRIBUTE" ? "md:col-span-5" : "md:col-span-4"}`}>
                          <div className="relative">
                            <label className={labelBase}>
                              Tìm & Chọn Thuốc
                            </label>
                            <div className="relative">
                              <Search
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              />
                              <input
                                type="text"
                                required
                                placeholder="Nhập tên hoặc mã..."
                                value={item.medicineSearchTerm}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "medicineSearchTerm",
                                    e.target.value,
                                  )
                                }
                                onFocus={() =>
                                  handleItemChange(
                                    index,
                                    "isMedicineDropdownOpen",
                                    true,
                                  )
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      handleItemChange(
                                        index,
                                        "isMedicineDropdownOpen",
                                        false,
                                      ),
                                    200,
                                  )
                                }
                                className={`${inputBase} pl-8`}
                              />
                            </div>

                            {/* Dropdown Thuốc */}
                            {item.isMedicineDropdownOpen && (
                              <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto">
                                {searchedMedicines.length > 0 ? (
                                  searchedMedicines.map((m) => (
                                    <li
                                      key={m._id}
                                      onMouseDown={() =>
                                        handleSelectMedicine(index, m)
                                      }
                                      className="px-3 py-2.5 cursor-pointer border-b border-slate-50 hover:bg-[#1d5fa7]/5 transition-colors last:border-0 flex justify-between items-center">
                                      <span className="font-medium text-slate-800 text-[13px]">
                                        {m.name}
                                      </span>
                                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                        {m.code}
                                      </span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="px-3 py-3.5 text-center text-[13px] text-slate-400 italic">
                                    Không tìm thấy thuốc
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>

                          {/* Tồn kho info */}
                          {item.medicineId && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  {mode === "DISTRIBUTE"
                                    ? "Tồn kho hợp lệ:"
                                    : "Tổng tồn kho:"}
                                </span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                    totalValidBaseQty > 0
                                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                      : "text-red-700 bg-red-50 border-red-200"
                                  }`}>
                                  {totalValidBaseQty} {baseUnit}
                                </span>
                              </div>
                              {filteredVariants.length > 0 && (
                                <div className="text-[11px] text-slate-500 italic ml-0.5">
                                  Quy cách:{" "}
                                  <span className="font-semibold text-slate-600">
                                    {(item.variantId
                                      ? filteredVariants.find(
                                          (v) => v._id === item.variantId,
                                        )?.packagingSpecification
                                      : filteredVariants[0]
                                          ?.packagingSpecification) || "..."}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. QUY CÁCH */}
                        <div
                          className={`col-span-6 ${mode === "DISTRIBUTE" ? "md:col-span-4" : "md:col-span-2"}`}>
                          <label className={labelBase}>Quy cách</label>
                          <select
                            required
                            disabled={!item.medicineId}
                            value={item.variantId}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "variantId",
                                e.target.value,
                              )
                            }
                            className={inputBase}>
                            <option value="">-- Chọn --</option>
                            {filteredVariants.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3 & 4. MÃ LÔ VÀ LÝ DO (CHỈ HIỂN THỊ KHI LÀ RETURN/DISPOSE) */}
                        {mode !== "DISTRIBUTE" && (
                          <>
                            <div className="col-span-6 md:col-span-2">
                              <label
                                className={`${labelBase} ${mode === "DISPOSE" ? "text-red-600" : "text-[#1d5fa7]"}`}>
                                Mã Lô
                              </label>
                              <select
                                required
                                disabled={
                                  !item.medicineId || activeBatches.length === 0
                                }
                                value={item.batchId || ""}
                                onChange={(e) => {
                                  const bId = e.target.value;
                                  const selectedBatch = activeBatches.find(
                                    (b) => b._id === bId,
                                  );
                                  const newItems = [...items];
                                  newItems[index].batchId = bId;
                                  newItems[index].batchCode = selectedBatch
                                    ? selectedBatch.batchCode
                                    : "";
                                  setItems(newItems);
                                }}
                                className={inputBase}>
                                <option value="">-- Chọn lô --</option>
                                {activeBatches.map((b) => {
                                  const qualityLabel =
                                    b.quality === "GOOD"
                                      ? "An toàn"
                                      : b.quality === "EXPIRED"
                                        ? "Hết hạn"
                                        : b.quality === "DAMAGED"
                                          ? "Hư hỏng"
                                          : b.quality;
                                  return (
                                    <option key={b._id} value={b._id}>
                                      {b.batchCode} (Tồn {b.quantity}) —{" "}
                                      {qualityLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div className="col-span-6 md:col-span-2">
                              <label
                                className={`${labelBase} ${mode === "DISPOSE" ? "text-red-600" : "text-[#1d5fa7]"}`}>
                                Lý do
                              </label>
                              <select
                                value={item.reason}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "reason",
                                    e.target.value,
                                  )
                                }
                                className={inputBase}>
                                {mode === "RETURN" && (
                                  <option value="OVERSTOCK">
                                    Bán chậm / Quá tồn
                                  </option>
                                )}
                                <option value="EXPIRED">
                                  Cận Date / Hết hạn
                                </option>
                                <option value="DAMAGED">
                                  Hư hỏng / Lỗi NSX
                                </option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* 5. SỐ LƯỢNG */}
                        <div
                          className={`col-span-6 ${mode === "DISTRIBUTE" ? "md:col-span-3" : "md:col-span-2"}`}>
                          <label className={labelBase}>Số lượng</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            className={`${inputBase} text-center font-extrabold text-[15px] ${t.textPrimary}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Row Button */}
              <button
                type="button"
                onClick={addItemRow}
                className={`mt-3 flex items-center gap-2 px-4 py-2.5 bg-transparent border border-dashed rounded-xl text-[13px] font-bold transition-colors duration-200 ${t.addBtn}`}>
                <Plus size={15} strokeWidth={2.5} /> {t.addLabel}
              </button>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-[14px] font-bold transition-all hover:-translate-y-0.5 tracking-wide"
                style={{
                  background: t.submitGradient,
                  boxShadow: t.submitShadow,
                }}>
                <Save size={16} /> {t.submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DistributePage;
