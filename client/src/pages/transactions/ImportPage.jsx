import React, { useState, useEffect } from "react";
import { Plus, Trash, Save } from "lucide-react";
import api from "../../services/api";

const ImportPage = () => {
  // State quản lý form
  const [formData, setFormData] = useState({
    code: `PN_${new Date().getTime()}`, // Tự sinh mã phiếu tạm
    type: "IMPORT_SUPPLIER",
    supplierName: "",
    details: [], // Mảng chi tiết thuốc nhập
  });

  // State danh sách thuốc để select
  const [medicineOptions, setMedicineOptions] = useState([]);

  useEffect(() => {
    // Load danh sách variants/medicines để chọn
    const loadData = async () => {
      const res = await api.get("/medicines"); // Cần API lấy medicines hoặc variants
      setMedicineOptions(res.data.data);
    };
    loadData();
  }, []);

  const addDetailRow = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        { variantId: "", batchCode: "", expiryDate: "", quantity: 1, price: 0 },
      ],
    });
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const removeDetailRow = (index) => {
    const newDetails = formData.details.filter((_, i) => i !== index);
    setFormData({ ...formData, details: newDetails });
  };

  const handleSubmit = async () => {
    try {
      await api.post("/transactions", formData);
      alert("Nhập kho thành công!");
      // Reset form hoặc redirect
    } catch (error) {
      alert("Lỗi nhập kho: " + error.response?.data?.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Tạo Phiếu Nhập Kho (NCC)
        </h2>

        {/* Thông tin chung */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã phiếu
            </label>
            <input
              type="text"
              value={formData.code}
              disabled
              className="w-full bg-gray-100 border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhà cung cấp
            </label>
            <input
              type="text"
              placeholder="Nhập tên NCC..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              onChange={(e) =>
                setFormData({ ...formData, supplierName: e.target.value })
              }
            />
          </div>
        </div>

        {/* Chi tiết nhập */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Danh sách thuốc nhập</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm">
                <th className="p-3 border">Tên thuốc (Variant)</th>
                <th className="p-3 border w-32">Số lô</th>
                <th className="p-3 border w-40">Hạn dùng</th>
                <th className="p-3 border w-24">SL</th>
                <th className="p-3 border w-32">Giá nhập</th>
                <th className="p-3 border w-16"></th>
              </tr>
            </thead>
            <tbody>
              {formData.details.map((item, index) => (
                <tr key={index}>
                  <td className="p-2 border">
                    <select
                      className="w-full p-2 border rounded"
                      value={item.variantId}
                      onChange={(e) =>
                        handleDetailChange(index, "variantId", e.target.value)
                      }>
                      <option value="">Chọn thuốc...</option>
                      {medicineOptions.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                        // Lưu ý: Backend dùng MedicineVariant, cần map đúng ID
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full p-2 border rounded uppercase"
                      placeholder="A001"
                      value={item.batchCode}
                      onChange={(e) =>
                        handleDetailChange(index, "batchCode", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={item.expiryDate}
                      onChange={(e) =>
                        handleDetailChange(index, "expiryDate", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border rounded text-right"
                      value={item.quantity}
                      onChange={(e) =>
                        handleDetailChange(
                          index,
                          "quantity",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border rounded text-right"
                      value={item.price}
                      onChange={(e) =>
                        handleDetailChange(
                          index,
                          "price",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => removeDetailRow(index)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addDetailRow}
            className="mt-3 flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50 px-3 py-2 rounded transition">
            <Plus size={20} /> Thêm dòng
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-6 border-t">
          <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg mr-4">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-lg">
            <Save size={20} /> Lưu phiếu nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
