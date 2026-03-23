import React, { useState, useEffect } from "react";
import { Eye, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { TRANSACTION_TYPES } from "../../utils/constants"; // Cần file constants như đã đề cập ở phần trước

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get("/transactions");
        setTransactions(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTransactions();
  }, []);

  const getTypeStyle = (type) => {
    switch (type) {
      case "IMPORT_SUPPLIER":
        return "bg-blue-100 text-blue-700";
      case "SALE_AT_BRANCH":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeName = (type) => {
    // Mapping từ key sang tiếng Việt
    const map = {
      IMPORT_SUPPLIER: "Nhập từ NCC",
      SALE_AT_BRANCH: "Bán lẻ",
      EXPORT_TO_BRANCH: "Xuất kho nhánh",
    };
    return map[type] || type;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Lịch sử Giao dịch
      </h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Mã Phiếu</th>
              <th className="p-4">Loại giao dịch</th>
              <th className="p-4">Người tạo</th>
              <th className="p-4">Thời gian</th>
              <th className="p-4 text-right">Tổng tiền</th>
              <th className="p-4 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trx) => (
              <tr key={trx._id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">
                  {trx.code || trx._id.slice(-6).toUpperCase()}
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${getTypeStyle(trx.type)}`}>
                    {trx.type === "IMPORT_SUPPLIER" ? (
                      <ArrowDownLeft size={12} />
                    ) : (
                      <ArrowUpRight size={12} />
                    )}
                    {getTypeName(trx.type)}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {trx.userId?.name || "N/A"}
                </td>
                <td className="p-4 text-gray-500 text-sm flex items-center gap-2">
                  <Calendar size={14} />
                  {new Date(trx.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="p-4 text-right font-bold text-gray-800">
                  {trx.totalAmount?.toLocaleString()}đ
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => navigate(`/transactions/${trx._id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
