import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  Filter,
  ArrowUpDown,
  X,
  Save,
  UploadCloud,
  Loader2,
  AlertCircle,
  Pill,
  Package,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

/* ─── Modal wrapper ─── */
const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

const MedicineList = () => {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterRx, setFilterRx] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [editImages, setEditImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);

  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false);
  const [selectedMedicineForVariant, setSelectedMedicineForVariant] =
    useState(null);
  const [newVariant, setNewVariant] = useState({
    sku: "",
    name: "",
    unit: "Hộp",
    packagingSpecification: "",
    currentPrice: 0,
    conversionRate: 1,
  });

  const [isEditVariantModalOpen, setIsEditVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [viewingImages, setViewingImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openImageViewer = (images) => {
    if (!images || images.length === 0) return;
    setViewingImages(images);
    setCurrentImageIndex(0);
  };
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
      setMedicines(medRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (medicineId) => {
    if (expandedRows.includes(medicineId)) {
      setExpandedRows(expandedRows.filter((id) => id !== medicineId));
    } else {
      setExpandedRows([...expandedRows, medicineId]);
    }
  };

  const handleDeleteMedicine = async (medicineId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa thuốc gốc này? Các biến thể liên quan cũng sẽ bị ảnh hưởng.",
      )
    ) {
      try {
        const response = await api.delete(`/medicines/${medicineId}`);
        if (response.success) {
          window.alert("Xóa thuốc gốc thành công!");
          fetchData();
        } else {
          window.alert(
            "Xóa thuốc gốc thất bại: " +
              (response.message || "Lỗi không xác định"),
          );
        }
      } catch (error) {
        alert(error.response?.data?.message || "Đã xảy ra lỗi khi xóa thuốc!");
      }
    }
  };

  const handleOpenEditModal = (med) => {
    setEditingMed({ ...med });
    setEditImages([]);
    setEditImagePreviews([]);
    setIsEditModalOpen(true);
  };

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files);
    setEditImages([...editImages, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setEditImagePreviews([...editImagePreviews, ...previews]);
  };

  const removeEditImagePreview = (index) => {
    const newImages = [...editImages];
    newImages.splice(index, 1);
    setEditImages(newImages);
    const newPreviews = [...editImagePreviews];
    newPreviews.splice(index, 1);
    setEditImagePreviews(newPreviews);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", editingMed.name);
      formData.append("ingredients", editingMed.ingredients || "");
      formData.append("manufacturer", editingMed.manufacturer || "");
      formData.append("isPrescription", editingMed.isPrescription);
      formData.append("description", editingMed.description || "");
      editImages.forEach((img) => {
        formData.append("images", img);
      });
      await api.put(`/medicines/${editingMed._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa quy cách này? Hành động không thể hoàn tác.",
      )
    ) {
      try {
        await api.delete(`/medicines/variants/${variantId}`);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || "Lỗi khi xóa quy cách!");
      }
    }
  };

  const handleOpenAddVariantModal = (med) => {
    setSelectedMedicineForVariant(med);
    setNewVariant({
      sku: "",
      name: med.name,
      unit: "Hộp",
      packagingSpecification: "",
      currentPrice: 0,
    });
    setIsAddVariantModalOpen(true);
  };

  const handleSaveVariant = async (e) => {
    e.preventDefault();
    if (newVariant.name.trim() === "")
      return alert("Tên hiển thị không được để trống!");
    if (Number(newVariant.currentPrice) < 0)
      return alert("Giá bán lẻ không được nhỏ hơn 0!");
    setIsSubmitting(true);
    try {
      const payload = {
        medicineId: selectedMedicineForVariant._id,
        sku: newVariant.sku,
        name: newVariant.name,
        unit: newVariant.unit,
        packagingSpecification: newVariant.packagingSpecification,
        currentPrice: Number(newVariant.currentPrice),
        conversionRate: Number(newVariant.conversionRate),
      };
      const response = await api.post("/medicines/variants", payload);
      if (response.data.success) {
        window.alert("Thêm quy cách thành công!");
        setIsAddVariantModalOpen(false);
      } else {
        window.alert(
          "Thêm quy cách thất bại: " +
            (response.message || "Lỗi không xác định"),
        );
      }
      if (!expandedRows.includes(selectedMedicineForVariant._id)) {
        setExpandedRows([...expandedRows, selectedMedicineForVariant._id]);
      }
      fetchData();
    } catch (error) {
      alert(
        error.response?.data?.message || "Đã xảy ra lỗi khi thêm quy cách!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditVariant = (variant) => {
    setEditingVariant({ ...variant });
    setIsEditVariantModalOpen(true);
  };

  const handleSaveEditVariant = async (e) => {
    e.preventDefault();
    if (editingVariant.name.trim() === "")
      return alert("Tên hiển thị không được để trống!");
    if (Number(editingVariant.currentPrice) < 0)
      return alert("Giá bán lẻ không được nhỏ hơn 0!");
    if (Number(editingVariant.conversionRate) < 1)
      return alert("Tỷ lệ quy đổi phải lớn hơn hoặc bằng 1!");
    setIsSubmitting(true);
    try {
      await api.put(`/medicines/variants/${editingVariant._id}`, {
        name: editingVariant.name,
        packagingSpecification: editingVariant.packagingSpecification,
        currentPrice: Number(editingVariant.currentPrice),
        conversionRate: Number(editingVariant.conversionRate),
      });
      setIsEditVariantModalOpen(false);
      fetchData();
    } catch (error) {
      alert(
        error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật quy cách!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);

  const filteredAndSortedMedicines = medicines
    .filter((med) => {
      const term = searchTerm.toLowerCase();
      const matchName = med.name.toLowerCase().includes(term);
      const matchIngredients = (med.ingredients || "")
        .toLowerCase()
        .includes(term);
      const matchCode = (med.code || "").toLowerCase().includes(term);
      const matchVariantSku = med.variants?.some(
        (v) =>
          v.sku.toLowerCase().includes(term) ||
          v.name.toLowerCase().includes(term),
      );
      const isMatchSearch =
        matchName || matchIngredients || matchCode || matchVariantSku;
      const isMatchCategory =
        selectedCategory === "" || med.categoryId?._id === selectedCategory;
      let isMatchRx = true;
      if (filterRx === "rx") isMatchRx = med.isPrescription === true;
      if (filterRx === "non-rx") isMatchRx = med.isPrescription === false;
      return isMatchSearch && isMatchCategory && isMatchRx;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      return 0;
    });

  /* ─── Shared input style ─── */
  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition bg-white text-slate-800 placeholder:text-slate-400";
  const labelCls =
    "block text-xs font-700 text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
            }}>
            <Pill size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Danh mục Thuốc
            </h1>
            <p className="text-xs text-slate-500">
              {filteredAndSortedMedicines.length} sản phẩm ·{" "}
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "numeric",
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/medicines/new")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
            boxShadow: "0 4px 14px rgba(14,165,233,.4)",
          }}>
          <Plus size={18} strokeWidth={2.5} /> Thêm thuốc gốc
        </button>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-5">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã thuốc, tên, hoạt chất, SKU..."
              className={inputCls + " pl-10"}
            />
          </div>
          {/* Category */}
          <div className="relative md:col-span-3">
            <Filter
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={inputCls + " pl-9 appearance-none"}>
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {/* Rx Filter */}
          <div className="md:col-span-2">
            <select
              value={filterRx}
              onChange={(e) => setFilterRx(e.target.value)}
              className={inputCls}>
              <option value="all">Tất cả loại</option>
              <option value="rx">Thuốc kê đơn (Rx)</option>
              <option value="non-rx">Không kê đơn</option>
            </select>
          </div>
          {/* Sort */}
          <div className="relative md:col-span-2">
            <ArrowUpDown
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={inputCls + " pl-9 appearance-none"}>
              <option value="newest">Mới nhất</option>
              <option value="name_asc">Tên (A→Z)</option>
              <option value="name_desc">Tên (Z→A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r border-b border-slate-100">
                <th className="p-4 w-10"></th>
                <th className="p-4 w-16 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Ảnh
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mã thuốc
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Tên thuốc
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Hoạt chất
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Danh mục
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Phân loại
                </th>
                <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2
                        size={32}
                        className="animate-spin text-sky-400"
                      />
                      <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedMedicines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Search size={28} className="text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-500">
                        Không tìm thấy kết quả
                      </p>
                      <p className="text-sm text-slate-400">
                        Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedMedicines.map((med) => (
                  <React.Fragment key={med._id}>
                    {/* MEDICINE ROW */}
                    <tr className="hover:bg-sky-50/40 transition-colors duration-150 group">
                      <td
                        className="p-4 text-center cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-sky-100 hover:text-sky-600 transition-all">
                          {expandedRows.includes(med._id) ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {med.images && med.images.length > 0 ? (
                          <img
                            src={med.images[0]}
                            alt={med.name}
                            onClick={() => openImageViewer(med.images)}
                            title="Bấm để xem tất cả ảnh"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border border-slate-100 flex items-center justify-center">
                            <Package size={16} className="text-sky-300" />
                          </div>
                        )}
                      </td>
                      <td
                        className="p-4 cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        <span className="font-mono text-sm font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                          {med.code || "---"}
                        </span>
                      </td>
                      <td
                        className="p-4 cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">
                          {med.name}
                        </p>
                        {med.variants?.length > 0 && (
                          <span className="inline-block mt-1 bg-sky-100 text-sky-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {med.variants.length} quy cách
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-[180px]">
                        <p
                          className="text-sm text-slate-500 truncate"
                          title={med.ingredients}>
                          {med.ingredients || "---"}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        {med.categoryId?.name ? (
                          <span className="inline-flex items-center px-2.5 py-1 text-slate-700 text-[11px] rounded-full font-bold">
                            {med.categoryId.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 text-slate-400 text-[11px] rounded-full font-bold border border-slate-100">
                            ---
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {med.isPrescription ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-[11px] rounded-full font-bold border border-red-100">
                            Rx · Kê đơn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] rounded-full font-bold border border-emerald-100">
                            Không kê đơn
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            title="Thêm quy cách"
                            onClick={() => handleOpenAddVariantModal(med)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all hover:scale-110">
                            <PackagePlus size={17} />
                          </button>
                          <button
                            title="Sửa thuốc gốc"
                            onClick={() => handleOpenEditModal(med)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-sky-600 hover:bg-sky-50 transition-all hover:scale-110">
                            <Edit size={17} />
                          </button>
                          <button
                            title="Xóa thuốc gốc"
                            onClick={() => handleDeleteMedicine(med._id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-all hover:scale-110">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* VARIANT ROWS */}
                    {expandedRows.includes(med._id) && (
                      <tr className="bg-gradient-to-r from-sky-50/60 to-cyan-50/40">
                        <td colSpan="8" className="px-6 py-4">
                          <div className="pl-10">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-cyan-400" />
                              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                Danh sách quy cách / Biến thể
                              </h4>
                            </div>

                            {med.variants && med.variants.length > 0 ? (
                              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                      <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        Mã SKU
                                      </th>
                                      <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        Tên thuốc
                                      </th>
                                      <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        Đơn vị
                                      </th>
                                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        Giá bán lẻ
                                      </th>
                                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wide w-24">
                                        Thao tác
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {med.variants.map((variant) => (
                                      <tr
                                        key={variant._id}
                                        className="hover:bg-sky-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                          <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                                            {variant.sku || "N/A"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-700 text-sm">
                                          {variant.name}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                            {variant.unit}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-red-500">
                                          {formatCurrency(variant.currentPrice)}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex justify-end gap-1.5">
                                            <button
                                              onClick={() =>
                                                handleOpenEditVariant(variant)
                                              }
                                              className="w-7 h-7 flex items-center justify-center rounded-lg text-sky-500 hover:bg-sky-50 transition-all">
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteVariant(variant._id)
                                              }
                                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-all">
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                                <AlertCircle
                                  size={16}
                                  className="text-amber-500 shrink-0"
                                />
                                Thuốc này chưa có quy cách đóng gói. Bấm nút{" "}
                                <PackagePlus
                                  size={14}
                                  className="inline text-emerald-500"
                                />{" "}
                                để thêm.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LIGHTBOX XEM ẢNH THUỐC
      ══════════════════════════════════════════ */}
      {viewingImages && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewingImages(null)}
          style={{ animation: "fadeIn .2s ease" }}>
          <button className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10">
            <X size={24} />
          </button>

          {viewingImages.length > 1 && (
            <button
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) =>
                  prev === 0 ? viewingImages.length - 1 : prev - 1,
                );
              }}>
              <ChevronLeft size={28} />
            </button>
          )}

          <img
            src={viewingImages[currentImageIndex]}
            alt="Medicine preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {viewingImages.length > 1 && (
            <button
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) =>
                  prev === viewingImages.length - 1 ? 0 : prev + 1,
                );
              }}>
              <ChevronRight size={28} />
            </button>
          )}

          {viewingImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 px-4 py-2 rounded-full">
              {viewingImages.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${i === currentImageIndex ? "bg-white scale-125" : "bg-white/30 hover:bg-white/50"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(i);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 1: SỬA THUỐC GỐC
      ══════════════════════════════════════════ */}
      {isEditModalOpen && editingMed && (
        <ModalOverlay onClose={() => setIsEditModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[88vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cập nhật Thuốc Gốc
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingMed.code}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form
              id="editMedicineForm"
              onSubmit={handleSaveEdit}
              className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Tên thuốc</label>
                  <input
                    required
                    value={editingMed.name}
                    onChange={(e) =>
                      setEditingMed({ ...editingMed, name: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Tên thuốc gốc..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Hoạt chất</label>
                  <input
                    value={editingMed.ingredients || ""}
                    onChange={(e) =>
                      setEditingMed({
                        ...editingMed,
                        ingredients: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="VD: Paracetamol 500mg"
                  />
                </div>
                <div>
                  <label className={labelCls}>Nhà sản xuất</label>
                  <input
                    value={editingMed.manufacturer || ""}
                    onChange={(e) =>
                      setEditingMed({
                        ...editingMed,
                        manufacturer: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="VD: DHG Pharma"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={editingMed.isPrescription}
                  onChange={(e) =>
                    setEditingMed({
                      ...editingMed,
                      isPrescription: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-sky-500 rounded"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Thuốc kê đơn (Rx)
                </span>
              </label>

              <div>
                <label className={labelCls}>Mô tả chi tiết / Cách dùng</label>
                <textarea
                  value={editingMed.description || ""}
                  onChange={(e) =>
                    setEditingMed({
                      ...editingMed,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                  className={inputCls + " resize-none"}
                  placeholder="Mô tả công dụng, liều dùng..."
                />
              </div>

              {/* Image upload */}
              <div className="pt-4 border-t border-slate-100">
                <label className={labelCls}>Hình ảnh</label>
                {editingMed.images && editingMed.images.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-1.5">
                      Ảnh hiện tại:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {editingMed.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Đã có"
                          className="w-14 h-14 object-cover rounded-xl border border-slate-100 shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-sky-200 bg-sky-50/50 rounded-xl cursor-pointer hover:bg-sky-50 transition-colors">
                  <UploadCloud size={24} className="text-sky-400" />
                  <span className="text-sm font-semibold text-sky-600">
                    Nhấp để tải thêm ảnh mới
                  </span>
                  <span className="text-xs text-slate-400">PNG, JPG, WEBP</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="hidden"
                  />
                </label>
                {editImagePreviews.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {editImagePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-xl overflow-visible">
                        <img
                          src={src}
                          alt="preview"
                          className="w-full h-full object-cover rounded-xl border border-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditImagePreview(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                form="editMedicineForm"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                  boxShadow: "0 4px 12px rgba(14,165,233,.35)",
                }}>
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Cập nhật
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════
          MODAL 2: THÊM QUY CÁCH MỚI
      ══════════════════════════════════════════ */}
      {isAddVariantModalOpen && selectedMedicineForVariant && (
        <ModalOverlay onClose={() => setIsAddVariantModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[88vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Thêm Quy Cách Mới
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cho thuốc:{" "}
                  <span className="font-bold text-sky-600">
                    {selectedMedicineForVariant.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsAddVariantModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={18} />
              </button>
            </div>

            <form
              id="addVariantForm"
              onSubmit={handleSaveVariant}
              className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertCircle
                  size={16}
                  className="text-amber-500 mt-0.5 shrink-0"
                />
                Lưu ý: Không được tạo 2 quy cách có cùng Đơn vị bán.
              </div>

              <div>
                <label className={labelCls}>Tên hiển thị</label>
                <input
                  required
                  value={newVariant.name}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, name: e.target.value })
                  }
                  className={inputCls}
                  placeholder="VD: Paracetamol (Hộp)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Đơn vị bán</label>
                  <select
                    value={newVariant.unit}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, unit: e.target.value })
                    }
                    className={inputCls}>
                    <option value="Hộp">Hộp</option>
                    <option value="Vỉ">Vỉ</option>
                    <option value="Gói">Gói</option>
                    <option value="Viên">Viên</option>
                    <option value="Lọ">Lọ</option>
                    <option value="Chai">Chai</option>
                    <option value="Tuýp">Tuýp</option>
                    <option value="Ống">Ống</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Giá bán lẻ (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newVariant.currentPrice}
                    onChange={(e) =>
                      setNewVariant({
                        ...newVariant,
                        currentPrice: e.target.value,
                      })
                    }
                    className={inputCls + " font-bold text-sky-600"}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls + " text-sky-600"}>
                  Tỷ lệ quy đổi ra đơn vị cơ sở
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newVariant.conversionRate}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      conversionRate: e.target.value,
                    })
                  }
                  className={
                    inputCls + " focus:ring-violet-400 focus:border-violet-400"
                  }
                  placeholder="VD: 1 Hộp = 100 Viên → Nhập 100"
                />
              </div>

              <div>
                <label className={labelCls}>Mô tả đóng gói</label>
                <input
                  value={newVariant.packagingSpecification}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      packagingSpecification: e.target.value,
                    })
                  }
                  className={inputCls}
                  placeholder="VD: Hộp 5 vỉ x 10 viên"
                />
              </div>
            </form>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsAddVariantModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                form="addVariantForm"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  boxShadow: "0 4px 12px rgba(16,185,129,.35)",
                }}>
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Thêm quy cách
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════
          MODAL 3: SỬA QUY CÁCH
      ══════════════════════════════════════════ */}
      {isEditVariantModalOpen && editingVariant && (
        <ModalOverlay onClose={() => setIsEditVariantModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[88vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cập nhật Quy Cách
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mã SKU:{" "}
                  <span className="font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-lg">
                    {editingVariant.sku}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsEditVariantModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={18} />
              </button>
            </div>

            <form
              id="editVariantForm"
              onSubmit={handleSaveEditVariant}
              className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className={labelCls}>Tên hiển thị quy cách</label>
                <input
                  required
                  value={editingVariant.name}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      name: e.target.value,
                    })
                  }
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Đơn vị bán (Khóa)</label>
                  <input
                    value={editingVariant.unit}
                    disabled
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed font-medium"
                  />
                </div>
                <div>
                  <label className={labelCls}>Giá bán lẻ (VNĐ)</label>
                  <input
                    type="number"
                    required
                    value={editingVariant.currentPrice}
                    onChange={(e) =>
                      setEditingVariant({
                        ...editingVariant,
                        currentPrice: e.target.value,
                      })
                    }
                    className={inputCls + " font-bold text-sky-600"}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Mô tả đóng gói</label>
                <input
                  value={editingVariant.packagingSpecification || ""}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      packagingSpecification: e.target.value,
                    })
                  }
                  className={inputCls}
                  placeholder="VD: Hộp 10 vỉ"
                />
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <label className={labelCls + " text-sky-600"}>
                  Tỷ lệ quy đổi ra đơn vị cơ sở{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingVariant.conversionRate || 1}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      conversionRate: e.target.value,
                    })
                  }
                  className={
                    inputCls + " focus:ring-sky-400 focus:border-sky-400"
                  }
                  placeholder="VD: 100"
                />
              </div>
            </form>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsEditVariantModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                form="editVariantForm"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                  boxShadow: "0 4px 12px rgba(14,165,233,.35)",
                }}>
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes modalIn {
          from { transform: translateY(14px) scale(.97); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MedicineList;
