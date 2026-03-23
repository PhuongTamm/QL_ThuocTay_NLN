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
} from "lucide-react";
import api from "../../services/api";

const TransactionHistoryPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // State cho Modal xem chi tiết phiếu
  const [selectedTx, setSelectedTx] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
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

  // Lọc dữ liệu
  const filteredData = transactions.filter((tx) => {
    const matchSearch =
      tx.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.supplierName &&
        tx.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = filterType === "ALL" || tx.type === filterType;
    return matchSearch && matchType;
  });

  const handleOpenDetail = (tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  // Helper hiển thị loại phiếu
  const getTxTypeBadge = (type) => {
    switch (type) {
      case "IMPORT_SUPPLIER":
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full">
            Nhập từ NCC
          </span>
        );
      case "EXPORT_TO_BRANCH":
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
            Luân chuyển nội bộ
          </span>
        );
      case "SALE_AT_BRANCH":
        return (
          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full">
            Bán lẻ tại quầy
          </span>
        );
      case "RETURN_TO_WAREHOUSE":
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full">
            Trả hàng về kho
          </span>
        );

      default:
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold text-xs rounded-full">
            {type}
          </span>
        );
    }
  };

  // Helper hiển thị trạng thái
  const getStatusBadge = (status) => {
    if (status === "COMPLETED")
      return (
        <span className="flex items-center gap-1 text-green-600 font-bold text-xs">
          <CheckCircle size={14} /> Hoàn tất
        </span>
      );
    if (status === "PENDING")
      return (
        <span className="flex items-center gap-1 text-orange-500 font-bold text-xs">
          <Clock size={14} /> Chờ nhận
        </span>
      );
    return <span className="text-gray-500 text-xs">{status}</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <FileText className="text-blue-600" /> Lịch sử Nhập / Xuất Kho
      </h1>

      {/* --- THANH CÔNG CỤ LỌC --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex gap-4">
        <div className="relative w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Tìm theo Mã phiếu, Tên NCC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-64">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <select
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">Tất cả loại phiếu</option>
            <option value="IMPORT_SUPPLIER">Nhập từ Nhà Cung Cấp</option>
            <option value="EXPORT_TO_BRANCH">Luân chuyển nội bộ</option>
          </select>
        </div>
      </div>

      {/* --- BẢNG DANH SÁCH PHIẾU --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="p-4 font-medium">Mã Phiếu</th>
              <th className="p-4 font-medium">Thời gian tạo</th>
              <th className="p-4 font-medium">Loại phiếu</th>
              <th className="p-4 font-medium">Đối tác / Chi nhánh</th>
              <th className="p-4 font-medium text-center">Trạng thái</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-gray-500">
                  Không tìm thấy phiếu nào.
                </td>
              </tr>
            ) : (
              filteredData.map((tx) => (
                <tr
                  key={tx._id}
                  className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-700">
                    {tx.code}
                  </td>
                  <td className="p-4 text-gray-600">
                    {new Date(tx.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="p-4">{getTxTypeBadge(tx.type)}</td>
                  <td className="p-4 font-medium text-gray-800">
                    {tx.type === "IMPORT_SUPPLIER" ? (
                      tx.supplierName
                    ) : tx.type === "EXPORT_TO_BRANCH" ? (
                      <span className="flex items-center gap-1.5">
                        <Store size={14} className="text-gray-400" />{" "}
                        {tx.fromBranch?.name || "Kho Tổng"}{" "}
                        <ArrowRight size={14} className="text-gray-400" />{" "}
                        {tx.toBranch?.name}
                      </span>
                    ) : (
                      "---"
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenDetail(tx)}
                      className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                      <Eye size={14} /> Xem phiếu
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL XEM CHI TIẾT PHIẾU (GIỐNG HÓA ĐƠN) ================= */}
      {isModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gray-50 p-5 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  Chi Tiết Phiếu{" "}
                  <span className="text-blue-600 font-mono">
                    {selectedTx.code}
                  </span>
                </h2>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <p>
                    <Calendar size={14} className="inline mr-1 -mt-0.5" />{" "}
                    {new Date(selectedTx.createdAt).toLocaleString("vi-VN")}
                  </p>
                  <p className="border-l pl-4">
                    Tạo bởi:{" "}
                    <strong>
                      {selectedTx.createdBy?.fullName || "Hệ thống"}
                    </strong>
                  </p>
                  <p className="border-l pl-4">
                    {getStatusBadge(selectedTx.status)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 p-2">
                <X size={24} />
              </button>
            </div>

            {/* Thông tin đối tác */}
            <div className="p-5 bg-white border-b border-dashed border-gray-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                    Loại chứng từ
                  </p>
                  <p className="font-medium text-gray-800">
                    {getTxTypeBadge(selectedTx.type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                    {selectedTx.type === "IMPORT_SUPPLIER"
                      ? "Nhà cung cấp"
                      : "Đơn vị nhận hàng"}
                  </p>
                  <p className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    {selectedTx.type === "IMPORT_SUPPLIER" ? (
                      selectedTx.supplierName
                    ) : selectedTx.type === "EXPORT_TO_BRANCH" ? (
                      <>
                        <Store size={18} className="text-blue-500" />{" "}
                        {selectedTx.toBranch?.name}
                      </>
                    ) : (
                      <span className="text-gray-500 italic">
                        {selectedTx.customerName} - {selectedTx.customerPhone || "Không có số điện thoại"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Danh sách hàng hóa */}
            <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm">
                  <tr>
                    <th className="py-3 px-5 font-medium">Mã SKU</th>
                    <th className="py-3 px-5 font-medium">
                      Tên hàng hóa (Quy cách)
                    </th>
                    <th className="py-3 px-5 font-medium">Mã Lô (Kèm HSD)</th>
                    <th className="py-3 px-5 font-medium text-center">
                      Số lượng
                    </th>
                    <th className="py-3 px-5 font-medium text-right">
                      Đơn giá
                    </th>
                    <th className="py-3 px-5 font-medium text-right">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {selectedTx.details.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30">
                      <td className="py-4 px-5 font-mono text-gray-500">
                        {item.variantId?.sku}
                      </td>
                      <td className="py-4 px-5 font-bold text-gray-800">
                        {item.variantId?.name}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-blue-700">
                            {item.batchCode}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            HSD:{" "}
                            {new Date(item.expiryDate).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-lg text-gray-700">
                        {item.quantity}{" "}
                        <span className="text-sm text-gray-500 font-normal">
                          {item.variantId?.unit}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-medium text-gray-600">
                        {item.price?.toLocaleString() || 0}đ
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-red-600 text-lg">
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

            {/* Tổng cộng footer */}
            <div className="bg-white p-5 border-t border-gray-200 flex justify-end items-center gap-6">
              <p className="text-gray-500">
                Tổng số mặt hàng:{" "}
                <span className="font-bold text-gray-800">
                  {selectedTx.details.length}
                </span>
              </p>
              <div className="text-xl">
                Tổng giá trị phiếu:{" "}
                <span className="font-bold text-red-600 text-2xl ml-2">
                  {selectedTx.details
                    .reduce(
                      (sum, item) => sum + item.quantity * (item.price || 0),
                      0,
                    )
                    .toLocaleString()}{" "}
                  VNĐ
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
