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
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../../services/api";

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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
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
          Bạn có chắc muốn xóa danh mục{" "}
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
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
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
      console.error("Lỗi khi tải danh mục", error);
      addToast("Không thể tải danh mục. Vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const result = await updateCategory(editingId, formData);
        if (result.data.success) {
          addToast("Cập nhật danh mục thành công!");
        } else {
          addToast(result.data.message || "Cập nhật thất bại!", "error");
        }
      } else {
        const result = await createCategory(formData);
        if (result.data.success) {
          addToast("Thêm danh mục thành công!");
        } else {
          addToast(result.data.message || "Thêm thất bại!", "error");
        }
      }
      setFormData({ name: "", description: "" });
      setEditingId(null);
      loadCategories();
    } catch (error) {
      addToast("Lỗi xử lý. Vui lòng thử lại!", "error");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setFormData({ name: category.name, description: category.description });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const result = await deleteCategory(confirmDelete.id);
      if (result.data.success) {
        addToast("Xóa danh mục thành công!");
      } else {
        addToast(result.data.message || "Lỗi khi xóa danh mục!", "error");
      }
      loadCategories();
    } catch (error) {
      addToast("Lỗi khi xóa danh mục!", "error");
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

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <>
      <style>{`
        .cat-root * { font-family: 'DM Sans', sans-serif; }
        .cat-root .brand-font { font-family: 'Sora', sans-serif; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .row-anim:nth-child(1)  { animation-delay: .04s }
        .row-anim:nth-child(2)  { animation-delay: .08s }
        .row-anim:nth-child(3)  { animation-delay: .12s }
        .row-anim:nth-child(4)  { animation-delay: .16s }
        .row-anim:nth-child(5)  { animation-delay: .20s }
        .row-anim:nth-child(n+6){ animation-delay: .24s }

        .focus-ring:focus { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,.25); border-color: #0ea5e9; }

        .cat-btn-primary {
          background: linear-gradient(135deg, #0ea5e9 0%, #0ea5e9 100%);
          color: white; border: none;
          transition: all .2s;
        }
        .cat-btn-primary:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.4); }
        .cat-btn-primary:active { transform: translateY(0); }

        .cat-btn-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white; border: none;
          transition: all .2s;
        }
        .cat-btn-warning:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,.35); }

        .table-row { transition: background .15s; }
        .table-row:hover { background: #ebf9ff; }

        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px; font-size: .75rem; font-weight: 600; }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        open={!!confirmDelete}
        categoryName={confirmDelete?.name}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div
        className="cat-root min-h-screen"
        style={{
          background:
            "linear-gradient(135deg, #f0f4f8 0%, #f0f4f8 60%, #f0f4f8 100%)",
        }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #0ea5e9)",
              }}>
              <Tag size={22} color="white" />
            </div>
            <div>
              <h1 className="brand-font text-2xl font-bold text-gray-900">
                Quản lý Danh mục
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Thêm, chỉnh sửa và tổ chức danh mục sản phẩm
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
            >
            <div className="flex items-center gap-2 mb-5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${editingId ? "bg-amber-100" : "bg-[#0ea5e9]"}`}>
                {editingId ? (
                  <Edit size={14} className="text-amber-600" />
                ) : (
                  <Plus size={14} className="text-white" />
                )}
              </div>
              <h2 className="text-sm font-semibold text-gray-700">
                {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  className="focus-ring border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 transition-all"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Ví dụ: Thuốc kháng sinh"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-[2] min-w-[220px]">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Mô tả
                </label>
                <input
                  type="text"
                  className="focus-ring border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 transition-all"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Nhập mô tả danh mục..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`cat-btn-${editingId ? "warning" : "primary"} px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : editingId ? (
                    <Edit size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                    <X size={14} /> Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Search & Stats Bar */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4 flex flex-wrap gap-3 items-center justify-between"
            >
            <div className="relative flex-1 min-w-[220px] max-w-4.5xl">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mô tả..."
                className="focus-ring w-full border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm bg-gray-50 text-gray-700"
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
                style={{ background: "#0ea5e9", color: "#fff" }}>
                {filteredCategories.length} / {categories.length} danh mục
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
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <span className="text-sm">Đang tải dữ liệu...</span>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr
                    style={{
                      background: "linear-gradient(90deg, #fff 0%, #fff 100%)",
                    }}>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Tên danh mục
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
                        className="table-row row-anim border-b border-gray-50 last:border-0">
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
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all">
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
                      <td colSpan="3" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <FolderOpen size={40} className="text-gray-200" />
                          <div>
                            {searchTerm ? (
                              <>
                                <p className="text-sm font-medium text-gray-500">
                                  Không tìm thấy kết quả
                                </p>
                                <p className="text-xs mt-1">
                                  Không có danh mục nào phù hợp với{" "}
                                  <strong className="text-indigo-400">
                                    "{searchTerm}"
                                  </strong>
                                </p>
                              </>
                            ) : (
                              <p className="text-sm">
                                Chưa có danh mục nào. Hãy thêm mới!
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
    </>
  );
};

export default CategoryList;
