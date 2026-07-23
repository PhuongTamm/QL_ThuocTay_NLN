import React, { useState, useEffect } from "react";
import {
  Save,
  ArrowLeft,
  UploadCloud,
  X,
  Loader2,
  Pill,
  Package,
  Image as ImageIcon,
  Info,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const AddMedicine = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState({
    name: "",
    categoryId: "",
    ingredients: "",
    manufacturer: "",
    isPrescription: false,
    description: "",
    variantName: "",
    unitName: "Hộp",
    packagingSpecification: "",
    sku: "",
    sellPrice: 0,
    baseUnit: "Viên",
    conversionRate: 1,
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data.data || []);
      } catch (error) {
        console.error("Lỗi tải danh mục", error);
      }
    };
    loadCategories();
  }, []);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setData({ ...data, [e.target.name]: value });
  };

  const handleNameChange = (e) => {
    setData({ ...data, name: e.target.value, variantName: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.categoryId) return alert("Vui lòng chọn danh mục thuốc!");
    if (data.name.trim() === "")
      return alert("Tên thuốc gốc không được để trống!");
    if (data.variantName.trim() === "")
      return alert("Tên hiển thị quy cách không được để trống!");
    if (Number(data.sellPrice) < 0)
      return alert("Giá bán lẻ không được phép nhỏ hơn 0đ!");
    setIsSubmitting(true);
    try {
      if (!data.categoryId) {
        setIsSubmitting(false);
        return alert("Vui lòng chọn danh mục thuốc!");
      }
      const medicineFormData = new FormData();
      medicineFormData.append("name", data.name);
      medicineFormData.append("categoryId", data.categoryId);
      medicineFormData.append("ingredients", data.ingredients);
      medicineFormData.append("manufacturer", data.manufacturer);
      medicineFormData.append("isPrescription", data.isPrescription);
      medicineFormData.append("description", data.description);
      medicineFormData.append("baseUnit", data.baseUnit);
      images.forEach((img) => {
        medicineFormData.append("images", img);
      });
      const medRes = await api.post("/medicines", medicineFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const medicineId = medRes.data.data._id;
      const variantPayload = {
        medicineId,
        name: data.variantName,
        sku: data.sku,
        unit: data.unitName,
        packagingSpecification: data.packagingSpecification,
        currentPrice: Number(data.sellPrice),
        conversionRate: Number(data.conversionRate),
      };
      await api.post("/medicines/variants", variantPayload);
      alert("Thêm thuốc thành công!");
      navigate("/medicines");
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Định dạng Style dùng chung ── */
  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all bg-slate-50 hover:bg-white text-slate-800 placeholder:text-slate-400";
  const labelCls =
    "block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide";

  /* ── Component Tiêu đề Từng Phần (Cập nhật giống trang Nhập hàng) ── */
  const SectionHeaderBadge = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-slate-600" />
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
        {title}
      </span>
    </div>
  );

  return (
    <div
      className="cat-root min-h-screen bg-gradient-to-br from-sky-50 via-blue-50
      to-slate-50 p-6 font-sans">
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }
      `}</style>

      <div className=" animate-page-in space-y-5">
        {/* ── PAGE HEADER ── */}
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#0ea5e9] hover:border-[#0ea5e9]/40 hover:bg-[#0ea5e9]/5 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thêm Thuốc Mới
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Khởi tạo hồ sơ thuốc gốc và thiết lập quy cách bán ban đầu
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ════ KHỐI 1: THÔNG TIN CƠ BẢN ════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeaderBadge icon={Layers} title="Thông tin thuốc gốc" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>
                  Tên thuốc (Gốc) <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={data.name}
                  onChange={handleNameChange}
                  required
                  className={inputCls}
                  placeholder="VD: Paracetamol 500mg"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Danh mục thuốc <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoryId"
                  onChange={handleChange}
                  required
                  className={inputCls + " appearance-none cursor-pointer"}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Nhà sản xuất</label>
                <input
                  name="manufacturer"
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="VD: DHG Pharma"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Hoạt chất chính</label>
                <input
                  name="ingredients"
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="VD: Paracetamol, Ibuprofen..."
                />
              </div>

              <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">
                    Thuốc Kê Đơn (Rx)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đánh dấu nếu thuốc này yêu cầu phải có đơn của bác sĩ.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPrescription"
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0ea5e9]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* ════ KHỐI 2: ĐƠN VỊ VÀ QUY CÁCH ════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeaderBadge
              icon={Package}
              title="Thiết lập Quy cách & Giá bán"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>
                  Tên hiển thị (Theo quy cách){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="variantName"
                  value={data.variantName}
                  onChange={handleChange}
                  required
                  className={inputCls}
                  placeholder="VD: Paracetamol 500mg (Hộp 10 vỉ)"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Đơn vị bán <span className="text-red-500">*</span>
                </label>
                <select
                  name="unitName"
                  onChange={handleChange}
                  className={inputCls + " appearance-none cursor-pointer"}>
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
                <label className={labelCls}>
                  Giá bán lẻ (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  name="sellPrice"
                  onChange={handleChange}
                  required
                  className={
                    inputCls + " font-bold text-[#0ea5e9] tracking-wide"
                  }
                  placeholder="0"
                />
              </div>

              {/* Tỷ lệ quy đổi Box */}
              <div className="md:col-span-2 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info size={16} className="text-[#0ea5e9] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#0ea5e9] text-xs uppercase tracking-wide">
                      Hệ số quy đổi lưu kho
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Để hệ thống quản lý tồn kho chính xác, vui lòng xác định
                      đơn vị nhỏ nhất và số lượng chứa trong 1 đơn vị bán. (Ví
                      dụ: Bán 1 <strong>Hộp</strong> chứa 100{" "}
                      <strong>Viên</strong> → Tỷ lệ quy đổi là{" "}
                      <strong>100</strong>).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Đơn vị cơ sở (Nhỏ nhất)</label>
                    <select
                      name="baseUnit"
                      onChange={handleChange}
                      className={
                        inputCls + " bg-white appearance-none cursor-pointer"
                      }>
                      <option value="Viên">Viên</option>
                      <option value="Gói">Gói</option>
                      <option value="Chai">Chai</option>
                      <option value="Tuýp">Tuýp</option>
                      <option value="Lọ">Lọ</option>
                      <option value="Ống">Ống</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Tỷ lệ quy đổi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="conversionRate"
                      value={data.conversionRate}
                      onChange={handleChange}
                      required
                      className={inputCls + " bg-white font-bold"}
                      placeholder="VD: 100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Mô tả quy cách đóng gói</label>
                <input
                  name="packagingSpecification"
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="VD: Hộp 10 vỉ x 10 viên"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>
                  Mô tả chi tiết tác dụng / Cách dùng
                </label>
                <textarea
                  name="description"
                  onChange={handleChange}
                  rows="3"
                  className={inputCls + " resize-none leading-relaxed"}
                  placeholder="Mô tả công dụng, liều dùng, chống chỉ định..."
                />
              </div>
            </div>
          </div>

          {/* ════ KHỐI 3: HÌNH ẢNH ════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeaderBadge icon={ImageIcon} title="Hình ảnh sản phẩm" />

            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#0ea5e9]/30 bg-[#0ea5e9]/5 rounded-xl cursor-pointer hover:bg-[#0ea5e9]/10 transition-colors group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <UploadCloud size={24} className="text-[#0ea5e9]" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-[#0ea5e9] block mb-0.5">
                  Nhấp để tải ảnh lên
                </span>
                <span className="text-xs text-slate-500">
                  Hỗ trợ JPG, PNG, WEBP · Tối đa 10 ảnh
                </span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {imagePreviews.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {imagePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-xl overflow-visible shrink-0 group">
                    <img
                      src={src}
                      alt="preview"
                      className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-transform scale-0 group-hover:scale-100">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── FOOTER ACTIONS ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-6 z-10">
            <p className="text-sm text-slate-500 font-medium">
              Kiểm tra kỹ các trường có dấu{" "}
              <span className="text-red-500 font-bold">*</span> trước khi lưu.
            </p>
            <div className="flex w-full md:w-auto gap-2.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors">
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background:
                    "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                  boxShadow: "0 4px 14px rgba(14, 165, 233, 0.35)",
                }}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Hoàn tất
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicine;
