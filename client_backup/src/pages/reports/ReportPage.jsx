import React, { useState, useEffect } from "react";
import { fetchRevenueReport } from "../../services/api";

const ReportPage = () => {
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({ fromDate: "", toDate: "" });

  const loadReport = async () => {
    try {
      const { data } = await fetchRevenueReport(dateRange);
      setReportData(data);
    } catch (error) {
      console.error("Lỗi lấy báo cáo", error);
    }
  };

  useEffect(() => {
    // Tải báo cáo mặc định khi mới vào
    loadReport();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Báo cáo Thống kê</h1>

      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Từ ngày</label>
          <input
            type="date"
            className="border p-2 rounded"
            onChange={(e) =>
              setDateRange({ ...dateRange, fromDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Đến ngày</label>
          <input
            type="date"
            className="border p-2 rounded"
            onChange={(e) =>
              setDateRange({ ...dateRange, toDate: e.target.value })
            }
          />
        </div>
        <button
          onClick={loadReport}
          className="bg-indigo-600 text-white px-4 py-2 rounded">
          Lọc báo cáo
        </button>
      </div>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
            <h3 className="text-gray-500 text-lg">Tổng Doanh Thu</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(reportData.totalRevenue || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-lg">Số lượng hóa đơn</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {reportData.transactionCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
