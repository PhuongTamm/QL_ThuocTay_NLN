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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const MedicineList = () => {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho Bộ Lọc & Tìm Kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterRx, setFilterRx] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // ================= STATES: MODAL SỬA THUỐC GỐC =================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [editImages, setEditImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);

  // ================= STATES: MODAL QUY CÁCH (VARIANT) =================
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

  // ================= HOOKS & LOAD DỮ LIỆU =================
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

  // ================= XỬ LÝ THUỐC GỐC (MEDICINE) =================
  const handleDeleteMedicine = async (medicineId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa thuốc gốc này? Các biến thể liên quan cũng sẽ bị ảnh hưởng.",
      )
    ) {
      try {
        await api.delete(`/medicines/${medicineId}`);
        fetchData();
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

  // ================= XỬ LÝ QUY CÁCH (VARIANT) =================
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

      // Tự động mở dòng thuốc gốc để xem ngay
      if (!expandedRows.includes(selectedMedicineForVariant._id)) {
        setExpandedRows([...expandedRows, selectedMedicineForVariant._id]);
      }
      fetchData();
    } catch (error) {
      // Hiển thị thông báo lỗi rõ ràng nếu trùng SKU hoặc trùng Đơn vị tính
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
    setIsSubmitting(true);
    try {
      await api.put(`/medicines/variants/${editingVariant._id}`, {
        name: editingVariant.name,
        packagingSpecification: editingVariant.packagingSpecification,
        currentPrice: Number(editingVariant.currentPrice),
        // Không truyền unit và sku lên để tránh bị sửa ở DB
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // ================= LỌC & SẮP XẾP =================
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

  // ================= RENDER GIAO DIỆN =================
  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Danh mục Thuốc</h1>
        <button
          onClick={() => navigate("/medicines/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm">
          <Plus size={20} /> Thêm thuốc gốc
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* THANH CÔNG CỤ TÌM KIẾM */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="relative md:col-span-5">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã thuốc, tên, hoạt chất, mã vạch (SKU)..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative md:col-span-3">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <select
                value={filterRx}
                onChange={(e) => setFilterRx(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="all">Loại kê đơn</option>
                <option value="rx">Thuốc kê đơn (Rx)</option>
                <option value="non-rx">Không kê đơn</option>
              </select>
            </div>
            <div className="relative md:col-span-2">
              <ArrowUpDown
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                <option value="newest">Mới nhất</option>
                <option value="name_asc">Tên (A-Z)</option>
                <option value="name_desc">Tên (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 text-sm">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4 w-16">Hình ảnh</th>
                <th className="p-4">Mã Thuốc</th>
                <th className="p-4">Tên thuốc (Gốc)</th>
                <th className="p-4">Hoạt chất</th>
                <th className="p-4 text-center">Danh mục</th>
                <th className="p-4 text-center">Phân loại</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredAndSortedMedicines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Search size={40} className="mb-3 opacity-20" />
                      <p className="text-lg font-medium text-gray-600">
                        Không tìm thấy kết quả nào!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedMedicines.map((med) => (
                  <React.Fragment key={med._id}>
                    {/* DÒNG THUỐC GỐC */}
                    <tr className="hover:bg-blue-50/50 transition duration-150">
                      <td
                        className="p-4 text-center cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          {expandedRows.includes(med._id) ? (
                            <ChevronDown size={20} />
                          ) : (
                            <ChevronRight size={20} />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {med.images && med.images.length > 0 ? (
                          <img
                            src={med.images[0]}
                            alt={med.name}
                            className="w-10 h-10 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-[10px]">
                            Trống
                          </div>
                        )}
                      </td>
                      <td
                        className="p-4 font-mono font-bold text-gray-600 text-sm cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        {med.code || "---"}
                      </td>
                      <td
                        className="p-4 font-semibold text-gray-800 cursor-pointer"
                        onClick={() => toggleRow(med._id)}>
                        {med.name} <br />
                        {med.variants?.length > 0 && (
                          <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold">
                            {med.variants.length} quy cách
                          </span>
                        )}
                      </td>
                      <td
                        className="p-4 text-gray-600 text-sm max-w-[200px] truncate"
                        title={med.ingredients}>
                        {med.ingredients || "---"}
                      </td>
                      <td className="p-4 text-center text-gray-600 text-sm font-medium">
                        {med.categoryId?.name || "---"}
                      </td>
                      <td className="p-4 text-center">
                        {med.isPrescription ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-[11px] rounded-full font-bold">
                            Rx - Kê đơn
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[11px] rounded-full font-bold">
                            Không kê đơn
                          </span>
                        )}
                      </td>
                      <td className="p-4 flex justify-end gap-2">
                        <button
                          title="Thêm quy cách"
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                          onClick={() => handleOpenAddVariantModal(med)}>
                          <PackagePlus size={18} />
                        </button>
                        <button
                          title="Sửa thuốc gốc"
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          onClick={() => handleOpenEditModal(med)}>
                          <Edit size={18} />
                        </button>
                        <button
                          title="Xóa thuốc gốc"
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          onClick={() => handleDeleteMedicine(med._id)}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG BIẾN THỂ */}
                    {expandedRows.includes(med._id) && (
                      <tr className="bg-gray-50/80 border-b-2 border-gray-200 shadow-inner">
                        <td colSpan="8" className="p-0">
                          <div className="px-14 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                              <ChevronRight
                                size={16}
                                className="text-gray-400"
                              />{" "}
                              Danh sách quy cách (Biến thể)
                            </h4>
                            {med.variants && med.variants.length > 0 ? (
                              <table className="w-full text-sm bg-white border rounded-lg shadow-sm">
                                <thead className="bg-gray-100 text-gray-600">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-medium border-b">
                                      Mã SKU (Barcode)
                                    </th>
                                    <th className="px-4 py-2 text-left font-medium border-b">
                                      Tên quy cách hiển thị
                                    </th>
                                    <th className="px-4 py-2 text-center font-medium border-b">
                                      Đơn vị
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium border-b">
                                      Giá bán lẻ
                                    </th>
                                    <th className="px-4 py-2 text-right font-medium border-b w-24">
                                      Thao tác
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {med.variants.map((variant) => (
                                    <tr
                                      key={variant._id}
                                      className="hover:bg-blue-50/30">
                                      <td className="px-4 py-3 font-mono font-medium text-blue-600">
                                        {variant.sku || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 font-medium text-gray-800">
                                        {variant.name}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                                          {variant.unit}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-bold text-orange-600">
                                        {formatCurrency(variant.currentPrice)}
                                      </td>
                                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                                        <button
                                          className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                                          onClick={() =>
                                            handleOpenEditVariant(variant)
                                          }>
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                          onClick={() =>
                                            handleDeleteVariant(variant._id)
                                          }>
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                                Thuốc này chưa có quy cách đóng gói nào. Bấm nút
                                màu xanh lá ở trên để thêm!
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

      {/* ================= MODAL 1: SỬA THUỐC GỐC (FLEX SCROLL) ================= */}
      {isEditModalOpen && editingMed && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Cấu trúc Flex Column & Max-Height để fix lỗi tràn màn hình */}
          <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col">
            {/* Header cố định */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Cập nhật Thuốc Gốc
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            {/* Body cuộn được */}
            <form
              id="editMedicineForm"
              onSubmit={handleSaveEdit}
              className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Tên thuốc
                  </label>
                  <input
                    required
                    value={editingMed.name}
                    onChange={(e) =>
                      setEditingMed({ ...editingMed, name: e.target.value })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hoạt chất
                  </label>
                  <input
                    value={editingMed.ingredients || ""}
                    onChange={(e) =>
                      setEditingMed({
                        ...editingMed,
                        ingredients: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nhà sản xuất
                  </label>
                  <input
                    value={editingMed.manufacturer || ""}
                    onChange={(e) =>
                      setEditingMed({
                        ...editingMed,
                        manufacturer: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={editingMed.isPrescription}
                  onChange={(e) =>
                    setEditingMed({
                      ...editingMed,
                      isPrescription: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="font-medium text-gray-700">
                  Thuốc kê đơn (Rx)
                </span>
              </div>

              {/* Upload & Hiển thị ảnh */}
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  Cập nhật Hình ảnh
                </label>
                {editingMed.images && editingMed.images.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Ảnh hiện tại trên hệ thống:
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {editingMed.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Đã có"
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-lg p-4 flex flex-col items-center relative hover:bg-blue-50 transition cursor-pointer">
                  <UploadCloud size={28} className="mb-2 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">
                    Nhấp để tải thêm ảnh mới
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {editImagePreviews.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-green-600 mb-1 font-medium">
                      Ảnh mới chuẩn bị thêm:
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {editImagePreviews.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 flex-shrink-0 rounded-lg border shadow-sm">
                          <img
                            src={src}
                            alt="preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImagePreview(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Footer cố định */}
            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">
                Hủy
              </button>
              <button
                form="editMedicineForm"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: THÊM QUY CÁCH MỚI (FLEX SCROLL) ================= */}
      {isAddVariantModalOpen && selectedMedicineForVariant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Thêm Quy Cách Mới
                </h2>
                <p className="text-sm text-gray-500">
                  Cho thuốc:{" "}
                  <span className="font-bold text-blue-600">
                    {selectedMedicineForVariant.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsAddVariantModalOpen(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form
              id="addVariantForm"
              onSubmit={handleSaveVariant}
              className="p-6 overflow-y-auto space-y-4">
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg flex gap-2 text-sm border border-yellow-200">
                <AlertCircle size={18} className="text-yellow-600 shrink-0" />
                <span>
                  Lưu ý: Không được tạo 2 quy cách có cùng Đơn vị bán.
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên hiển thị
                </label>
                <input
                  required
                  value={newVariant.name}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, name: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Paracetamol (Hộp)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* ... (Các ô Đơn vị bán và Giá bán lẻ cũ giữ nguyên) ... */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đơn vị bán (Bắt buộc)
                  </label>
                  <select
                    value={newVariant.unit}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, unit: e.target.value })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Hộp">Hộp</option>
                    <option value="Vỉ">Vỉ</option>
                    <option value="Gói">Gói</option>
                    <option value="Viên">Viên</option>
                    <option value="Lọ">Lọ</option>
                    <option value="Chai">Chai</option>
                    <option value="Tuýp">Tuýp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá bán lẻ (VNĐ)
                  </label>
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
                    className="w-full border border-blue-300 p-2 rounded outline-none font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-purple-600">
                  Tỷ lệ quy đổi ra Đơn vị cơ sở
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
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="VD: 1 Hộp = 100 Viên -> Nhập 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Mô tả đóng gói
                </label>
                <input
                  value={newVariant.packagingSpecification}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      packagingSpecification: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hộp 5 vỉ x 10 viên"
                />
              </div>
            </form>

            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsAddVariantModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">
                Hủy
              </button>
              <button
                form="addVariantForm"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-green-700">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Thêm quy cách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SỬA QUY CÁCH (KHÓA SKU VÀ ĐƠN VỊ TÍNH) ================= */}
      {isEditVariantModalOpen && editingVariant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Cập nhật Quy Cách
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Mã SKU:{" "}
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {editingVariant.sku}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsEditVariantModalOpen(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form
              id="editVariantForm"
              onSubmit={handleSaveEditVariant}
              className="p-6 overflow-y-auto space-y-5">
              {/* Tên hiển thị */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên hiển thị quy cách
                </label>
                <input
                  required
                  value={editingVariant.name}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      name: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Đơn vị tính (Khóa - Chỉ đọc) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Đơn vị bán{" "}
                  </label>
                  <input
                    value={editingVariant.unit}
                    disabled
                    className="w-full border p-2 rounded outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-medium"
                  />
                </div>

                {/* Giá bán lẻ */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá bán lẻ (VNĐ)
                  </label>
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
                    className="w-full border border-blue-300 p-2 rounded outline-none font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Mô tả đóng gói */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mô tả đóng gói
                </label>
                <input
                  value={editingVariant.packagingSpecification || ""}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      packagingSpecification: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hộp 10 vỉ"
                />
              </div>
            </form>

            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsEditVariantModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">
                Hủy
              </button>
              <button
                form="editVariantForm"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineList;
