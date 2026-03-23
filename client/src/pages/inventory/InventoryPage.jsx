import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Store,
  Calendar,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Eye,
  X,
  History,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const InventoryPage = () => {
  const { user } = useAuth();
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("all");
  const [sortBy, setSortBy] = useState("qty_desc");

  // State Modal 1 (Xem các lô của Thuốc)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);

  // State Modal 2 (Xem lịch sử nhập của 1 Lô)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "warehouse_manager") {
      api.get("/branches").then((res) => setBranches(res.data.data || []));
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const url = selectedBranchId
        ? `/inventories?branchId=${selectedBranchId}`
        : "/inventories";
      const res = await api.get(url);
      setInventories(res.data.data || []);
    } catch (error) {
      console.error("Lỗi tải tồn kho:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProcessedData = () => {
    let data = [...inventories];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (inv) =>
          inv.medicineId?.name.toLowerCase().includes(term) ||
          inv.medicineId?.code.toLowerCase().includes(term),
      );
    }
    if (filterExpiry !== "all") {
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(today.getMonth() + 3);

      data = data.filter((inv) => {
        const activeBatches = inv.batches.filter((b) => b.quantity > 0);
        if (activeBatches.length === 0) return false;
        const nearestExpiry = new Date(
          Math.min(...activeBatches.map((b) => new Date(b.expiryDate))),
        );
        if (filterExpiry === "expired") return nearestExpiry < today;
        if (filterExpiry === "expiring_soon")
          return nearestExpiry >= today && nearestExpiry <= threeMonthsLater;
        return true;
      });
    }
    data.sort((a, b) => {
      if (sortBy === "qty_desc") return b.totalQuantity - a.totalQuantity;
      if (sortBy === "qty_asc") return a.totalQuantity - b.totalQuantity;
      if (sortBy === "name_asc")
        return (a.medicineId?.name || "").localeCompare(
          b.medicineId?.name || "",
        );
      return 0;
    });
    return data;
  };

  const processedData = getProcessedData();

  const handleOpenDetail = (inv) => {
    setSelectedInventory(inv);
    setIsModalOpen(true);
  };

  // Đổi tham số nhận vào
  const handleOpenBatchHistory = async (batchCode, importPrice) => {
    setSelectedBatchCode(batchCode);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const targetBranch = selectedBranchId || user.branchId;
      // Gắn thêm &importPrice=${importPrice} vào URL
      const res = await api.get(
        `/transactions/batch-history?branchId=${targetBranch}&medicineId=${selectedInventory.medicineId._id}&batchCode=${batchCode}&importPrice=${importPrice}`,
      );
      setBatchHistory(res.data.data || []);
    } catch (error) {
      alert("Lỗi lấy lịch sử: " + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getExpiryStatus = (dateString) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(expiryDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (expiryDate < today)
      return {
        label: "Đã hết hạn",
        color: "bg-red-100 text-red-700 border-red-200",
      };
    if (diffDays <= 90)
      return {
        label: `Còn ${diffDays} ngày`,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    return {
      label: "An toàn",
      color: "bg-green-50 text-green-600 border-green-100",
    };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans relative">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <ClipboardList className="text-blue-600" /> Quản lý Tồn Kho
      </h1>

      {/* --- BỘ LỌC TÌM KIẾM --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="relative md:col-span-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Tìm mã thuốc, tên thuốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative md:col-span-3">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <select
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={filterExpiry}
              onChange={(e) => setFilterExpiry(e.target.value)}>
              <option value="all">Tất cả hạn sử dụng</option>
              <option value="expiring_soon">
                ⚠️ Sắp hết hạn (&lt; 3 tháng)
              </option>
              <option value="expired">🚨 Đã hết hạn</option>
            </select>
          </div>
          <div className="relative md:col-span-2">
            <ArrowUpDown
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <select
              className="w-full pl-10 pr-2 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}>
              <option value="qty_desc">Tồn kho giảm dần</option>
              <option value="qty_asc">Tồn kho tăng dần</option>
              <option value="name_asc">Tên thuốc (A-Z)</option>
            </select>
          </div>
          {(user?.role === "admin" || user?.role === "warehouse_manager") && (
            <div className="relative md:col-span-3">
              <Store
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <select
                className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium text-blue-700"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}>
                <option value="">-- Kho của tôi (Mặc định) --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.isMainWarehouse ? "🏢 Kho Tổng: " : "🏪 CN: "} {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* --- BẢNG TỒN KHO TỔNG --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-600 font-medium">
            <tr>
              <th className="p-4 text-center">STT</th>
              <th className="p-4">Mã Thuốc</th>
              <th className="p-4">Tên Thuốc (Gốc)</th>
              <th className="p-4 text-center">Đơn vị lưu kho</th>
              <th className="p-4 text-center">Tổng Tồn Kho</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <Loader2 className="animate-spin inline mr-2" />
                  Đang tải...
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-16 text-gray-500">
                  Không có dữ liệu tồn kho.
                </td>
              </tr>
            ) : (
              processedData.map((inv, idx) => {
                const activeBatches = inv.batches.filter((b) => b.quantity > 0);
                const hasWarning = activeBatches.some(
                  (b) =>
                    new Date(b.expiryDate) <=
                    new Date(new Date().setMonth(new Date().getMonth() + 3)),
                );
                return (
                  <tr key={inv._id} className="hover:bg-blue-50/30">
                    <td className="p-4 text-center text-gray-500">{idx + 1}</td>
                    <td className="p-4 font-mono text-gray-600">
                      {inv.medicineId?.code}
                    </td>
                    <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                      {inv.medicineId?.name}{" "}
                      {hasWarning && (
                        <AlertTriangle
                          size={16}
                          className="text-red-500"
                          title="Có lô sắp hết hạn"
                        />
                      )}
                    </td>
                    <td className="p-4 text-center text-gray-600">
                      {inv.medicineId?.baseUnit}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-lg font-bold text-blue-600">
                        {inv.totalQuantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(inv)}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                        <Eye size={14} /> Chi tiết ({activeBatches.length} lô)
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL 1: XEM CHI TIẾT TỪNG LÔ CỦA THUỐC ================= */}
      {isModalOpen && selectedInventory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Danh sách Lô hàng tồn kho
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Thuốc:{" "}
                  <span className="font-bold text-blue-600">
                    {selectedInventory.medicineId?.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="py-3 px-4 font-medium">Mã Lô (Batch)</th>
                      <th className="py-3 px-4 font-medium text-center">
                        Ngày SX
                      </th>
                      <th className="py-3 px-4 font-medium text-center">
                        Hạn Sử Dụng
                      </th>
                      <th className="py-3 px-4 font-medium text-center">
                        Tồn / Gốc
                      </th>
                      <th className="py-3 px-4 font-medium text-right">
                        Giá vốn (1 {selectedInventory.medicineId?.baseUnit})
                      </th>
                      <th className="py-3 px-4 font-medium text-center">
                        Tình trạng
                      </th>
                      <th className="py-3 px-4 font-medium text-right">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInventory.batches
                      .filter((b) => b.quantity > 0)
                      .sort(
                        (a, b) =>
                          new Date(a.expiryDate) - new Date(b.expiryDate),
                      )
                      .map((batch, index) => {
                        const status = getExpiryStatus(batch.expiryDate);
                        return (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-gray-700">
                              {batch.batchCode}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-500">
                              {batch.manufacturingDate
                                ? new Date(
                                    batch.manufacturingDate,
                                  ).toLocaleDateString("vi-VN")
                                : "---"}
                            </td>
                            <td className="py-3 px-4 text-center font-medium">
                              {new Date(batch.expiryDate).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-blue-600">
                                {batch.quantity}
                              </span>{" "}
                              <span className="text-gray-400 text-xs">
                                / {batch.initialQuantity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-red-500">
                              {batch.importPrice?.toLocaleString()}đ
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-1 text-xs font-bold rounded border ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            {/* <td className="py-3 px-4 text-right">
                              <button
                                onClick={() =>
                                  handleOpenBatchHistory(batch.batchCode)
                                }
                                className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded inline-flex items-center gap-1 text-xs font-medium border border-blue-200 bg-white shadow-sm">
                                <History size={14} /> Lịch sử nhập
                              </button>
                            </td> */}
                            <td className="py-3 px-4 text-right">
                              <button
                                // TRUYỀN THÊM batch.importPrice VÀO ĐÂY
                                onClick={() =>
                                  handleOpenBatchHistory(
                                    batch.batchCode,
                                    batch.importPrice,
                                  )
                                }
                                className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded inline-flex items-center gap-1 text-xs font-medium border border-blue-200 bg-white shadow-sm">
                                <History size={14} /> Lịch sử nhập
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LỊCH SỬ NHẬP CỦA 1 LÔ ĐÃ ĐƯỢC LÀM CHI TIẾT HƠN ================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[800px] border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <History className="text-blue-600" /> Lịch sử nhập lô:
                <span className="font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                  {selectedBatchCode}
                </span>
              </h2>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-gray-100 flex-1">
              {loadingHistory ? (
                <div className="text-center py-10 text-gray-500">
                  <Loader2 className="animate-spin inline mr-2" /> Đang tra cứu
                  dữ liệu...
                </div>
              ) : batchHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-white rounded-lg border">
                  Không tìm thấy lịch sử nhập của lô này.
                </div>
              ) : (
                <div className="space-y-4">
                  {batchHistory.map((hist, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-300 transition relative overflow-hidden">
                      {/* Vệt màu trang trí bên trái */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>

                      <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                            Thời gian ghi nhận
                          </p>
                          <p className="font-medium text-gray-800 flex items-center gap-2">
                            {new Date(hist.date).toLocaleString("vi-VN", {
                              timeStyle: "medium",
                              dateStyle: "short",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                            Mã phiếu (Transaction)
                          </p>
                          <p className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {hist.transactionCode}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Nguồn cung cấp
                          </p>
                          <p className="font-bold text-gray-800">
                            {hist.source || "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Người thực hiện
                          </p>
                          <p className="font-medium text-gray-700">
                            {hist.createdBy}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            SL x Đơn vị nhập
                          </p>
                          <p className="font-bold text-lg text-blue-600">
                            {hist.quantity}{" "}
                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {hist.unit}
                            </span>
                          </p>
                          <p
                            className="text-xs text-gray-400 truncate mt-0.5"
                            title={hist.variantName}>
                            ({hist.variantName})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">
                            Đơn giá & Tổng tiền
                          </p>
                          <p className="text-sm text-gray-500">
                            {hist.unitPrice.toLocaleString()}đ / {hist.unit}
                          </p>
                          <p className="font-bold text-red-600 text-lg">
                            {hist.totalValue.toLocaleString()}đ
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
