import React, { useState, useEffect } from "react";
import {
  Save,
  ArrowLeft,
  UploadCloud,
  X,
  Loader2,
  Pill,
  Package,
  Tag,
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

  /* ── shared styles ── */
  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition bg-white text-slate-800 placeholder:text-slate-400";
  const labelCls =
    "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  /* ── Section header ── */
  const SectionHeader = ({ icon: Icon, title, color = "sky" }) => {
    const colors = {
      sky: {
        bg: "bg-sky-50",
        text: "text-sky-600",
        border: "border-sky-100",
        iconBg: "bg-sky-100",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-100",
        iconBg: "bg-emerald-100",
      },
      violet: {
        bg: "bg-violet-50",
        text: "text-violet-600",
        border: "border-violet-100",
        iconBg: "bg-violet-100",
      },
    };
    const c = colors[color];
    return (
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${c.bg} ${c.border} mb-4`}>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.iconBg}`}>
          <Icon size={15} className={c.text} />
        </div>
        <span className={`text-sm font-bold ${c.text}`}>{title}</span>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <div className="max-w-5xl mx-auto">
        {/* ── PAGE HEADER ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
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
                Thêm Thuốc Mới
              </h1>
              <p className="text-xs text-slate-500">
                Nhập thông tin thuốc gốc và quy cách ban đầu
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5">
            {/* ══ CỘT TRÁI: THÔNG TIN CƠ BẢN ══ */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <SectionHeader
                icon={Pill}
                title="Thông tin cơ bản & Hình ảnh"
                color="sky"
              />

              <div>
                <label className={labelCls}>
                  Tên thuốc (Gốc) <span className="text-red-400">*</span>
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
                  Danh mục thuốc <span className="text-red-400">*</span>
                </label>
                <select
                  name="categoryId"
                  onChange={handleChange}
                  required
                  className={inputCls + " appearance-none"}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Hoạt chất</label>
                  <input
                    name="ingredients"
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="VD: Paracetamol"
                  />
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
              </div>

              <div>
                <label className={labelCls}>
                  Đơn vị cơ sở lưu kho (Nhỏ nhất)
                </label>
                <select
                  name="baseUnit"
                  onChange={handleChange}
                  className={inputCls + " appearance-none"}>
                  <option value="Viên">Viên</option>
                  <option value="Gói">Gói</option>
                  <option value="Chai">Chai</option>
                  <option value="Tuýp">Tuýp</option>
                  <option value="Lọ">Lọ</option>
                  <option value="Ống">Ống</option>
                </select>
              </div>

              {/* Upload ảnh */}
              <div>
                <label className={labelCls}>Ảnh sản phẩm</label>
                <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-sky-200 bg-sky-50/50 rounded-xl cursor-pointer hover:bg-sky-50 transition-colors">
                  <UploadCloud size={26} className="text-sky-400" />
                  <span className="text-sm font-semibold text-sky-600">
                    Nhấp để tải ảnh lên
                  </span>
                  <span className="text-xs text-slate-400">
                    Hỗ trợ JPG, PNG · Tối đa 10 ảnh
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2.5 mt-3 flex-wrap">
                    {imagePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-visible shrink-0">
                        <img
                          src={src}
                          alt="preview"
                          className="w-full h-full object-cover rounded-xl border border-slate-100 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkbox kê đơn */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit pt-1">
                <input
                  type="checkbox"
                  name="isPrescription"
                  onChange={handleChange}
                  className="w-4 h-4 accent-sky-500 rounded"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Thuốc kê đơn (Rx)
                </span>
              </label>
            </div>

            {/* ══ CỘT PHẢI: QUY CÁCH & GIÁ ══ */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <SectionHeader
                icon={Package}
                title="Quy cách & Giá bán ban đầu"
                color="sky"
              />

              <div>
                <label className={labelCls}>
                  Tên hiển thị (Quy cách){" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  name="variantName"
                  value={data.variantName}
                  onChange={handleChange}
                  required
                  className={inputCls}
                  placeholder="VD: Paracetamol (Hộp)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Đơn vị bán</label>
                  <select
                    name="unitName"
                    onChange={handleChange}
                    className={inputCls + " appearance-none"}>
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
                    Giá bán lẻ (VNĐ) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="sellPrice"
                    onChange={handleChange}
                    required
                    className={
                      inputCls + " font-bold text-sky-600 focus:ring-sky-400"
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Mô tả quy cách đóng gói</label>
                <input
                  name="packagingSpecification"
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="VD: Hộp 12 gói x 10g"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Mô tả chi tiết tác dụng / cách dùng
                </label>
                <textarea
                  name="description"
                  onChange={handleChange}
                  rows="4"
                  className={inputCls + " resize-none leading-relaxed"}
                  placeholder="Mô tả công dụng, liều dùng, chống chỉ định..."
                />
              </div>

              {/* Tỷ lệ quy đổi */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <label className={labelCls + " text-sky-600"}>
                  Tỷ lệ quy đổi ra đơn vị cơ sở
                </label>
                <input
                  type="number"
                  min="1"
                  name="conversionRate"
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border border-sky-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition bg-white text-slate-800"
                  placeholder="VD: 1 Hộp = 100 Viên → Nhập 100"
                />
                <p className="text-xs text-sky-500 mt-1.5 flex items-center gap-1">
                  Hệ thống sẽ lấy (Số lượng × tỷ lệ) để lưu vào kho.
                </p>
              </div>
            </div>
          </div>

          {/* ── SUBMIT FOOTER ── */}
          <div className="mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex justify-between items-center">
            <p className="text-sm text-slate-400">
              Các trường có dấu{" "}
              <span className="text-red-400 font-bold">*</span> là bắt buộc
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                  boxShadow: "0 4px 14px rgba(14,165,233,.4)",
                }}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Lưu thông tin thuốc
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
