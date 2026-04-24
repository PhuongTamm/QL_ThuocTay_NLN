import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  Store,
  Calendar,
  Search,
  Loader2,
  ArrowRight,
  AlertCircle,
  Printer,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import html2pdf from "html2pdf.js";

const MonthlyReportPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Filter States
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "warehouse_manager") {
      api.get("/branches").then((res) => setBranches(res.data.data || []));
    }
  }, [user]);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear, selectedBranchId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `/inventories/monthly-report?month=${selectedMonth}&year=${selectedYear}&warehouseId=${selectedBranchId}`;
      const res = await api.get(url);
      setReports(res.data.data || []);
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.medicineId?.name.toLowerCase().includes(term) ||
      r.medicineId?.code.toLowerCase().includes(term)
    );
  });

  /* ─── LOGIC XUẤT PDF (CÓ THÊM CỘT CHI TIẾT LÔ) ─── */
  const handleExportPDF = () => {
    setIsExportingPDF(true);

    // 1. XÁC ĐỊNH THÔNG TIN CƠ BẢN
    let branchName = user?.branchId
      ? branches.find((x) => x._id === user.branchId)?.name
      : "Kho của tôi";
    if (selectedBranchId) {
      const b = branches.find((x) => x._id === selectedBranchId);
      if (b)
        branchName = b.type === "warehouse"
          ? `Kho Tổng: ${b.name}`
          : `Chi nhánh: ${b.name}`;
    } else if (user?.role !== "admin" && user?.role !== "warehouse_manager") {
      branchName = "Kho Chi Nhánh Của Tôi";
    }

    const creatorName = user?.fullName || user?.username || "Admin";
    const exportTime = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // 2. TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ
    let totalStart = 0;
    let totalImport = 0;
    let totalExport = 0;
    let totalEnd = 0;

    filteredReports.forEach((r) => {
      totalStart += r.startQuantity || 0;
      totalImport += r.importQuantity || 0;
      totalExport += r.exportQuantity || 0;
      totalEnd += r.endQuantity || 0;
    });

    // 3. TẠO HTML BÁO CÁO SẠCH ĐỂ XUẤT PDF
    const printDiv = document.createElement("div");
    printDiv.style.fontFamily = "Arial, sans-serif";
    printDiv.style.color = "#000000";
    printDiv.style.backgroundColor = "#ffffff";
    printDiv.style.padding = "20px";

    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold;">BÁO CÁO XUẤT NHẬP TỒN KHO - THÁNG ${selectedMonth}/${selectedYear}</h2>
      </div>

      <div style="margin-bottom: 25px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0;">Kho / Vị trí: <strong>${branchName}</strong></p>
        <p style="margin: 0;">Ngày xuất báo cáo: <strong>${exportTime}</strong></p>
        <p style="margin: 0;">Người lập phiếu: <strong>${creatorName}</strong></p>
      </div>

      <div style="margin-bottom: 30px; font-size: 14px; line-height: 1.8;">
        <h3 style="font-size: 16px; margin-bottom: 12px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 4px;">THỐNG KÊ TỔNG QUAN</h3>
        <p style="margin: 0;">Tổng số loại thuốc phát sinh giao dịch: <strong>${filteredReports.length} loại</strong></p>
        <p style="margin: 0;">Tổng tồn đầu kỳ: <strong style="color: #1d4ed8;">${totalStart.toLocaleString()}</strong> (Đơn vị cơ sở)</p>
        <p style="margin: 0;">Tổng nhập trong kỳ: <strong style="color: #059669;">+ ${totalImport.toLocaleString()}</strong> (Đơn vị cơ sở)</p>
        <p style="margin: 0;">Tổng xuất trong kỳ: <strong style="color: #ea580c;">- ${totalExport.toLocaleString()}</strong> (Đơn vị cơ sở)</p>
        <p style="margin: 0;">Tổng tồn cuối kỳ: <strong style="color: #0369a1;">${totalEnd.toLocaleString()}</strong> (Đơn vị cơ sở)</p>
      </div>

      <h3 style="font-size: 16px; margin-bottom: 10px; text-transform: uppercase; font-weight: bold;">BẢNG KÊ CHI TIẾT</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 3%;">STT</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 10%;">Mã Thuốc</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 18%;">Tên Thuốc</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 37%;">Chi tiết Lô hiện tại (Mã lô - HSD - Tồn - Vốn)</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">Tồn Đầu</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">Nhập</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">Xuất</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">Tồn Cuối</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredReports.forEach((r, idx) => {
      // ĐÃ SỬA: Không filter quantity > 0 nữa, lấy toàn bộ mảng batches
      const activeBatches = r.batches || [];
      let batchHtml = "";

      if (activeBatches.length > 0) {
        batchHtml = activeBatches
          .map((b) => {
            const expiry = b.expiryDate
              ? new Date(b.expiryDate).toLocaleDateString("vi-VN")
              : "---";

            // Xử lý Text Trạng Thái (Lỗi, Hết hạn...)
            const qualityText =
              b.quality !== "GOOD"
                ? `<br/><span style="color: #ef4444; font-size: 10px; font-weight: bold;">(${b.quality})</span>`
                : "";

            // Xử lý hiển thị Số lượng (Nếu = 0 thì bôi xám, nếu > 0 thì bôi đỏ)
            const isOutOfStock = b.quantity === 0;
            const qtyColor = isOutOfStock ? "#94a3b8" : "#ef4444";

            // Hiển thị Số hiện tại / Số gốc
            const stockDisplay = `<span style="color: ${qtyColor}; font-weight: bold;">${b.quantity}</span> <span style="color: #94a3b8; font-size: 11px;">/ ${b.initialQuantity || b.quantity}</span>`;

            return `
              <div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1; font-family: monospace; ${isOutOfStock ? "opacity: 0.6;" : ""}">
                <strong>${b.batchCode}</strong> | HSD: ${expiry} | Tồn: ${stockDisplay} | Vốn: ${b.importPrice?.toLocaleString() || 0}đ${qualityText}
              </div>`;
          })
          .join("");
      } else {
        batchHtml = `<span style="color: #94a3b8; font-style: italic;">Chưa có dữ liệu lô hàng</span>`;
      }

      html += `
        <tr>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">${idx + 1}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; font-family: monospace; vertical-align: top;"><strong>${r.medicineId?.code || ""}</strong></td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">${r.medicineId?.name || ""}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">${batchHtml}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #1d4ed8; vertical-align: top;">${r.startQuantity.toLocaleString()}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #059669; vertical-align: top;">+${r.importQuantity.toLocaleString()}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #ea580c; vertical-align: top;">-${r.exportQuantity.toLocaleString()}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #0369a1; vertical-align: top;">
            <span style="font-size: 16px;">${r.endQuantity.toLocaleString()}</span><br/>
            <span style="font-size: 10px; font-weight: normal; color: #64748b;">${r.medicineId?.baseUnit || ""}</span>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    printDiv.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `BaoCaoXNT_T${selectedMonth}_${selectedYear}_${branchName.replace(/\s+/g, "")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    html2pdf()
      .set(opt)
      .from(printDiv)
      .save()
      .then(() => setIsExportingPDF(false));
  };

  const inputCls =
    "px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 bg-white font-medium text-slate-700";

  return (
    <div className="min-h-screen p-6 bg-[#f0f4f8] font-sans">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
            }}>
            <FileBarChart size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Báo Cáo Xuất Nhập Tồn
            </h1>
            <p className="text-xs text-slate-500">
              Chốt số liệu hàng tháng để kế toán đối soát
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF || filteredReports.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
          {isExportingPDF ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Printer size={18} />
          )}
          In Báo Cáo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-64">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Tìm kiếm thuốc
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={`${inputCls} w-full pl-9`}
                placeholder="Mã thuốc, tên thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-32">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Calendar size={12} /> Tháng
            </label>
            <select
              className={`${inputCls} w-full`}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Năm
            </label>
            <select
              className={`${inputCls} w-full`}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {(user?.role === "admin" || user?.role === "warehouse_manager") && (
            <div className="w-64">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Store size={12} /> Chọn Chi nhánh
              </label>
              <select
                className={`${inputCls} w-full text-violet-700 bg-violet-50/50`}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}>
                <option value="">-- Kho của tôi (Mặc định) --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.type === "warehouse" ? "🏢 Kho Tổng: " : "🏪 CN: "} {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div
        id="monthly-report-table"
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  STT
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mã / Tên Thuốc
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Đơn vị
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide bg-blue-50/50">
                  Tồn Đầu Kỳ
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide bg-emerald-50/50">
                  Nhập Trong Kỳ
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide bg-orange-50/50">
                  Xuất Trong Kỳ
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide bg-sky-50">
                  Tồn Cuối Kỳ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2
                        size={32}
                        className="animate-spin text-violet-500"
                      />
                      <p className="text-sm font-medium">
                        Đang tổng hợp dữ liệu sổ cái...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <AlertCircle size={28} className="text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-500">
                        Chưa có phát sinh giao dịch trong kỳ này
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r, idx) => (
                  <tr
                    key={r._id}
                    className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="p-4 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg mr-2 border border-slate-200">
                        {r.medicineId?.code}
                      </span>
                      <span className="font-bold text-slate-800">
                        {r.medicineId?.name}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-500 font-medium">
                      {r.medicineId?.baseUnit}
                    </td>

                    {/* Số liệu (Bôi màu cho dễ nhìn) */}
                    <td className="p-4 text-center font-bold text-blue-700 bg-blue-50/30">
                      {r.startQuantity.toLocaleString()}
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">
                      +{r.importQuantity.toLocaleString()}
                    </td>
                    <td className="p-4 text-center font-bold text-orange-600 bg-orange-50/30">
                      -{r.exportQuantity.toLocaleString()}
                    </td>

                    {/* Tồn cuối kỳ */}
                    <td className="p-4 text-center font-black text-sky-700 bg-sky-50/50 gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <ArrowRight
                          size={14}
                          className="text-sky-300 opacity-50"
                        />
                        {r.endQuantity.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportPage;
