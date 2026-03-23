import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import api from "../../services/api";

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trx, setTrx] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/transactions/${id}`);
        setTrx(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetail();
  }, [id]);

  if (!trx) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 mb-6 hover:text-blue-600">
          <ArrowLeft size={20} className="mr-2" /> Quay lại danh sách
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-start bg-gray-50">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                Phiếu Giao Dịch
              </h1>
              <p className="text-gray-500 text-sm">Mã: {trx.code || trx._id}</p>
              <p className="text-gray-500 text-sm">
                Ngày: {new Date(trx.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="text-right">
              <span className="block font-bold text-gray-800">{trx.type}</span>
              <span className="block text-sm text-gray-500">
                Người lập: {trx.userId?.name}
              </span>
            </div>
          </div>

          {/* Table Details */}
          <div className="p-6">
            <table className="w-full mb-8">
              <thead className="bg-gray-100 text-sm font-semibold text-gray-600">
                <tr>
                  <th className="p-3 text-left">Sản phẩm / Thuốc</th>
                  <th className="p-3 text-center">Số lô</th>
                  <th className="p-3 text-center">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá</th>
                  <th className="p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {trx.details.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      {item.variantId?.name || "Thuốc đã xóa"}
                    </td>
                    <td className="p-3 text-center text-gray-500 font-mono text-sm">
                      {item.batchCode}
                    </td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">
                      {item.price?.toLocaleString()}đ
                    </td>
                    <td className="p-3 text-right font-bold">
                      {(item.quantity * item.price).toLocaleString()}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end border-t pt-4">
              <div className="w-64">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tổng số lượng:</span>
                  <span className="font-medium">
                    {trx.details.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold text-blue-600">
                  <span>Tổng tiền:</span>
                  <span>{trx.totalAmount?.toLocaleString()}đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500 flex gap-2">
              <FileText size={16} /> Ghi chú: {trx.notes || "Không có ghi chú"}
            </div>
            <button className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              <Printer size={18} /> In phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail;
