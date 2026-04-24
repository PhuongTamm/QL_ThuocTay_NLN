import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Eye,
  X,
  Store,
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  Receipt,
  Package,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Printer,
  DollarSign,
} from "lucide-react";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import { useAuth } from "../../context/AuthContext";

const TransactionHistoryPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL"); // ALL, TODAY, THIS_MONTH, CUSTOM
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const [selectedTx, setSelectedTx] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State xuất PDF
  const [exportingType, setExportingType] = useState(null); // 'IMPORT_EXPORT' | 'REVENUE' | null

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchHistory();
    api.get("/branches").then((res) => setBranches(res.data.data || []));
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions/history");
      setTransactions(res.data.data || []);
    } catch (error) {
      console.error("Lỗi lấy lịch sử phiếu:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic lọc dữ liệu tổng hợp
  const filteredData = transactions.filter((tx) => {
    // 1. Lọc theo từ khóa (Mã phiếu, tên NCC)
    const matchSearch =
      tx.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.supplierName &&
        tx.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Lọc theo loại phiếu
    const matchType = filterType === "ALL" || tx.type === filterType;

    // 3. Lọc theo thời gian
    let matchDate = true;
    const txDate = new Date(tx.createdAt);
    const today = new Date();

    if (datePreset === "TODAY") {
      matchDate =
        txDate.getDate() === today.getDate() &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear();
    } else if (datePreset === "THIS_MONTH") {
      matchDate =
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear();
    } else if (datePreset === "CUSTOM") {
      const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) {
        matchDate = txDate >= start && txDate <= end;
      } else if (start) {
        matchDate = txDate >= start;
      } else if (end) {
        matchDate = txDate <= end;
      }
    }

    return matchSearch && matchType && matchDate;
  });

  const handleOpenDetail = (tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  /* ─── LOGIC XUẤT PDF CÁC LOẠI BÁO CÁO ─── */
  const handleExportPDF = (reportType) => {
    setExportingType(reportType);

    // 1. CHUẨN BỊ DỮ LIỆU & TIÊU ĐỀ
    let targetData = [];
    let title = "";
    if (reportType === "IMPORT_EXPORT") {
      title = "BÁO CÁO LỊCH SỬ NHẬP / XUẤT KHO";
      targetData = filteredData.filter((tx) => tx.type !== "SALE_AT_BRANCH");
    } else if (reportType === "REVENUE") {
      title = "BÁO CÁO DOANH THU BÁN LẺ TẠI QUẦY";
      targetData = filteredData.filter((tx) => tx.type === "SALE_AT_BRANCH");
    }

    // 2. LẤY THÔNG TIN CƠ BẢN (NGƯỜI LẬP, CHI NHÁNH, THỜI GIAN)
    const exportTime = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const creatorName = user?.fullName || user?.username;
    // Tìm chi nhánh của người dùng hiện tại
    const myBranch = branches.find((b) => b._id === user?.branchId);
    
    const branchName = myBranch
      ? myBranch.type === "warehouse"
        ? `${myBranch.name}`
        : `${myBranch.name}`
      : user?.role === "admin"
        ? "Trung tâm điều hành hệ thống"
        : "---";

    let periodText = "Tất cả thời gian";
    if (datePreset === "TODAY")
      periodText = `${new Date().toLocaleDateString("vi-VN")}`;
    else if (datePreset === "THIS_MONTH")
      periodText = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    else if (datePreset === "CUSTOM") {
      const sDate = dateRange.startDate
        ? new Date(dateRange.startDate).toLocaleDateString("vi-VN")
        : "...";
      const eDate = dateRange.endDate
        ? new Date(dateRange.endDate).toLocaleDateString("vi-VN")
        : "...";
      periodText = `Từ ${sDate} đến ${eDate}`;
    }

    // 3. TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ (NHẬP, HỦY, DOANH THU)
    let totalImportCost = 0;
    let totalDisposalCost = 0;
    let totalRevenueAmount = 0;

    targetData.forEach((tx) => {
      const txTotal = tx.details.reduce(
        (sum, item) => sum + item.quantity * (item.price || 0),
        0,
      );
      if (reportType === "IMPORT_EXPORT") {
        if (tx.type === "IMPORT_SUPPLIER") totalImportCost += txTotal;
        if (tx.type === "DISPOSAL") totalDisposalCost += txTotal;
      } else if (reportType === "REVENUE") {
        totalRevenueAmount += txTotal;
      }
    });

    // 4. XÂY DỰNG GIAO DIỆN HTML
    const printDiv = document.createElement("div");
    printDiv.style.fontFamily = "Arial, sans-serif";
    printDiv.style.color = "#000000";
    printDiv.style.backgroundColor = "#ffffff";
    printDiv.style.padding = "20px";

    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold;">${title}</h2>
      </div>

      <div style="margin-bottom: 25px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0;">Kho / Vị trí: <strong>${branchName}</strong></p>
        <p style="margin: 0;">Giai đoạn báo cáo: <strong>${periodText}</strong></p>
        <p style="margin: 0;">Ngày xuất báo cáo: <strong>${exportTime}</strong></p>
        <p style="margin: 0;">Người lập phiếu: <strong>${creatorName}</strong></p>
      </div>

      <div style="margin-bottom: 30px; font-size: 14px; line-height: 1.8;">
        <h3 style="font-size: 16px; margin-bottom: 12px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 4px;">THỐNG KÊ TỔNG QUAN</h3>
        <p style="margin: 0;">Tổng số giao dịch phát sinh: <strong>${targetData.length} phiếu</strong></p>
        ${
          reportType === "IMPORT_EXPORT"
            ? `
          <p style="margin: 0;">Tổng chi phí nhập hàng (từ NCC): <strong style="color: #059669;">+ ${totalImportCost.toLocaleString()} VNĐ</strong></p>
          <p style="margin: 0;">Tổng chi phí tổn thất (Hủy hàng): <strong style="color: #ea580c;">- ${totalDisposalCost.toLocaleString()} VNĐ</strong></p>
        `
            : `
          <p style="margin: 0;">Tổng doanh thu bán lẻ: <strong style="color: #0284c7;">+ ${totalRevenueAmount.toLocaleString()} VNĐ</strong></p>
        `
        }
      </div>

      <h3 style="font-size: 16px; margin-bottom: 10px; text-transform: uppercase; font-weight: bold;">BẢNG KÊ CHI TIẾT</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 5%;">STT</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 15%;">Mã Phiếu / Ngày</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 18%;">${reportType === "IMPORT_EXPORT" ? "Loại / Đối tác" : "Khách hàng"}</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 32%;">Chi tiết hàng hóa (Mã - Tên - Lô - HSD)</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">SL</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 10%;">Đơn giá</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 12%;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
    `;

    let stt = 1;

    targetData.forEach((tx) => {
      const txDate = new Date(tx.createdAt).toLocaleDateString("vi-VN");

      // Xử lý Cột Đối tác / Khách hàng
      let partnerInfo = "";
      if (reportType === "IMPORT_EXPORT") {
        const typeMap = {
          IMPORT_SUPPLIER: "Nhập từ NCC",
          EXPORT_TO_BRANCH: "Luân chuyển nội bộ",
          RETURN_TO_WAREHOUSE: "Trả hàng về kho",
          DISPOSAL: "Xuất hủy",
        };
        const txTypeLabel = typeMap[tx.type] || tx.type;
        let partnerName = "---";
        if (tx.type === "IMPORT_SUPPLIER") partnerName = tx.supplierName;
        else if (
          tx.type === "EXPORT_TO_BRANCH" ||
          tx.type === "RETURN_TO_WAREHOUSE"
        )
          partnerName = `${tx.fromBranch?.name || "Kho Tổng"} -> ${tx.toBranch?.name || "Kho Tổng"}`;

        partnerInfo = `<strong>${txTypeLabel}</strong><br/><span style="color: #64748b; font-size: 11px;">${partnerName}</span>`;
      } else {
        partnerInfo = `<strong>${tx.customerName || "Khách vãng lai"}</strong><br/><span style="color: #64748b; font-size: 11px;">${tx.customerPhone || "---"}</span>`;
      }

      // Xử lý Cột Hàng hóa (Rowspan để gộp chung 1 phiếu)
      tx.details.forEach((item, idx) => {
        const itemTotal = (item.quantity || 0) * (item.price || 0);

        const isFirstItem = idx === 0;
        const rowSpanStr =
          isFirstItem && tx.details.length > 1
            ? `rowspan="${tx.details.length}"`
            : "";

        let txMetaCols = "";
        if (isFirstItem) {
          txMetaCols = `
            <td ${rowSpanStr} style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">${stt++}</td>
            <td ${rowSpanStr} style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">
              <strong>${tx.code}</strong><br/>
              <span style="font-size: 11px; color: #64748b;">${txDate}</span>
            </td>
            <td ${rowSpanStr} style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">${partnerInfo}</td>
          `;
        }

        const expiry = item.expiryDate
          ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
          : "---";

        html += `
          <tr>
            ${txMetaCols}
            <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">
              <strong style="color: #1e293b;">${item.variantId?.name || "Thuốc không tồn tại"}</strong><br/>
              <span style="font-size: 11px; color: #64748b;">Mã: ${item.variantId?.sku || "---"} | Lô: ${item.batchCode || "---"} | HSD: ${expiry}</span>
            </td>
            <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">
              <span style="font-weight: bold; color: #0369a1;">${item.quantity}</span> <span style="font-size: 10px; color: #64748b;">${item.variantId?.unit || ""}</span>
            </td>
            <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; vertical-align: top;">${(item.price || 0).toLocaleString()}đ</td>
            <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; vertical-align: top; font-weight: bold; color: ${reportType === "REVENUE" ? "#059669" : "#0f172a"};">${itemTotal.toLocaleString()}đ</td>
          </tr>
        `;
      });
    });

    // Nếu là Báo cáo doanh thu thì thêm dòng Tổng cuối bảng
    html += `
        </tbody>
        ${
          reportType === "REVENUE"
            ? `
        <tfoot>
          <tr style="background-color: #f8fafc;">
            <td colspan="6" style="padding: 12px 8px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; font-size: 14px;">TỔNG DOANH THU BÁN LẺ:</td>
            <td style="padding: 12px 8px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; font-size: 16px; color: #dc2626;">${totalRevenueAmount.toLocaleString()}đ</td>
          </tr>
        </tfoot>
        `
            : ""
        }
      </table>
    `;

    printDiv.innerHTML = html;

    const fileNamePrefix =
      reportType === "IMPORT_EXPORT"
        ? "BaoCao_NhapXuatKho"
        : "BaoCao_DoanhThuBanLe";
    const opt = {
      margin: 10,
      filename: `${fileNamePrefix}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }, // In khổ ngang để bảng rộng rãi
    };

    html2pdf()
      .set(opt)
      .from(printDiv)
      .save()
      .then(() => setExportingType(null));
  };;

  const getTxTypeBadge = (type) => {
    switch (type) {
      case "IMPORT_SUPPLIER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-full border border-emerald-100">
            <TrendingDown size={10} /> Nhập từ NCC
          </span>
        );
      case "EXPORT_TO_BRANCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 font-bold text-[11px] rounded-full border border-sky-100">
            <TrendingUp size={10} /> Luân chuyển nội bộ
          </span>
        );
      case "SALE_AT_BRANCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-full border border-amber-100">
            <Receipt size={10} /> Bán lẻ tại quầy
          </span>
        );
      case "RETURN_TO_WAREHOUSE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 font-bold text-[11px] rounded-full border border-orange-100">
            <RotateCcw size={10} /> Trả hàng về kho
          </span>
        );
      case "DISPOSAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 font-bold text-[11px] rounded-full border border-red-100">
            <X size={10} /> Hủy hàng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[11px] rounded-full border border-slate-200">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    if (status === "COMPLETED")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold text-[11px] rounded-full border border-emerald-100">
          <CheckCircle size={10} /> Hoàn tất
        </span>
      );
    if (status === "PENDING")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-full border border-amber-100">
          <Clock size={10} /> Chờ nhận
        </span>
      );
    return (
      <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[11px] rounded-full border border-slate-200">
        {status}
      </span>
    );
  };

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition bg-white text-slate-800 placeholder:text-slate-400";

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { transform: translateY(14px) scale(.97); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
            }}>
            <FileText size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Lịch sử Nhập / Xuất Kho
            </h1>
            <p className="text-xs text-slate-500">
              {filteredData.length} phiếu đang hiển thị
            </p>
          </div>
        </div>

        {/* ── CỤM NÚT XUẤT PDF ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportPDF("IMPORT_EXPORT")}
            disabled={
              exportingType !== null ||
              filteredData.filter((tx) => tx.type !== "SALE_AT_BRANCH")
                .length === 0
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
            {exportingType === "IMPORT_EXPORT" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Printer size={16} />
            )}
            In Báo Cáo Kho
          </button>

          <button
            onClick={() => handleExportPDF("REVENUE")}
            disabled={
              exportingType !== null ||
              filteredData.filter((tx) => tx.type === "SALE_AT_BRANCH")
                .length === 0
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-emerald-500/30">
            {exportingType === "REVENUE" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <DollarSign size={16} />
            )}
            In Báo Cáo Bán Lẻ
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              className={inputCls + " pl-10"}
              placeholder="Tìm mã phiếu, NCC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative w-56">
            <Filter
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              className={inputCls + " pl-9 appearance-none"}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">Tất cả loại phiếu</option>
              <option value="IMPORT_SUPPLIER">Nhập từ Nhà Cung Cấp</option>
              <option value="EXPORT_TO_BRANCH">Luân chuyển nội bộ</option>
              <option value="SALE_AT_BRANCH">Bán lẻ tại quầy</option>
              <option value="RETURN_TO_WAREHOUSE">Trả hàng về kho tổng</option>
              <option value="DISPOSAL">Phiếu xuất hủy</option>
            </select>
          </div>

          <div className="relative w-52">
            <Calendar
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              className={
                inputCls + " pl-9 appearance-none text-sky-700 bg-sky-50/50"
              }
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}>
              <option value="ALL">Tất cả thời gian</option>
              <option value="TODAY">Trong ngày hôm nay</option>
              <option value="THIS_MONTH">Trong tháng này</option>
              <option value="CUSTOM">Khoảng thời gian tuỳ chỉnh...</option>
            </select>
          </div>

          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 h-[42px] animate-[fadeIn_0.2s_ease]">
              <input
                type="date"
                className="bg-transparent border-none outline-none text-sm text-slate-700"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                className="bg-transparent border-none outline-none text-sm text-slate-700"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSACTION TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mã Phiếu
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Thời gian tạo
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Loại phiếu
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Đối tác / Chi nhánh
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2
                        size={32}
                        className="animate-spin text-sky-400"
                      />
                      <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FileText size={28} className="text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-500">
                        Không tìm thấy phiếu nào phù hợp
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-sky-50/40 transition-colors duration-150">
                    <td className="p-4">
                      <span className="font-mono text-sm font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                        {tx.code}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-4">{getTxTypeBadge(tx.type)}</td>
                    <td className="p-4 font-medium text-slate-700">
                      {tx.type === "IMPORT_SUPPLIER" ? (
                        tx.supplierName
                      ) : tx.type === "EXPORT_TO_BRANCH" ||
                        tx.type === "RETURN_TO_WAREHOUSE" ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <Store size={13} className="text-slate-400" />
                          <span className="text-slate-600">
                            {tx.fromBranch?.name || "Kho Tổng"}
                          </span>
                          <ArrowRight size={13} className="text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {tx.toBranch?.name || "Kho Tổng"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {tx.customerName || "---"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 transition-all hover:scale-105 whitespace-nowrap">
                        <Eye size={13} /> Xem phiếu
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MODAL: XEM CHI TIẾT PHIẾU (GIỮ NGUYÊN)
      ══════════════════════════════════════════ */}
      {isModalOpen && selectedTx && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: "fadeIn .2s ease" }}
          onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[920px] max-h-[90vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 shrink-0 bg-[#0ea5e9]">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText size={20} color="white" />
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    Chi Tiết Phiếu
                  </h2>
                  <span className="font-mono font-bold text-white bg-white/20 px-3 py-1 rounded-full text-sm border border-white/10">
                    {selectedTx.code}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sky-100 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />{" "}
                    {new Date(selectedTx.createdAt).toLocaleString("vi-VN")}
                  </span>
                  <span className="opacity-50">·</span>
                  <span>
                    Tạo bởi:{" "}
                    <span className="font-bold text-white">
                      {selectedTx.createdBy?.fullName || "Hệ thống"}
                    </span>
                  </span>
                  <span className="opacity-50">·</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white text-emerald-600 font-bold rounded-full shadow-sm text-[11px]">
                    {selectedTx.status === "COMPLETED" ? (
                      <>
                        <CheckCircle size={11} /> Hoàn tất
                      </>
                    ) : (
                      <>
                        <Clock size={11} /> Chờ nhận
                      </>
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0">
                <X size={18} color="white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1 flex flex-col gap-6">
              <div className="flex gap-16 px-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Loại chứng từ
                  </p>
                  {getTxTypeBadge(selectedTx.type)}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    {selectedTx.type === "IMPORT_SUPPLIER"
                      ? "Nhà cung cấp"
                      : "Đơn vị liên quan"}
                  </p>
                  <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    {selectedTx.type === "IMPORT_SUPPLIER" ? (
                      selectedTx.supplierName
                    ) : selectedTx.type === "EXPORT_TO_BRANCH" ||
                      selectedTx.type === "RETURN_TO_WAREHOUSE" ? (
                      <span className="flex items-center gap-2">
                        <span className="text-slate-600 italic">
                          {selectedTx.fromBranch?.name || "Kho Tổng"}
                        </span>
                        <ArrowRight size={14} className="text-slate-400" />
                        <span className="text-slate-800">
                          {selectedTx.toBranch?.name || "Kho Tổng"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-800">
                        {selectedTx.customerName || "Khách lẻ"}
                        {selectedTx.customerPhone
                          ? ` - ${selectedTx.customerPhone}`
                          : " - Không có số điện thoại"}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-y-auto shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-3 px-5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Mã SKU
                      </th>
                      <th className="py-3 px-5 text-xs font-bold uppercase tracking-wide min-w-[180px]">
                        Tên hàng hóa
                      </th>
                      <th className="py-3 px-5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Mã Lô / NSX - HSD
                      </th>
                      <th className="py-3 px-5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Số lượng
                      </th>
                      <th className="py-3 px-5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Đơn giá
                      </th>
                      <th className="py-3 px-5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTx.details.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {item.variantId?.sku || "---"}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-semibold text-slate-800 leading-snug">
                          {item.variantId?.name || "Thuốc không tồn tại"}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 w-fit">
                              {item.batchCode || "Không có lô"}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              NSX:{" "}
                              {item.manufacturingDate
                                ? new Date(
                                    item.manufacturingDate,
                                  ).toLocaleDateString("vi-VN")
                                : "---"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              HSD:{" "}
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "---"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <span className="font-bold text-base text-slate-700">
                            {item.quantity}
                          </span>
                          <span className="text-xs text-slate-400 ml-1 font-medium">
                            {item.variantId?.unit}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right text-slate-500 text-sm whitespace-nowrap">
                          {item.price?.toLocaleString() || 0}đ
                        </td>
                        <td className="py-4 px-5 text-right font-bold text-red-500 text-base whitespace-nowrap">
                          {(
                            (item.quantity || 0) * (item.price || 0)
                          ).toLocaleString()}
                          đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Package size={16} className="text-slate-400" /> Tổng số mặt
                hàng:{" "}
                <span className="font-bold text-slate-700 ml-1">
                  {selectedTx.details.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium">
                  Tổng giá trị phiếu:
                </span>
                <span className="text-xl font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                  {selectedTx.details
                    .reduce(
                      (sum, item) => sum + item.quantity * (item.price || 0),
                      0,
                    )
                    .toLocaleString()}
                  đ
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
