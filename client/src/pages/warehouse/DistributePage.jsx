import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Save,
  Trash2,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const DistributePage = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [toBranchId, setToBranchId] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]); // Tồn kho của Kho tổng

  const [items, setItems] = useState([
    {
      medicineId: "",
      medicineSearchTerm: "",
      isMedicineDropdownOpen: false,
      variantId: "",
      quantity: 1,
    },
  ]);

  useEffect(() => {
    // Tải dữ liệu: Chi nhánh (trừ kho tổng), Thuốc, Biến thể, Tồn kho (Kho tổng)
    Promise.all([
      api.get("/branches"),
      api.get("/medicines"),
      api.get("/medicines/variants"),
      api.get("/inventories"),
    ])
      .then(([branchRes, medRes, varRes, invRes]) => {
        // Lọc bỏ Kho tổng khỏi danh sách nhận
        setBranches(
          (branchRes.data.data || []).filter((b) => !b.isMainWarehouse),
        );
        setMedicines(medRes.data.data || []);
        setAllVariants(varRes.data.data || []);
        setInventories(invRes.data.data || []);
      })
      .catch((err) => console.error("Lỗi tải dữ liệu", err));
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "medicineSearchTerm") {
      newItems[index].isMedicineDropdownOpen = true;
      newItems[index].medicineId = "";
      newItems[index].variantId = "";
    }
    setItems(newItems);
  };

  const handleSelectMedicine = (index, medicine) => {
    const newItems = [...items];
    newItems[index].medicineId = medicine._id;
    newItems[index].medicineSearchTerm = medicine.name;
    newItems[index].isMedicineDropdownOpen = false;
    newItems[index].variantId = "";
    setItems(newItems);
  };

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: "",
        medicineSearchTerm: "",
        isMedicineDropdownOpen: false,
        variantId: "",
        quantity: 1,
      },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!toBranchId) return alert("Vui lòng chọn chi nhánh nhận hàng!");

      for (let i = 0; i < items.length; i++) {
        if (!items[i].medicineId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
        if (!items[i].variantId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
        if (items[i].quantity <= 0)
          return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);
      }

      const payloadItems = items.map((item) => ({
        variantId: item.variantId,
        quantity: Number(item.quantity),
      }));

      const response = await api.post("/transactions/distribute", {
        toBranchId,
        items: payloadItems,
      });
      console.log(response);
      if (response.success) {
        alert(response.message || "Phiếu xuất kho nội bộ đã được tạo thành công!");
        navigate("/inventory");
      }
      else {
        alert(response.message || "Đã có lỗi xảy ra khi tạo phiếu xuất kho!");
      }
    } catch (error) {
      alert(
        "Lỗi xuất kho: " + (error.response?.data?.message || error.message),
      );
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <ArrowRightLeft size={28} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">
            Luân Chuyển Xuất Kho Nội Bộ
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* CHỌN CHI NHÁNH NHẬN */}
          <div className="mb-6 max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Chi nhánh nhận hàng <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Store
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <select
                required
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full pl-10 border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 font-medium text-blue-800">
                <option value="">-- Chọn chi nhánh đích đến --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-700">
              Danh sách mặt hàng xuất đi (Hệ thống tự động xuất FEFO)
            </h3>

            {items.map((item, index) => {
              const searchedMedicines = medicines.filter(
                (m) =>
                  m.name
                    .toLowerCase()
                    .includes(item.medicineSearchTerm.toLowerCase()) ||
                  m.code
                    .toLowerCase()
                    .includes(item.medicineSearchTerm.toLowerCase()),
              );

              const filteredVariants = allVariants.filter(
                (v) =>
                  v.medicineId === item.medicineId ||
                  v.medicineId?._id === item.medicineId,
              );

              // Lấy tồn kho của thuốc này
              const medInventory = inventories.find(
                (inv) =>
                  inv.medicineId === item.medicineId ||
                  inv.medicineId?._id === item.medicineId,
              );
              const totalBaseQty = medInventory
                ? medInventory.totalQuantity
                : 0;
              const baseUnit = medInventory
                ? medInventory.medicineId.baseUnit
                : "đ.vị";

              return (
                <div
                  key={index}
                  className="flex flex-wrap md:flex-nowrap gap-4 items-start bg-gray-50 p-4 rounded-lg border">
                  {/* 1. TÌM THUỐC */}
                  <div className="flex-1 min-w-[300px] relative">
                    <label className="block text-xs font-medium text-blue-600 mb-1">
                      1. Tìm & Chọn Thuốc
                    </label>
                    <div className="relative">
                      <Search
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                        size={14}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhập tên hoặc mã thuốc..."
                        value={item.medicineSearchTerm}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "medicineSearchTerm",
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          handleItemChange(
                            index,
                            "isMedicineDropdownOpen",
                            true,
                          )
                        }
                        onBlur={() =>
                          setTimeout(
                            () =>
                              handleItemChange(
                                index,
                                "isMedicineDropdownOpen",
                                false,
                              ),
                            200,
                          )
                        }
                        className="w-full border p-2.5 pl-8 text-sm rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {item.isMedicineDropdownOpen && (
                      <ul className="absolute z-50 w-full bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1 divide-y">
                        {searchedMedicines.length > 0 ? (
                          searchedMedicines.map((m) => (
                            <li
                              key={m._id}
                              onMouseDown={() => handleSelectMedicine(index, m)}
                              className="p-3 text-sm hover:bg-blue-50 cursor-pointer">
                              <span className="font-bold">{m.name}</span>{" "}
                              <span className="text-gray-500 text-xs ml-2">
                                ({m.code})
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="p-3 text-sm text-gray-500">
                            Không tìm thấy
                          </li>
                        )}
                      </ul>
                    )}
                    {/* Hiển thị tồn kho nhắc nhở */}
                    {item.medicineId && (
                      <p className="text-xs mt-1.5 font-medium text-gray-500">
                        Tồn kho tổng:{" "}
                        <span
                          className={`font-bold ${totalBaseQty > 0 ? "text-green-600" : "text-red-500"}`}>
                          {totalBaseQty} {baseUnit}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* 2. CHỌN QUY CÁCH XUẤT */}
                  <div className="w-48">
                    <label className="block text-xs font-medium text-green-600 mb-1">
                      2. Quy Cách Xuất
                    </label>
                    <select
                      required
                      disabled={!item.medicineId}
                      value={item.variantId}
                      onChange={(e) =>
                        handleItemChange(index, "variantId", e.target.value)
                      }
                      className="w-full border p-2.5 text-sm rounded-lg outline-none disabled:bg-gray-100 bg-white border-green-200 focus:ring-1 focus:ring-green-500">
                      <option value="">-- Chọn --</option>
                      {filteredVariants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.unit} ({v.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. SỐ LƯỢNG */}
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      3. Số lượng
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full border p-2.5 text-sm rounded-lg outline-none bg-white focus:ring-1 focus:ring-blue-500 font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    className="p-2.5 mt-5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addItemRow}
              className="text-blue-600 font-medium flex items-center gap-1 hover:bg-blue-50 px-3 py-2 rounded transition-colors mt-2">
              <Plus size={16} /> Thêm thuốc xuất kho
            </button>
          </div>

          <div className="mt-8 pt-6 border-t flex justify-end items-center">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg">
              <Save size={20} /> Tạo Phiếu Xuất Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributePage;
