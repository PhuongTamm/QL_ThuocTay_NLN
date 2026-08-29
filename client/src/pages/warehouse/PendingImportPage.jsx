import React, { useState, useEffect } from "react";
import {
  Download,
  CheckCircle,
  Clock,
  PackageOpen,
  Loader2,
  Store,
  Layers,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import api from "../../services/api";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

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
        "Kiểm tra hàng hóa thực tế đã khớp với phiếu. Bạn xác nhận đưa số hàng này vào tồn kho?",
      )
    ) {
      try {
        await api.put(`/transactions/${id}/confirm-import`);
        alert("Nhập kho thành công!");
        fetchPending();
      } catch (error) {
        alert("Lỗi: " + (error.response?.data?.message || error.message));
      }
    }
  };

  // lý do trả hàng
  const getReasonText = (reason) => {
    switch (reason) {
      case "OVERSTOCK":
        return "Bán chậm / Quá tồn";
      case "EXPIRED":
        return "Cận date / Hết hạn";
      case "DAMAGED":
        return "Hư hỏng / Lỗi NSX";
      default:
        return "---";
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
              boxShadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
            }}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <p className="text-slate-500 font-semibold text-sm">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cat-root min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 p-6 font-sans"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div className="animate-page-in space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
              boxShadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
            }}>
            <Download size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Phiếu Chờ Xác Nhận Nhập Kho
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {transactions.length > 0
                ? `${transactions.length} kiện hàng đang chờ xác nhận`
                : "Không có kiện hàng nào đang chờ"}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <PackageOpen size={32} className="text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-500">
              Không có kiện hàng nào đang chờ nhận
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Khi có luân chuyển hoặc trả hàng, phiếu sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {transactions.map((trans) => {
              // Tính tổng giá trị của toàn bộ phiếu
              const totalTransactionValue = trans.details.reduce(
                (sum, detail) =>
                  sum + (detail.quantity || 0) * (detail.price || 0),
                0,
              );

              return (
                <div
                  key={trans._id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#1d5fa7]/30 transition-all duration-200">
                  {/* Page Header */}
                  <div className="p-5 flex flex-col md:flex-row md:justify-between md:items-start gap-4 bg-[#1d5fa7]/5 border-b border-[#1d5fa7]/10">
                    <div className="flex flex-col gap-3">
                      {/* Nhãn phân loại */}
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md text-[#1d5fa7] border border-[#1d5fa7]/20 bg-white w-fit uppercase tracking-wide shadow-sm">
                        {trans.type === "RETURN_TO_WAREHOUSE"
                          ? "Phiếu Trả Hàng"
                          : "Phiếu Luân Chuyển"}
                      </span>

                      {/*Info */}
                      <div className="flex flex-col flex-wrap gap-1 text-[13px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Store size={14} className="text-slate-400" />
                          <span>
                            Từ:{" "}
                            <span className="font-bold text-slate-800">
                              {trans.fromBranch?.name || "Kho Tổng"}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          <span className="font-sm text-slate-500">
                            {new Date(trans.createdAt).toLocaleString("vi-VN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mã phiếu & Số mặt hàng */}
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block mb-0.5">
                        Mã phiếu
                      </span>
                      <span className="text-base font-bold text-slate-800 block mb-2">
                        {trans.code}
                      </span>
                      <div className="flex items-center justify-start md:justify-end gap-1.5 text-[13px] text-slate-600">
                        <Layers size={14} className="text-slate-400" />
                        <span className="font-medium">
                          {trans.details.length} mặt hàng trong phiếu
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wide w-12">
                            STT
                          </th>
                          <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Mã SKU
                          </th>
                          <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Tên hàng hóa (Quy cách)
                          </th>
                          <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Mã Lô / HSD
                          </th>
                          {trans.type === "RETURN_TO_WAREHOUSE" && (
                            <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                              Lý do trả
                            </th>
                          )}
                          <th className="py-3 px-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Đơn giá nhập
                          </th>
                          <th className="py-3 px-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Số lượng
                          </th>
                          <th className="py-3 px-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {trans.details.map((detail, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-[#1d5fa7]/5 transition-colors">
                            <td className="py-4 px-5 text-center text-slate-500 font-normal">
                              {idx + 1}
                            </td>
                            <td className="py-4 px-5 text-center text-slate-600 font-normal">
                              {detail.variantId?.sku}
                            </td>
                            <td className="py-4 px-5 text-center text-slate-800 font-normal">
                              {detail.variantId?.name}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <div className="flex flex-col items-center gap-1 text-slate-700 font-normal">
                                <span>{detail.batchCode}</span>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <CalendarDays size={10} />
                                  <span>
                                    {new Date(
                                      detail.expiryDate,
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {trans.type === "RETURN_TO_WAREHOUSE" && (
                              <td className="py-4 px-5 text-center">
                                <span
                                  className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                                    detail.reason === "DAMAGED"
                                      ? "text-red-700 bg-red-50 border-red-200"
                                      : detail.reason === "EXPIRED"
                                        ? "text-orange-700 bg-orange-50 border-orange-200"
                                        : "text-slate-700 bg-slate-50 border-slate-200"
                                  }`}>
                                  {getReasonText(detail.reason)}
                                </span>
                              </td>
                            )}
                            <td className="py-4 px-5 text-right text-slate-600 font-normal whitespace-nowrap">
                              {formatCurrency(detail.price)}
                            </td>
                            <td className="py-4 px-5 text-right text-slate-800 font-normal">
                              {detail.quantity}{" "}
                              <span className="text-slate-500 text-xs ml-0.5">
                                {detail.variantId?.unit}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right text-slate-700 whitespace-nowrap">
                              {formatCurrency(
                                (detail.quantity || 0) * (detail.price || 0),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card Footer  */}
                  <div className="p-4 pl-10 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Hiển thị tổng giá trị phiếu */}
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Tổng giá trị phiếu
                        </p>
                        <p className="text-lg font-black text-red-600">
                          {formatCurrency(totalTransactionValue)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConfirm(trans._id)}
                      className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{
                        background:
                          "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                        boxShadow: "0 4px 14px rgba(29, 95, 167, 0.4)",
                      }}>
                      <CheckCircle size={18} />
                      Xác Nhận Nhập Kho
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingImportPage;
