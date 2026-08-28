import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Calendar,
  Store,
  Tags,
  Loader2,
  PieChart,
  Printer,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import html2pdf from "html2pdf.js";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
const StatCard = ({
  title,
  value,
  icon: Icon,
  iconBg,
  badgeText,
  badgeStyle,
  textColor = "text-slate-800",
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-4 relative flex flex-col justify-between h-full">
    <div>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon size={13} className="text-white" />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
            {title}
          </p>
        </div>
        {badgeText && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold ${badgeStyle}`}>
            {badgeText}
          </span>
        )}
      </div>
      <p
        className={`text-xl font-black leading-snug relative z-10 pl-0 ${textColor}`}>
        {value}
      </p>
    </div>
  </div>
);

const ProfitAnalysis = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ summary: {}, details: [] });
  const [loading, setLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Bộ lọc dữ liệu Master
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Bộ lọc thời gian (Tương tự TransactionHistoryPage)
  const [datePreset, setDatePreset] = useState("ALL"); // ALL, TODAY, THIS_MONTH, THIS_YEAR, CUSTOM
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [datePreset, dateRange, branchId]);

  const loadFilterOptions = async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        api.get("/branches"),
        api.get("/categories"),
      ]);
      setBranches(bRes.data.data || []);
      setCategories(cRes.data.data || []);
    } catch (e) {
      console.error("Lỗi tải bộ lọc:", e);
    }
  };

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      let start = "",
        end = "";
      const today = new Date();

      if (datePreset === "TODAY") {
        start = today.toISOString().split("T")[0];
        end = start;
      } else if (datePreset === "LAST_7_DAYS") {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        start = lastWeek.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (datePreset === "THIS_MONTH") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = firstDay.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (datePreset === "THIS_YEAR") {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        start = firstDay.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (datePreset === "CUSTOM") {
        start = dateRange.startDate;
        end = dateRange.endDate;
      }

      const query = new URLSearchParams();
      if (start) query.append("fromDate", start);
      if (end) query.append("toDate", end);
      if (branchId) query.append("branchId", branchId);

      const res = await api.get(
        `/reports/profit-analytics?${query.toString()}`,
      );
      setData(res.data);
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý Lọc Frontend
  const filteredDetails = data.details.filter((item) => {
    const matchSearch =
      item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryId ? item.categoryId === categoryId : true;
    return matchSearch && matchCat;
  });

  /* ─── LOGIC XUẤT BÁO CÁO PDF ─── */
  const handleExportPDF = () => {
    setIsExportingPDF(true);

    let branchName = "Toàn Hệ Thống";
    if (branchId) {
      const b = branches.find((x) => x._id === branchId);
      if (b)
        branchName =
          b.type === "warehouse"
            ? `Kho Tổng: ${b.name}`
            : `Chi nhánh: ${b.name}`;
    } else if (user?.role !== "admin" && user?.role !== "warehouse_manager") {
      branchName = "Chi nhánh của tôi";
    }

    let periodText = "Tất cả thời gian";
    if (datePreset === "TODAY") periodText = "Hôm nay";
    else if (datePreset === "LAST_7_DAYS") periodText = "7 Ngày qua";
    else if (datePreset === "THIS_MONTH") periodText = "Tháng này";
    else if (datePreset === "THIS_YEAR") periodText = "Năm nay";
    else if (datePreset === "CUSTOM") {
      const sDate = dateRange.startDate
        ? new Date(dateRange.startDate).toLocaleDateString("vi-VN")
        : "...";
      const eDate = dateRange.endDate
        ? new Date(dateRange.endDate).toLocaleDateString("vi-VN")
        : "...";
      periodText = `Từ ${sDate} đến ${eDate}`;
    }

    const creatorName = user?.fullName || "System Admin";
    const exportTime = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const printDiv = document.createElement("div");
    printDiv.style.fontFamily = "'Times New Roman', Times, serif"; // Đổi sang Times New Roman
    printDiv.style.color = "#000000";
    printDiv.style.backgroundColor = "#ffffff";
    printDiv.style.padding = "20px";

    let html = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">HỆ THỐNG PHARMASYS </h3>
          <p style="margin: 5px 0; font-size: 14px;">Đơn vị báo cáo: <strong>${branchName}</strong></p>
          <p style="margin: 5px 0; font-size: 14px;">Giai đoạn: <strong>${periodText}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${exportTime}</p>
        </div>
      </div>

      <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">BÁO CÁO LỢI NHUẬN TỔNG HỢP</h2>

      <div style="margin-bottom: 30px; font-size: 14px; line-height: 1.8;">
        <h3 style="font-size: 16px; margin-bottom: 12px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 4px;">THỐNG KÊ TỔNG QUAN</h3>
        <p style="margin: 0;">Tổng số mặt hàng kinh doanh: <strong>${filteredDetails.length} loại</strong></p>
        <p style="margin: 0;">Tổng doanh thu bán ra: <strong style="color: #000;">+ ${Math.round(data.summary.totalRevenue).toLocaleString()} VNĐ</strong></p>
        <p style="margin: 0;">Tổng lợi nhuận gộp: <strong style="color: #000;">+ ${Math.round(data.summary.grossProfit).toLocaleString()} VNĐ</strong></p>
        <p style="margin: 0;">Tổng phí hủy / hao hụt: <strong style="color: #000;">- ${Math.round(data.summary.totalDisposalLoss).toLocaleString()} VNĐ</strong></p>
        <p style="margin: 0;">Tổng lợi nhuận thuần (Net): <strong style="color: #000;">${Math.round(data.summary.netProfit).toLocaleString()} VNĐ</strong></p>
      </div>

      <h3 style="font-size: 16px; margin-bottom: 10px; text-transform: uppercase; font-weight: bold;">BẢNG KÊ CHI TIẾT LỢI NHUẬN</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 4%;">STT</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 26%;">Sản Phẩm (Mã - Tên - ĐVT)</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">SL Bán</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 11%;">Doanh thu</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 11%;">Giá vốn</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 11%;">LN Gộp</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 10%;">Hao hụt</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; width: 11%;">LN Thuần</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 8%;">Biên LN</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredDetails.forEach((row, idx) => {
      html += `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">${idx + 1}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">
            <strong style="color: #0f172a; font-size: 13px;">${row.medicineName}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Mã: ${row.sku} | ĐVT: ${row.unit}</span>
          </td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #000; vertical-align: top;">
            ${row.soldQty} <span style="font-size: 10px; font-weight: normal; color: #000;">${row.unit}</span>
          </td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; vertical-align: top;">${row.revenue.toLocaleString()}đ</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; color: #000; vertical-align: top;">${row.cogs.toLocaleString()}đ</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; color: #000; vertical-align: top;">${row.grossProfit.toLocaleString()}đ</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; color: #000; vertical-align: top;">${row.disposalLoss > 0 ? "-" + row.disposalLoss.toLocaleString() + "đ" : "-"}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: right; color: #000; vertical-align: top;">${row.netProfit.toLocaleString()}đ</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">
            <span style="font-weight: bold; color: #000;">${row.margin.toFixed(1)}%</span>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>
      <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px; page-break-inside: avoid;">
        <div style="width: 33.33%;">
          <strong style="display: block; margin-bottom: 80px;">Người lập phiếu</strong>
          <span>${creatorName}</span>
        </div>
        <div style="width: 33.33%;">
          <strong style="display: block; margin-bottom: 80px;">Kế toán trưởng</strong>
          <span>(Ký, ghi rõ họ tên)</span>
        </div>
        <div style="width: 33.33%;">
          <strong style="display: block; margin-bottom: 80px;">Giám đốc</strong>
          <span>(Ký, ghi rõ họ tên)</span>
        </div>
      </div>
    `;
    printDiv.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `BaoCao_LoiNhuan_${branchName.replace(/\s+/g, "")}_${new Date().getTime()}.pdf`,
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
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 focus:border-[#0ea5e9] transition bg-white text-slate-800 placeholder:text-slate-400";

  return (
    <div className="cat-root min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 p-6 font-sans">
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in { animation: fadeInPage 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="animate-page-in space-y-6 ">
        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Hiệu quả Kinh doanh (P&L)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">
              Phân tích lợi nhuận dựa trên phương pháp xuất kho FEFO
            </p>
          </div>

          {/* NÚT IN BÁO CÁO PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || filteredDetails.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
            {isExportingPDF ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Printer size={18} />
            )}
            In Báo Cáo
          </button>
        </div>

        {/* ── BỘ LỌC DỮ LIỆU TÍCH HỢP ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col lg:flex-row gap-3 items-center flex-wrap">
          <div className="relative flex-1 w-full min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm tên thuốc, mã SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputCls + " pl-10"}
            />
          </div>

          {/* BỘ LỌC THỜI GIAN (Tương tự TransactionHistoryPage) */}
          <div className="relative w-full lg:w-52">
            <Calendar
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className={
                inputCls +
                " pl-9 appearance-none text-[#0ea5e9] bg-[#0ea5e9]/5 cursor-pointer"
              }>
              <option value="ALL">Tất cả thời gian</option>
              <option value="TODAY">Trong ngày hôm nay</option>
              <option value="THIS_MONTH">Trong tháng này</option>
              <option value="THIS_YEAR">Trong năm nay</option>
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

          {(user?.role === "admin" || user?.role === "warehouse_manager") && (
            <div className="relative w-full lg:w-48">
              <Store
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={inputCls + " pl-9 appearance-none cursor-pointer"}>
                <option value="">Tất cả Chi nhánh</option>
                {branches
                  .filter((b) => b.type === "store")
                  .map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="relative w-full lg:w-48">
            <Tags
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls + " pl-9 appearance-none cursor-pointer"}>
              <option value="">Tất cả Danh mục</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── THỐNG KÊ TỔNG QUAN (STAT CARDS) ── */}
        <div
          className="grid gap-4 mb-6"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}>
          <StatCard
            title="Tổng Doanh Thu"
            value={formatCurrency(data.summary.totalRevenue)}
            icon={DollarSign}
            iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            title="Lợi Nhuận Gộp"
            value={formatCurrency(data.summary.grossProfit)}
            icon={TrendingUp}
            iconBg="bg-gradient-to-br from-emerald-400 to-teal-500"
            textColor="text-emerald-600"
            //badgeText="Cách 2"
            badgeStyle="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            title="Phí Hủy / Hao hụt"
            value={formatCurrency(data.summary.totalDisposalLoss)}
            icon={TrendingDown}
            iconBg="bg-gradient-to-br from-orange-400 to-red-500"
            textColor="text-rose-600"
          />
          <div className="bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] rounded-2xl shadow-md px-4 py-4 relative flex flex-col justify-between h-full border border-sky-400/50">
            <div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/20">
                    <PieChart size={13} className="text-white" />
                  </div>
                  <p className="text-[11px] font-bold text-sky-100 uppercase tracking-wider leading-tight">
                    LỢI NHUẬN THUẦN
                  </p>
                </div>
                {/* <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/20 text-white">
                  Cách 3
                </span> */}
              </div>
              <p className="text-xl font-black leading-snug relative z-10 pl-0 text-white">
                {formatCurrency(data.summary.netProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* ── BẢNG CHI TIẾT THEO THUỐC ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
              Phân tích chi tiết theo mặt hàng
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Sản phẩm (SKU)</th>
                  <th className="px-5 py-4 text-right">SL Bán</th>
                  <th className="px-5 py-4 text-right">Doanh thu</th>
                  <th className="px-5 py-4 text-right">Giá vốn (COGS)</th>
                  <th className="px-5 py-4 text-right text-emerald-600">
                    LN Gộp
                  </th>
                  <th className="px-5 py-4 text-right text-rose-600">
                    Phí Hủy
                  </th>
                  <th className="px-5 py-4 text-right text-[#0ea5e9]">
                    LN Thuần
                  </th>
                  <th className="px-5 py-4 text-center">Tỷ suất (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16">
                      <Loader2
                        size={32}
                        className="animate-spin text-[#0ea5e9] mx-auto mb-2"
                      />
                      <p className="text-slate-400">
                        Đang phân tích dữ liệu...
                      </p>
                    </td>
                  </tr>
                ) : filteredDetails.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-16 text-slate-500">
                      Không tìm thấy dữ liệu phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredDetails.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#0ea5e9]/5 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {row.medicineName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {row.sku} - {row.unit}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700">
                        {row.soldQty}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-800">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500">
                        {formatCurrency(row.cogs)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">
                        {formatCurrency(row.grossProfit)}
                      </td>
                      <td className="px-5 py-4 text-right text-rose-500">
                        {row.disposalQty > 0
                          ? formatCurrency(row.disposalLoss)
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[#0ea5e9]">
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-block min-w-[50px] px-2 py-1 rounded-md text-[11px] font-bold ${
                            row.margin > 30
                              ? "bg-emerald-100 text-emerald-700"
                              : row.margin > 10
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}>
                          {row.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalysis;
