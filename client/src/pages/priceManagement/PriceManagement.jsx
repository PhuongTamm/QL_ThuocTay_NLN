import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRightLeft,
  Search,
  History,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Zap,
  DollarSign,
  ListChecks,
  Edit,
  Save,
} from "lucide-react";
import api from "../../services/api";

// ─── Toast Notification System ───────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto
          transition-all duration-300 min-w-[260px] max-w-xs
          ${
            t.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        style={{ animation: "slideIn .25s ease" }}>
        {t.type === "success" ? (
          <CheckCircle size={16} className="text-emerald-500 shrink-0" />
        ) : (
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
        )}
        <span className="flex-1">{t.message}</span>
        <button
          onClick={() => removeToast(t.id)}
          className="opacity-50 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback(
    (id) => setToasts((p) => p.filter((t) => t.id !== id)),
    [],
  );
  return { toasts, addToast, removeToast };
};

// ─── Modal Overlay ────────────────────────────────────────────────────────────
const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0,
  );

const PriceManagement = () => {
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Dữ liệu
  const [categories, setCategories] = useState([]);
  const [flattenedVariants, setFlattenedVariants] = useState([]);

  // State quản lý Chọn nhiều (Checkbox) để Sync theo công thức
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [isSyncingSelected, setIsSyncingSelected] = useState(false);

  // ─── STATE QUẢN LÝ NHẬP GIÁ THỦ CÔNG (SỬA NHIỀU DÒNG CÙNG LÚC) ───
  const [manualEdits, setManualEdits] = useState({}); // Lưu object { id_thuoc: gia_moi }
  const [isSavingManualEdits, setIsSavingManualEdits] = useState(false);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterSyncNeeded, setFilterSyncNeeded] = useState("all");

  // Modal Lịch sử
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [priceHistoryData, setPriceHistoryData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal Bulk Update (Theo danh mục)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isBulking, setIsBulking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [medRes, catRes] = await Promise.all([
        api.get("/medicines"),
        api.get("/categories"),
      ]);

      const meds = medRes.data.data || [];
      setCategories(catRes.data.data || []);

      let variantsList = [];
      meds.forEach((med) => {
        if (med.variants && med.variants.length > 0) {
          med.variants.forEach((variant) => {
            const markup = med.categoryId?.markupPercentage || 0.2;
            const mac = med.mac || 0;
            const suggestedPrice = Math.round(
              mac * variant.conversionRate * (1 + markup),
            );
            const isNeedSync = variant.currentPrice !== suggestedPrice;

            variantsList.push({
              ...variant,
              medicineName: med.name,
              medicineCode: med.code,
              mac: mac,
              markup: markup,
              categoryName: med.categoryId?.name || "Chưa phân loại",
              categoryId: med.categoryId?._id,
              suggestedPrice: suggestedPrice,
              isNeedSync: isNeedSync,
            });
          });
        }
      });
      setFlattenedVariants(variantsList);

      // Clear các state thao tác khi load lại data
      setSelectedVariants([]);
      setManualEdits({});
    } catch (error) {
      addToast("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── ACTIONS ────────────────────────────────────────────────────────────────

  // Đồng bộ 1 dòng (Nút Sync nhanh)
  const handleQuickSyncPrice = async (variantId, newPrice, unitName) => {
    if (
      !window.confirm(
        `Xác nhận đồng bộ giá bán ${unitName} theo công thức thành ${formatCurrency(newPrice)}?`,
      )
    )
      return;

    try {
      await api.put(`/medicines/variants/${variantId}`, {
        currentPrice: newPrice,
      });
      addToast("Cập nhật giá thành công!");
      fetchData();
    } catch (error) {
      addToast("Lỗi khi đồng bộ giá!", "error");
    }
  };

  // Đồng bộ NHIỀU dòng được tick checkbox (Theo công thức)
  const handleSyncSelected = async () => {
    if (selectedVariants.length === 0) return;
    if (
      !window.confirm(
        `Xác nhận áp dụng giá gợi ý (MAC) cho ${selectedVariants.length} quy cách đã chọn?`,
      )
    )
      return;

    setIsSyncingSelected(true);
    try {
      const updatePromises = selectedVariants.map((variantId) => {
        const item = flattenedVariants.find((v) => v._id === variantId);
        if (item) {
          return api.put(`/medicines/variants/${variantId}`, {
            currentPrice: item.suggestedPrice,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      addToast(`Đã đồng bộ thành công ${selectedVariants.length} quy cách!`);
      fetchData();
    } catch (error) {
      addToast("Có lỗi xảy ra khi đồng bộ hàng loạt!", "error");
    } finally {
      setIsSyncingSelected(false);
    }
  };

  // LƯU TOÀN BỘ CÁC GIÁ NHẬP TAY (GLOBAL SAVE)
  const handleSaveManualEdits = async () => {
    const editKeys = Object.keys(manualEdits);
    if (editKeys.length === 0) return;

    // Kiểm tra có ô nào nhập số âm hoặc bỏ trống không
    const hasInvalid = editKeys.some(
      (key) => manualEdits[key] === "" || Number(manualEdits[key]) < 0,
    );
    if (hasInvalid) {
      return addToast(
        "Có mức giá nhập không hợp lệ (trống hoặc số âm), vui lòng kiểm tra lại!",
        "error",
      );
    }

    if (
      !window.confirm(`Xác nhận lưu ${editKeys.length} thay đổi giá thủ công?`)
    )
      return;

    setIsSavingManualEdits(true);
    try {
      const updatePromises = editKeys.map((variantId) => {
        const newPrice = Number(manualEdits[variantId]);
        return api.put(`/medicines/variants/${variantId}`, {
          currentPrice: newPrice,
        });
      });

      await Promise.all(updatePromises);
      addToast(`Đã lưu thành công ${editKeys.length} giá điều chỉnh thủ công!`);
      setManualEdits({}); // Xóa danh sách đang sửa
      fetchData(); // Tải lại bảng
    } catch (error) {
      addToast("Có lỗi xảy ra khi lưu giá thủ công!", "error");
    } finally {
      setIsSavingManualEdits(false);
    }
  };

  // Đồng bộ theo Danh mục
  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (!bulkCategoryId) return addToast("Vui lòng chọn nhóm thuốc", "error");

    setIsBulking(true);
    try {
      const res = await api.put(
        `/medicines/category/${bulkCategoryId}/bulk-update-prices`,
      );
      addToast(res.data.message || "Cập nhật đồng loạt thành công!");
      setIsBulkModalOpen(false);
      fetchData();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Lỗi cập nhật đồng loạt!",
        "error",
      );
    } finally {
      setIsBulking(false);
    }
  };

  const handleOpenHistory = async (variantId) => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await api.get(
        `/medicines/variants/${variantId}/price-history`,
      );
      setPriceHistoryData(res.data.data);
    } catch (error) {
      addToast("Lỗi tải lịch sử giá!", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ─── LOGIC CHECKBOX ─────────────────────────────────────────────────────────
  const handleSelectVariant = (variantId) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId],
    );
  };

  // ─── LỌC DỮ LIỆU ─────────────────────────────────────────────────────────────
  const filteredData = flattenedVariants.filter((item) => {
    const matchSearch =
      item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory
      ? item.categoryId === selectedCategory
      : true;
    const matchSync = filterSyncNeeded === "need_sync" ? item.isNeedSync : true;
    return matchSearch && matchCat && matchSync;
  });

  const needSyncFiltered = filteredData.filter((i) => i.isNeedSync);
  const isAllSelected =
    needSyncFiltered.length > 0 &&
    selectedVariants.length === needSyncFiltered.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVariants(needSyncFiltered.map((item) => item._id));
    } else {
      setSelectedVariants([]);
    }
  };

  const syncNeededCount = flattenedVariants.filter((i) => i.isNeedSync).length;
  const editingCount = Object.keys(manualEdits).length; // Số ô đang nhập tay

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 p-6 font-sans">
      <style>{`
         @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes modalIn { from { transform: translateY(14px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }
      `}</style>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="animate-page-in space-y-6 ">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] shadow-lg shadow-[#0ea5e9]/30">
              <DollarSign size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Quản lý Giá bán
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Kiểm soát, chỉnh sửa và đồng bộ giá bán lẻ tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* NHÓM NÚT LƯU GIÁ THỦ CÔNG (Chỉ hiện khi có nhập liệu) */}
            {editingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-2xl border border-amber-200 shadow-sm animate-in fade-in slide-in-from-right-2">
                <button
                  onClick={() => setManualEdits({})}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all">
                  Hủy thao tác
                </button>
                <button
                  onClick={handleSaveManualEdits}
                  disabled={isSavingManualEdits}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/20">
                  {isSavingManualEdits ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Lưu {editingCount} sửa đổi
                </button>
              </div>
            )}

            {/* NHÓM NÚT ĐỒNG BỘ THEO CÔNG THỨC */}
            {selectedVariants.length > 0 && editingCount === 0 && (
              <button
                onClick={handleSyncSelected}
                disabled={isSyncingSelected}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-[#0ea5e9] bg-sky-100 border border-sky-200 transition-all hover:bg-sky-200 hover:-translate-y-0.5">
                {isSyncingSelected ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ListChecks size={18} />
                )}
                Đồng bộ ({selectedVariants.length}) thuốc (MAC)
              </button>
            )}

            {editingCount === 0 && (
              <button
                onClick={() => {
                  setBulkCategoryId("");
                  setIsBulkModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-500/30"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                }}>
                <Zap size={18} fill="currentColor" /> Đồng bộ theo nhóm thuốc
              </button>
            )}
          </div>
        </div>

        {/* THỐNG KÊ NHANH & BỘ LỌC */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {syncNeededCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-bold w-full md:w-auto shrink-0">
                <AlertTriangle size={18} className="text-rose-500" />
                Có {syncNeededCount} quy cách lệch giá cần xử lý!
              </div>
            )}

            <div className="relative flex-1 w-full">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 focus:border-[#0ea5e9] bg-slate-50 hover:bg-white transition-all"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 bg-slate-50">
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterSyncNeeded}
              onChange={(e) => setFilterSyncNeeded(e.target.value)}
              className="w-full md:w-56 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 bg-slate-50 ">
              <option value="all">Hiển thị tất cả</option>
              <option value="need_sync">Chỉ xem thuốc lệch giá</option>
            </select>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#0ea5e9] focus:ring-[#0ea5e9] cursor-pointer"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={needSyncFiltered.length === 0}
                      title="Chọn tất cả thuốc đang lệch giá"
                    />
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Thông tin thuốc (SKU)
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                    Quy cách
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase">
                    Chỉ số định giá
                  </th>
                  {/* Cột giá gộp (Giá bán & Gợi ý) */}
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase min-w-[150px]">
                    Giá bán lẻ
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16">
                      <Loader2
                        size={32}
                        className="animate-spin text-[#0ea5e9] mx-auto mb-2"
                      />
                      <p className="text-sm text-slate-400">
                        Đang phân tích giá...
                      </p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-16 text-slate-500">
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    // Kiểm tra xem dòng này có đang được sửa tay không
                    const isManualEditing = manualEdits[item._id] !== undefined;

                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-sky-50/50 transition-colors group ${selectedVariants.includes(item._id) ? "bg-sky-50/30" : ""} ${isManualEditing ? "bg-amber-50/20" : ""}`}>
                        <td className="px-5 py-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-[#0ea5e9] focus:ring-[#0ea5e9] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            checked={selectedVariants.includes(item._id)}
                            onChange={() => handleSelectVariant(item._id)}
                            disabled={!item.isNeedSync}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 text-sm">
                            {item.medicineName}
                          </p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            {item.sku}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-slate-700 px-2.5 py-1 ">
                            {item.unit}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Tỉ lệ quy đổi: {item.conversionRate}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex flex-col gap-1 text-[11px] font-medium bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-lg">
                            <span className="text-slate-500">
                              MAC:{" "}
                              <span className="font-bold text-slate-700">
                                {formatCurrency(item.mac)}
                              </span>
                            </span>
                            <span className="text-emerald-600 flex items-center gap-1 justify-center">
                              <TrendingUp size={10} /> % Lợi nhuận:{" "}
                              {item.markup * 100}%
                            </span>
                          </div>
                        </td>

                        {/* CỘT GIÁ BÁN & GIÁ GỢI Ý GỘP CHUNG */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {isManualEditing ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2">
                                <input
                                  type="number"
                                  min="0"
                                  autoFocus
                                  value={manualEdits[item._id]}
                                  onChange={(e) =>
                                    setManualEdits((prev) => ({
                                      ...prev,
                                      [item._id]: e.target.value,
                                    }))
                                  }
                                  className="w-28 px-2 py-1.5 text-sm border-2 border-amber-400 bg-white rounded-lg outline-none text-right font-bold text-slate-800 shadow-sm"
                                  placeholder="Nhập giá..."
                                />
                                {/* NÚT HỦY CHO RIÊNG DÒNG NÀY */}
                                <button
                                  onClick={() => {
                                    setManualEdits((prev) => {
                                      const newState = { ...prev };
                                      delete newState[item._id]; // Xóa thuốc này khỏi danh sách đang sửa
                                      return newState;
                                    });
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors border border-rose-100 shadow-sm"
                                  title="Hủy sửa giá thuốc này">
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-end gap-2 group/edit cursor-pointer"
                                onClick={() =>
                                  setManualEdits((prev) => ({
                                    ...prev,
                                    [item._id]: item.currentPrice,
                                  }))
                                }>
                                <span
                                  className={`text-sm font-bold border-b border-transparent group-hover/edit:border-slate-300 border-dashed pb-0.5 transition-colors ${item.isNeedSync ? "text-rose-500" : "text-slate-700"}`}>
                                  {formatCurrency(item.currentPrice)}
                                </span>
                                <button
                                  className="text-slate-300 group-hover/edit:text-amber-500 opacity-0 group-hover/edit:opacity-100 transition-all"
                                  title="Nhấn để sửa giá thủ công">
                                  <Edit size={14} />
                                </button>
                              </div>
                            )}

                            {/* BADGE GIÁ GỢI Ý (Đã cập nhật UI giống Modal Quy Cách) */}
                            <div className="mt-1 flex items-center justify-between gap-4 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-[11px] text-emerald-700 min-w-[150px] shadow-sm hover:shadow transition-shadow">
                              <span>
                                Gợi ý:{" "}
                                <b>{formatCurrency(item.suggestedPrice)}</b>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setManualEdits((prev) => ({
                                    ...prev,
                                    [item._id]: item.suggestedPrice,
                                  }))
                                }
                                className="font-bold underline hover:text-emerald-900 transition-colors"
                                title="Đưa giá gợi ý vào ô nhập để tinh chỉnh">
                                Áp dụng
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          {item.isNeedSync ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                              <AlertTriangle size={12} /> Lệch giá
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                              <CheckCircle size={12} /> Chuẩn
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            {item.isNeedSync ? (
                              <button
                                onClick={() =>
                                  handleQuickSyncPrice(
                                    item._id,
                                    item.suggestedPrice,
                                    item.unit,
                                  )
                                }
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#0ea5e9] text-white text-xs font-bold rounded-lg hover:bg-[#0369a1] transition-colors shadow-md shadow-[#0ea5e9]/20"
                                title="Áp dụng ngay mức giá gợi ý (MAC)">
                                <ArrowRightLeft size={12} /> Đồng bộ
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed"
                                title="Không có giá gợi ý để đồng bộ">
                                <ArrowRightLeft size={12} /> Đồng bộ
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenHistory(item._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                              title="Xem lịch sử thay đổi giá">
                              <History size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL LỊCH SỬ GIÁ */}
      {isHistoryModalOpen && (
        <ModalOverlay onClose={() => setIsHistoryModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[480px] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .2s ease" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">
                  Lịch sử biến động giá
                </h2>
                {priceHistoryData && (
                  <p className="text-xs font-bold text-[#0ea5e9] mt-0.5">
                    SKU: {priceHistoryData.sku} • {priceHistoryData.name} (
                    {priceHistoryData.unit})
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto bg-slate-50/50">
              {isLoadingHistory ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-[#0ea5e9]" />
                </div>
              ) : priceHistoryData?.history?.length > 0 ? (
                <div className="space-y-3">
                  {priceHistoryData.history.map((record, idx, arr) => {
                    const previousRecord = arr[idx + 1];
                    let status = {
                      label: "Khởi tạo",
                      style: "text-sky-600 bg-sky-50 border-sky-200",
                      icon: <Plus size={12} />,
                    };

                    if (previousRecord) {
                      if (record.price > previousRecord.price) {
                        status = {
                          label: "Tăng giá",
                          style: "text-rose-600 bg-rose-50 border-rose-200",
                          icon: <TrendingUp size={12} />,
                        };
                      } else if (record.price < previousRecord.price) {
                        status = {
                          label: "Giảm giá",
                          style:
                            "text-emerald-600 bg-emerald-50 border-emerald-200",
                          icon: <TrendingDown size={12} />,
                        };
                      } else {
                        status = {
                          label: "Không đổi",
                          style: "text-slate-600 bg-slate-100 border-slate-200",
                          icon: <Minus size={12} />,
                        };
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-slate-800 text-lg block">
                              {formatCurrency(record.price)}
                            </span>
                            <span
                              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.style}`}>
                              {status.icon} {status.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <p>
                              Thời gian:{" "}
                              <span className="font-medium text-slate-700">
                                {new Date(record.effectiveDate).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                            </p>
                            <p>
                              Người cập nhật:{" "}
                              <span className="font-medium text-slate-700">
                                {record.updatedBy?.fullName ||
                                  "Hệ thống tự động"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 flex flex-col items-center gap-2">
                  <History size={32} className="text-slate-300" />
                  <p className="text-slate-500 text-sm font-medium">
                    Chưa có lịch sử thay đổi giá.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* MODAL ĐỒNG BỘ ĐỒNG LOẠT (BULK UPDATE) */}
      {isBulkModalOpen && (
        <ModalOverlay onClose={() => setIsBulkModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[450px] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .2s ease" }}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Zap className="text-amber-500" fill="currentColor" /> Cập nhật
                giá theo nhóm thuốc
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống sẽ quét và áp dụng giá gợi ý (MAC + Lợi nhuận) cho toàn
                bộ thuốc thuộc nhóm thuốc đã chọn.
              </p>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Chọn Nhóm thuốc cần đồng bộ:
              </label>
              <select
                required
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 font-medium bg-slate-50">
                <option value="" disabled>
                  -- Vui lòng chọn --
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} (Lợi nhuận: {c.markupPercentage * 100}%)
                  </option>
                ))}
              </select>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isBulking}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all flex items-center gap-2 text-sm disabled:opacity-60">
                  {isBulking ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}{" "}
                  Bắt đầu đồng bộ
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

export default PriceManagement;
