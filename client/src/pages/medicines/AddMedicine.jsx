import React, { useState, useEffect } from "react";
import { Save, ArrowLeft, UploadCloud, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const AddMedicine = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // State Loading

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

  // State quản lý Ảnh và Xem trước (Preview)
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

  // Hàm xử lý khi chọn file ảnh -> Tạo link preview
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    // Tạo preview URL cho mảng file
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

    setIsSubmitting(true); // Bật Loading

    try {
      if (!data.categoryId) {
        setIsSubmitting(false);
        return alert("Vui lòng chọn danh mục thuốc!");
      }

      // 1. Tạo Medicine gốc BẰNG FORMDATA (Do có ảnh)
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

      // 2. Tạo Variant BẰNG JSON BÌNH THƯỜNG (Vì không còn ảnh)
      const variantPayload = {
        medicineId: medicineId,
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
      setIsSubmitting(false); // Tắt Loading
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 mb-6 hover:text-blue-600">
          <ArrowLeft size={20} className="mr-2" /> Quay lại
        </button>

        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Thêm Thuốc Mới
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">
            {/* CỘT TRÁI (THÔNG TIN & ẢNH) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-600 border-b pb-2">
                Thông tin cơ bản & Hình ảnh
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên thuốc (Gốc)
                </label>
                <input
                  name="name"
                  value={data.name}
                  onChange={handleNameChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Danh mục thuốc
                </label>
                <select
                  name="categoryId"
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hoạt chất
                  </label>
                  <input
                    name="ingredients"
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhà sản xuất
                  </label>
                  <input
                    name="manufacturer"
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Đơn vị cơ sở lưu kho (Nhỏ nhất)
                </label>
                <select
                  name="baseUnit"
                  onChange={handleChange}
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Viên">Viên</option>
                  <option value="Gói">Gói</option>
                  <option value="Chai">Chai</option>
                  <option value="Tuýp">Tuýp</option>
                  <option value="Lọ">Lọ</option>
                </select>
              </div>
              {/* VÙNG UPLOAD VÀ PREVIEW ẢNH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ảnh sản phẩm (Hiển thị chung cho mọi quy cách)
                </label>
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-lg p-4 flex flex-col items-center justify-center relative hover:bg-blue-50 transition cursor-pointer">
                  <UploadCloud size={32} className="mb-2 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600 mb-1">
                    Nhấp để tải ảnh lên (Tối đa 10 ảnh)
                  </span>
                  <span className="text-xs text-gray-400">Hỗ trợ JPG, PNG</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Lưới hiển thị Preview Ảnh */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
                    {imagePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 flex-shrink-0 rounded-lg border shadow-sm">
                        <img
                          src={src}
                          alt="preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  name="isPrescription"
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-700 font-medium">
                  Thuốc kê đơn (Rx)
                </span>
              </div>
            </div>

            {/* CỘT PHẢI (QUY CÁCH ĐẦU TIÊN) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-green-600 border-b pb-2">
                Quy cách & Giá bán ban đầu
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên hiển thị (Quy cách)
                </label>
                <input
                  name="variantName"
                  value={data.variantName}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị bán cơ bản
                  </label>
                  <select
                    name="unitName"
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 outline-none">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá bán lẻ (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="sellPrice"
                    onChange={handleChange}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 outline-none font-bold text-blue-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả quy cách đóng gói
                </label>
                <input
                  name="packagingSpecification"
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none"
                  placeholder="VD: Hộp 12 gói x 10g"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả chi tiết tác dụng/cách dùng
                </label>
                <textarea
                  name="description"
                  onChange={handleChange}
                  rows="4"
                  className="w-full border rounded-lg px-3 py-2 outline-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-purple-600">
                  Tỷ lệ quy đổi ra Đơn vị cơ sở
                </label>
                <input
                  type="number"
                  min="1"
                  name="conversionRate"
                  onChange={handleChange}
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="VD: 1 Hộp = 100 Viên -> Nhập 100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hệ thống sẽ lấy (Số lượng x tỷ lệ này) để lưu vào kho.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg disabled:opacity-70">
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {isSubmitting ? "Đang lưu hệ thống..." : "Lưu thông tin thuốc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicine;
