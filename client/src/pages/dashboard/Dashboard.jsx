import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Package,
  AlertOctagon,
  TrendingUp,
  Loader2,
  Filter,
  Calendar,
  Award,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";
import { Link } from "react-router-dom";

const StatCard = ({ title, value, icon: Icon, color, bgIcon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden">
    <div
      className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${bgIcon}`}></div>
    <div className="relative z-10">
      <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">
        {title}
      </p>
      <h3 className="text-3xl font-black text-gray-800">{value}</h3>
    </div>
    <div className={`p-4 rounded-xl relative z-10 ${color} bg-opacity-10`}>
      <Icon className={"text-black"} size={28} />
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho bộ lọc
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [customRange, setCustomRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [transactionType, setTransactionType] = useState("ALL");

  useEffect(() => {
    loadAllData();
  }, [datePreset, customRange, transactionType]);

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

      // 3. XỬ LÝ LẤP ĐẦY NGÀY TRỐNG & NGÀY ĐỆM CHO BIỂU ĐỒ
      const rawChartData = chartRes.data.data?.chartData || [];
      let filledData = [];

      // MẸO: Lùi lại 1 ngày so với mốc bắt đầu để tạo "Điểm neo 0đ" giúp Recharts vẽ tia lên mượt hơn
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

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getTransactionLabel = (type) => {
    switch (type) {
      case "SALE_AT_BRANCH":
        return { text: "Bán lẻ", color: "text-green-600 bg-green-50" };
      case "IMPORT_SUPPLIER":
        return { text: "Nhập NCC", color: "text-blue-600 bg-blue-50" };
      case "EXPORT_TO_BRANCH":
        return { text: "Xuất kho", color: "text-purple-600 bg-purple-50" };
      case "RETURN_TO_WAREHOUSE":
        return { text: "Trả hàng", color: "text-orange-600 bg-orange-50" };
      case "DISPOSAL":
        return { text: "Xuất hủy", color: "text-red-600 bg-red-50" };
      default:
        return { text: type, color: "text-gray-600 bg-gray-50" };
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-100">
          <p className="text-gray-500 mb-2 font-medium">
            {new Date(label).toLocaleDateString("vi-VN")}
          </p>
          <p className="font-bold text-blue-600 text-lg">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {payload[0].payload.orders} đơn hàng
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">
            Tổng Quan Hệ Thống
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi hoạt động kinh doanh và tồn kho theo thời gian thực
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => handlePresetChange("TODAY")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${datePreset === "TODAY" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            Hôm nay
          </button>
          <button
            onClick={() => handlePresetChange("LAST_7_DAYS")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${datePreset === "LAST_7_DAYS" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            7 Ngày
          </button>
          <button
            onClick={() => handlePresetChange("THIS_MONTH")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${datePreset === "THIS_MONTH" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            Tháng này
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm text-gray-700 bg-transparent font-medium cursor-pointer"
              value={customRange.startDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setCustomRange({ ...customRange, startDate: e.target.value });
              }}
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              className="border-none focus:ring-0 text-sm text-gray-700 bg-transparent font-medium cursor-pointer"
              value={customRange.endDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setCustomRange({ ...customRange, endDate: e.target.value });
              }}
            />
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex flex-col justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
          <p className="text-gray-500 font-medium animate-pulse">
            Đang đồng bộ dữ liệu...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
            <StatCard
              title="Doanh thu bán hàng"
              value={formatCurrency(stats?.totalRevenue || 0)}
              icon={DollarSign}
              color="bg-blue-500"
              bgIcon="bg-blue-500"
            />
            <StatCard
              title="Đơn bán hàng"
              value={(stats?.totalOrders || 0).toLocaleString()}
              icon={TrendingUp}
              color="bg-green-500"
              bgIcon="bg-green-500"
            />
            <StatCard
              title="Thuốc cảnh báo (< 20)"
              value={(stats?.lowStockCount || 0).toLocaleString()}
              icon={Package}
              color="bg-yellow-500"
              bgIcon="bg-yellow-500"
            />
            <StatCard
              title="Cận/Hết hạn (< 90 Ngày)"
              value={(stats?.expiredCount || 0).toLocaleString()}
              icon={AlertOctagon}
              color="bg-orange-500"
              bgIcon="bg-orange-500"
            />
            <StatCard
              title="Chi phí tổn thất"
              value={formatCurrency(stats?.totalDisposalLoss || 0)}
              icon={TrendingDown}
              color="bg-red-600"
              bgIcon="bg-red-600"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-bold text-lg text-gray-800">
                    Biểu đồ Doanh Thu
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Xu hướng biến động doanh số theo thời gian
                  </p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[250px] max-h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {/* Thêm margin top/bottom để đường vẽ không bị cắt xén */}
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1">
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="_id"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        // THUẬT TOÁN ĐỊNH DẠNG TRỤC Y THÔNG MINH
                        tickFormatter={(val) => {
                          if (val >= 1000000)
                            return (val / 1000000).toFixed(1) + "M";
                          if (val >= 1000) return (val / 1000).toFixed(0) + "k";
                          return val;
                        }}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ĐỔI TYPE THÀNH monotoneX ĐỂ VẼ MƯỢT KHI CÓ ÍT ĐIỂM DỮ LIỆU */}
                      <Area
                        type="monotoneX"
                        dataKey="revenue"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: "#1d4ed8" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Chưa có dữ liệu doanh thu trong giai đoạn này
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Award className="text-yellow-500" /> Top Thuốc Bán Chạy
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {topMedicines.length > 0 ? (
                  <div className="space-y-4">
                    {topMedicines.slice(0, 5).map((med, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? "bg-yellow-100 text-yellow-600" : idx === 1 ? "bg-gray-100 text-gray-500" : idx === 2 ? "bg-orange-100 text-orange-500" : "bg-blue-50 text-blue-500"}`}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <p
                            className="text-sm font-bold text-gray-800 line-clamp-1"
                            title={med.name}>
                            {med.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {med.totalQuantitySold} {med.unit} đã bán
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(med.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
                    Chưa có dữ liệu bán hàng.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg text-gray-800">
                Lịch sử giao dịch
              </h2>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <Filter size={14} className="text-gray-500" />
                <select
                  className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none cursor-pointer"
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
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="p-3 font-bold rounded-l-lg">Mã GD</th>
                    <th className="p-3 font-bold">Loại</th>
                    <th className="p-3 font-bold">Nhân viên / Nguồn</th>
                    <th className="p-3 font-bold text-right">Tổng tiền</th>
                    <th className="p-3 font-bold text-right rounded-r-lg">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats?.recentTransactions?.map((trx) => {
                    const labelInfo = getTransactionLabel(trx.type);
                    let actorName = trx.createdBy?.fullName || "Admin";
                    if (trx.type === "IMPORT_SUPPLIER")
                      actorName = trx.supplierName || "Nhà cung cấp";

                    return (
                      <tr
                        key={trx._id}
                        className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {trx.code || trx._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${labelInfo.color}`}>
                            {labelInfo.text}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          {actorName}
                        </td>
                        <td
                          className={`p-3 text-right font-black ${trx.type === "SALE_AT_BRANCH" ? "text-green-600" : trx.type === "DISPOSAL" ? "text-red-600" : "text-gray-800"}`}>
                          {trx.type === "SALE_AT_BRANCH"
                            ? "+"
                            : trx.type === "DISPOSAL"
                              ? "-"
                              : ""}
                          {formatCurrency(
                            trx.totalAmount || trx.totalValue || 0,
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          {formatDateTime(trx.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {(!stats?.recentTransactions ||
                    stats.recentTransactions.length === 0) && (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-10 text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <Package size={40} className="mb-3 opacity-20" />
                          <p>
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
              <div className="mt-4 flex justify-center">
                <Link
                  to="/history-imports"
                  className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:text-blue-800 transition-colors">
                  Xem tất cả giao dịch <ArrowRight size={16} />
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
