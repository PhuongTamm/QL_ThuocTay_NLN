import {
  AlertTriangle,
  CheckCircle,
  Edit,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
  TrendingUp,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../../services/api";

//Thông báo toast
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

// Định dạng Modal 
const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

//  Hộp thoại thông báo xác nhận
const ConfirmDialog = ({ open, onConfirm, onCancel, categoryName }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.35)", backdropFilter: "blur(4px)" }}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        style={{ animation: "popIn .2s ease" }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
          Xác nhận xóa
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Bạn có chắc muốn xóa nhóm thuốc{" "}
          <strong className="text-gray-700">"{categoryName}"</strong>? Hành động
          này không thể hoàn tác.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            Xóa ngay
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryList = () => {
  const [categories, setCategories] = useState([]);

  // State quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    markupPercentage: 20,
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data } = await fetchCategories();
      setCategories(data.data || data);
    } catch (error) {
      console.error("Lỗi khi tải nhóm thuốc", error);
      addToast("Không thể tải nhóm thuốc. Vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", markupPercentage: 20 });
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      description: category.description || "",
      markupPercentage:
        category.markupPercentage !== undefined
          ? category.markupPercentage * 100
          : 20,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Chuyển đổi % về số thập phân để gửi xuống DB (20 -> 0.2)
      const payload = {
        ...formData,
        markupPercentage: Number(formData.markupPercentage) / 100,
      };

      if (editingId) {
        const result = await updateCategory(editingId, payload);
        if (result.data.success) {
          addToast("Cập nhật nhóm thuốc thành công!");
        } else {
          addToast(result.data.message || "Cập nhật thất bại!", "error");
        }
      } else {
        const result = await createCategory(payload);
        if (result.data.success) {
          addToast("Thêm nhóm thuốc thành công!");
        } else {
          addToast(result.data.message || "Thêm thất bại!", "error");
        }
      }
      setFormData({ name: "", description: "", markupPercentage: 20 });
      setEditingId(null);
      setIsModalOpen(false); // Đóng modal khi thành công
      loadCategories();
    } catch (error) {
      addToast("Lỗi xử lý. Vui lòng thử lại!", "error");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const result = await deleteCategory(confirmDelete.id);
      if (result.data.success) {
        addToast("Xóa nhóm thuốc thành công!");
      } else {
        addToast(result.data.message || "Lỗi khi xóa nhóm thuốc!", "error");
      }
      loadCategories();
    } catch (error) {
      addToast("Lỗi khi xóa nhóm thuốc!", "error");
      console.error(error);
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.description?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        .cat-root * { font-family: 'DM Sans', sans-serif; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes modalIn {
          from { transform: translateY(14px) scale(.97); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }

        .table-row { transition: background .15s; }
        .table-row:hover { background: #f0f9ff; }

        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px; font-size: .75rem; font-weight: 600; }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      <ConfirmDialog
        open={!!confirmDelete}
        categoryName={confirmDelete?.name}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Modal Thêm/Sửa Nhóm thuốc */}
      {isModalOpen && (
        <ModalOverlay onClose={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[88vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Cập nhật Nhóm thuốc" : "Thêm Nhóm thuốc Mới"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Điền các thông tin cơ bản cho nhóm thuốc
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={18} />
              </button>
            </div>

            <form
              id="categoryForm"
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tên nhóm thuốc <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  placeholder="VD: Thuốc kháng sinh, Thực phẩm chức năng..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tỷ lệ lợi nhuận kỳ vọng (%){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={formData.markupPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      markupPercentage: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-800 font-bold placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  placeholder="VD: 20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mức lợi nhuận này sẽ được dùng để tự động tính giá bán gợi ý.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Mô tả (Không bắt buộc)
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all resize-none"
                  placeholder="Nhập mô tả chi tiết cho nhóm thuốc này..."
                />
              </div>
            </form>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                form="categoryForm"
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.35)",
                }}>
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editingId ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      <div className="cat-root min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
        <div className="animate-page-in space-y-6">
          <div className="px-6 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                  }}>
                  <Tag size={22} color="white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    Quản lý Nhóm thuốc
                  </h1>
                  <p className="text-xs text-slate-500">
                    {categories.length} nhóm thuốc ·{" "}
                    {new Date().toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "numeric",
                      month: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
                  boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
                }}>
                <Plus size={18} strokeWidth={2.5} /> Thêm nhóm thuốc
              </button>
            </div>

            {/* Search & Stats Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-sky-100 px-5 py-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[220px] max-w-4.5xl">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mô tả..."
                  className="w-full pl-9 py-2.5 text-sm border bg-white text-slate-800 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="badge"
                  style={{
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                    color: "#fff",
                  }}>
                  {filteredCategories.length} / {categories.length} nhóm thuốc
                </span>
                {searchTerm && (
                  <span
                    className="badge"
                    style={{ background: "#fef3c7", color: "#92400e" }}>
                    Đang lọc
                  </span>
                )}
              </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Loader2 size={32} className="animate-spin text-sky-400" />
                  <span className="text-sm">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead
                    style={{
                      background: "linear-gradient(90deg,#f8fbff,#eef5ff)",
                    }}>
                    <tr
                      style={{
                        background:
                          "linear-gradient(90deg, #fff 0%, #fff 100%)",
                      }}>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        Tên nhóm thuốc
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 w-36">
                        Tỷ lệ Lợi Nhuận
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        Mô tả
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center w-28">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat, idx) => (
                        <tr
                          key={cat._id}
                          className="table-row row-anim border-b border-gray-50 last:border-0 hover:bg-[#0ea5e9]/5">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  background: `hsl(${(idx * 47 + 200) % 360}, 70%, 93%)`,
                                }}>
                                <Tag
                                  size={13}
                                  style={{
                                    color: `hsl(${(idx * 47 + 200) % 360}, 65%, 40%)`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-800">
                                {cat.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-full border border-emerald-100">
                              <TrendingUp size={13} className="mr-1" />
                              {cat.markupPercentage !== undefined
                                ? cat.markupPercentage * 100
                                : 20}
                              %
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500">
                              {cat.description || (
                                <span className="italic text-gray-300">
                                  Chưa có mô tả
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(cat)}
                                title="Chỉnh sửa"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-sky-50 hover:text-blue-700 transition-all">
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    id: cat._id,
                                    name: cat.name,
                                  })
                                }
                                title="Xóa"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <FolderOpen size={40} className="text-gray-200" />
                            <div>
                              {searchTerm ? (
                                <>
                                  <p className="text-sm font-medium text-gray-500">
                                    Không tìm thấy kết quả
                                  </p>
                                  <p className="text-xs mt-1">
                                    Không có nhóm thuốc nào phù hợp với{" "}
                                    <strong className="text-[#0ea5e9]">
                                      "{searchTerm}"
                                    </strong>
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm">
                                  Chưa có nhóm thuốc nào. Hãy thêm mới!
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryList;
