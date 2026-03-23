import React, { useState, useEffect } from "react";
import {
  Download,
  CheckCircle,
  Clock,
  PackageOpen,
  Loader2,
  Store,
} from "lucide-react";
import api from "../../services/api";

const PendingImportPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions/pending-import");
      setTransactions(res.data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách chờ nhập:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleConfirm = async (id) => {
    if (
      window.confirm(
        "Kiểm tra hàng hóa thực tế đã khớp với phiếu. Bạn xác nhận đưa số hàng này vào tồn kho của chi nhánh?",
      )
    ) {
      try {
        await api.put(`/transactions/${id}/confirm-import`);
        alert("Nhập kho chi nhánh thành công!");
        fetchPending(); // Refresh lại danh sách
      } catch (error) {
        alert("Lỗi: " + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 mt-20">
        <Loader2 className="animate-spin inline mr-2" /> Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <Download className="text-blue-600" /> Phiếu Chờ Xác Nhận Nhận Hàng
        </h1>

        {transactions.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center">
            <PackageOpen size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              Không có kiện hàng nào đang chờ nhận.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Khi Kho Tổng xuất hàng, phiếu sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {transactions.map((trans) => (
              <div
                key={trans._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
                {/* Header Phiếu */}
                <div className="bg-blue-50/50 p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded text-sm uppercase tracking-wide">
                        Mã Phiếu
                      </span>
                      <h3 className="font-mono text-lg font-bold text-gray-800">
                        {trans.code}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-2">
                      <Store size={14} className="text-gray-400" /> Từ:{" "}
                      <span className="font-bold text-gray-700">
                        {trans.fromBranch?.name || "Kho Tổng"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                      <Clock size={14} className="text-gray-400" /> Thời gian
                      xuất:{" "}
                      {new Date(trans.createdAt).toLocaleString("vi-VN", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleConfirm(trans._id)}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm transition-transform active:scale-95 whitespace-nowrap">
                    <CheckCircle size={20} /> Xác Nhận Nhận Hàng
                  </button>
                </div>

                {/* Chi tiết Hàng hóa */}
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="py-3 px-5 font-medium w-12 text-center">
                          STT
                        </th>
                        <th className="py-3 px-5 font-medium">Mã SKU</th>
                        <th className="py-3 px-5 font-medium">
                          Tên hàng hóa (Quy cách)
                        </th>
                        <th className="py-3 px-5 font-medium">
                          Mã Lô (Kèm HSD)
                        </th>
                        <th className="py-3 px-5 font-medium text-right">
                          Số lượng chuyển
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trans.details.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-3 px-5 text-center text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-5 font-mono text-gray-500">
                            {detail.variantId?.sku}
                          </td>
                          <td className="py-3 px-5 font-bold text-gray-700">
                            {detail.variantId?.name}
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-gray-600">
                                {detail.batchCode}
                              </span>
                              <span className="text-xs text-gray-400">
                                HSD:{" "}
                                {new Date(detail.expiryDate).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-blue-600 text-lg">
                            {detail.quantity}{" "}
                            <span className="text-sm font-medium text-gray-500">
                              {detail.variantId?.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingImportPage;
