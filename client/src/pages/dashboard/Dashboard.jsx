import {
  AlertOctagon,
  ArrowRight,
  Award,
  Calendar,
  DollarSign,
  Filter,
  Loader2,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../services/api";

/* ─────────────────────────────────────────
   STAT CARD — đồng bộ style POSPage
───────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, gradient, iconBg }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-4 relative">
    {/* Hàng 1: icon nhỏ + tiêu đề ngang hàng */}
    <div className="flex items-center gap-2 mb-2 relative z-10">
      <div
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={13} className="text-white" />
      </div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
        {title}
      </p>
    </div>
    {/* Hàng 2: số liệu — không bao giờ bị cắt */}
    <p className="text-lg font-black text-slate-800 leading-snug relative z-10 pl-0">
      {value}
    </p>
  </div>
);

/* ─────────────────────────────────────────
   TRANSACTION TYPE BADGE
───────────────────────────────────────── */
const getTransactionLabel = (type) => {
  switch (type) {
    case "SALE_AT_BRANCH":
      return { text: "Bán lẻ", cls: "bg-emerald-50 text-emerald-700" };
    case "IMPORT_SUPPLIER":
      return { text: "Nhập NCC", cls: "bg-sky-50 text-sky-700" };
    case "EXPORT_TO_BRANCH":
      return { text: "Xuất kho", cls: "bg-violet-50 text-violet-700" };
    case "RETURN_TO_WAREHOUSE":
      return { text: "Trả hàng", cls: "bg-amber-50 text-amber-700" };
    case "DISPOSAL":
      return { text: "Xuất hủy", cls: "bg-red-50 text-red-700" };
    default:
      return { text: type, cls: "bg-slate-50 text-slate-600" };
  }
};

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [customRange, setCustomRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [transactionType, setTransactionType] = useState("ALL");

  useEffect(() => {
    loadAllData();
  }, [datePreset, customRange, transactionType]);

  /* ── GIỮ NGUYÊN LOGIC API ── */
  const loadAllData = async () => {
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
      } else {
        start = customRange.startDate;
        end = customRange.endDate;
      }

      const [statsRes, chartRes, topRes] = await Promise.all([
        api.get("/reports/dashboard", {
          params: { startDate: start, endDate: end, transactionType },
        }),
        api.get("/reports/revenue", {
          params: { fromDate: start, toDate: end },
        }),
        api.get("/reports/top-medicines"),
      ]);

      setStats(statsRes.data.data);
      setTopMedicines(topRes.data.data || []);

      const rawChartData = chartRes.data.data?.chartData || [];
      let filledData = [];
      const padStart = new Date(start);
      padStart.setDate(padStart.getDate() - 1);
      const endDateObj = new Date(end);

      for (
        let d = new Date(padStart);
        d <= endDateObj;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");
        const existingData = rawChartData.find((item) => item._id === dateStr);
        filledData.push({
          _id: dateStr,
          revenue: existingData ? existingData.revenue : 0,
          orders: existingData ? existingData.orders : 0,
        });
      }
      setChartData(filledData);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== "CUSTOM") setCustomRange({ startDate: "", endDate: "" });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  /* Hiển thị gọn cho StatCard: 1.250.000 → 1,25 tr  |  630.000 → 630k */
  const formatCompact = (amount) => {
    if (amount >= 1_000_000_000)
      return (amount / 1_000_000_000).toFixed(1).replace(".", ",") + " tỷ";
    if (amount >= 1_000_000)
      return (amount / 1_000_000).toFixed(2).replace(".", ",") + " tr";
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + "k";
    return amount.toLocaleString("vi-VN") + "đ";
  };

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  /* ── CUSTOM TOOLTIP BIỂU ĐỒ ── */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-4">
          <p className="text-slate-500 text-sm font-medium mb-1">
            {new Date(label).toLocaleDateString("vi-VN")}
          </p>
          <p className="font-black text-sky-600 text-base">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {payload[0].payload.orders} đơn hàng
          </p>
        </div>
      );
    }
    return null;
  };

  /* ── PRESET BUTTON ── */
  const PresetBtn = ({ id, label }) => (
    <button
      onClick={() => handlePresetChange(id)}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        datePreset === id
          ? "bg-sky-500 text-white shadow-md shadow-sky-200"
          : "text-slate-500 hover:bg-slate-100"
      }`}>
      {label}
    </button>
  );

  /* ── TOP MEDICINE RANK BADGE ── */
  const rankCls = (idx) => {
    if (idx === 0) return "bg-amber-100 text-amber-600";
    if (idx === 1) return "bg-slate-100 text-slate-500";
    if (idx === 2) return "bg-orange-100 text-orange-500";
    return "bg-sky-50 text-sky-500";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* ── HEADER + DATE FILTER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Tổng Quan Hệ Thống
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Theo dõi hoạt động kinh doanh và tồn kho theo thời gian thực
          </p>
        </div>

        {/* Date picker bar — giống style tab POSPage */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
          <PresetBtn id="TODAY" label="Hôm nay" />
          <PresetBtn id="LAST_7_DAYS" label="7 Ngày" />
          <PresetBtn id="THIS_MONTH" label="Tháng này" />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <div className="flex items-center gap-2 px-2">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <input
              type="date"
              className="border-none outline-none text-sm text-slate-700 bg-transparent font-medium cursor-pointer"
              value={customRange.startDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setCustomRange({ ...customRange, startDate: e.target.value });
              }}
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              className="border-none outline-none text-sm text-slate-700 bg-transparent font-medium cursor-pointer"
              value={customRange.endDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setCustomRange({ ...customRange, endDate: e.target.value });
              }}
            />
          </div>
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && !stats ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="animate-spin text-sky-500" size={40} />
          <p className="text-slate-400 font-medium animate-pulse text-sm">
            Đang đồng bộ dữ liệu...
          </p>
        </div>
      ) : (
        <>
          {/* ── STAT CARDS ── */}
          <div
            className="grid gap-4 mb-6"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}>
            <StatCard
              title="Doanh thu bán hàng"
              value={formatCurrency(stats?.totalRevenue || 0)}
              icon={DollarSign}
              gradient="bg-sky-500"
              iconBg="bg-gradient-to-br from-sky-400 to-cyan-500"
            />
            <StatCard
              title="Đơn bán hàng"
              value={(stats?.totalOrders || 0).toLocaleString()}
              icon={TrendingUp}
              gradient="bg-emerald-500"
              iconBg="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <StatCard
              title="Thuốc cảnh báo (< 20)"
              value={(stats?.lowStockCount || 0).toLocaleString()}
              icon={Package}
              gradient="bg-amber-400"
              iconBg="bg-gradient-to-br from-amber-400 to-yellow-500"
            />
            <StatCard
              title="Cận / Hết hạn (< 90 ngày)"
              value={(stats?.expiredCount || 0).toLocaleString()}
              icon={AlertOctagon}
              gradient="bg-orange-500"
              iconBg="bg-gradient-to-br from-orange-400 to-red-400"
            />
            <StatCard
              title="Chi phí tổn thất"
              value={formatCurrency(stats?.totalDisposalLoss || 0)}
              icon={TrendingDown}
              gradient="bg-red-500"
              iconBg="bg-gradient-to-br from-red-400 to-rose-600"
            />
          </div>

          {/* ── CHART + TOP MEDICINES ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Revenue Chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
              <div className="mb-5">
                <h2 className="font-bold text-base text-slate-800">
                  Biểu đồ Doanh Thu
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Xu hướng biến động doanh số theo thời gian
                </p>
              </div>
              <div className="flex-1 w-full min-h-[240px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1">
                          <stop
                            offset="5%"
                            stopColor="#0ea5e9"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#0ea5e9"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="_id"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(val) => {
                          if (val >= 1_000_000)
                            return (val / 1_000_000).toFixed(1) + "M";
                          if (val >= 1_000)
                            return (val / 1_000).toFixed(0) + "k";
                          return val;
                        }}
                        dx={-8}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotoneX"
                        dataKey="revenue"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 5, strokeWidth: 0, fill: "#0284c7" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                    Chưa có dữ liệu doanh thu trong giai đoạn này
                  </div>
                )}
              </div>
            </div>

            {/* Top Medicines */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <Award size={18} className="text-amber-400" />
                <h2 className="font-bold text-base text-slate-800">
                  Top Thuốc Bán Chạy
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {topMedicines.length > 0 ? (
                  topMedicines.slice(0, 5).map((med, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${rankCls(idx)}`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold text-slate-800 truncate"
                          title={med.name}>
                          {med.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {med.totalQuantitySold} {med.unit} đã bán
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 shrink-0">
                        {formatCurrency(med.totalRevenue)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-300 text-sm text-center">
                    Chưa có dữ liệu bán hàng.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── TRANSACTION HISTORY ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="font-bold text-base text-slate-800">
                Lịch sử Giao dịch
              </h2>

              {/* Filter select — giống style POSPage */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl self-start">
                <Filter size={13} className="text-slate-400 shrink-0" />
                <select
                  className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}>
                  <option value="ALL">Tất cả giao dịch</option>
                  <option value="SALE_AT_BRANCH">Bán lẻ (Thu tiền)</option>
                  <option value="IMPORT_SUPPLIER">Nhập NCC (Chi tiền)</option>
                  <option value="EXPORT_TO_BRANCH">Xuất kho nội bộ</option>
                  <option value="DISPOSAL">Phiếu xuất hủy</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold rounded-l-xl">Mã GD</th>
                    <th className="px-4 py-3 font-bold">Loại</th>
                    <th className="px-4 py-3 font-bold">Nhân viên / Nguồn</th>
                    <th className="px-4 py-3 font-bold text-right">
                      Tổng tiền
                    </th>
                    <th className="px-4 py-3 font-bold text-right rounded-r-xl">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats?.recentTransactions?.map((trx) => {
                    const labelInfo = getTransactionLabel(trx.type);
                    let actorName = trx.createdBy?.fullName || "Admin";
                    if (trx.type === "IMPORT_SUPPLIER")
                      actorName = trx.supplierName || "Nhà cung cấp";

                    return (
                      <tr
                        key={trx._id}
                        className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-sky-600 text-xs">
                          {trx.code || trx._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${labelInfo.cls}`}>
                            {labelInfo.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {actorName}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-black ${
                            trx.type === "SALE_AT_BRANCH"
                              ? "text-emerald-600"
                              : trx.type === "DISPOSAL"
                                ? "text-red-500"
                                : "text-slate-800"
                          }`}>
                          {trx.type === "SALE_AT_BRANCH"
                            ? "+"
                            : trx.type === "DISPOSAL"
                              ? "−"
                              : ""}
                          {formatCurrency(
                            trx.totalAmount || trx.totalValue || 0,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {formatDateTime(trx.createdAt)}
                        </td>
                      </tr>
                    );
                  })}

                  {(!stats?.recentTransactions ||
                    stats.recentTransactions.length === 0) && (
                    <tr>
                      <td colSpan="5" className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-300">
                          <Package size={36} className="opacity-40" />
                          <p className="text-sm font-medium">
                            Không có giao dịch nào trong khoảng thời gian này.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {stats?.recentTransactions?.length > 0 && (
              <div className="mt-5 flex justify-center">
                <Link
                  to="/history-imports"
                  className="flex items-center gap-1.5 text-sm font-bold text-sky-500 hover:text-sky-700 transition-colors">
                  Xem tất cả giao dịch <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
