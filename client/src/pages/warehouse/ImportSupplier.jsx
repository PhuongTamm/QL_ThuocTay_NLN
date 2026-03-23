import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, PackageCheck, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const ImportSupplier = () => {
  const navigate = useNavigate();
  const [supplierName, setSupplierName] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [items, setItems] = useState([
    {
      medicineId: "",
      medicineSearchTerm: "", // Thêm trường này để lưu chữ đang gõ tìm kiếm
      isMedicineDropdownOpen: false, // Thêm trường này để ẩn/hiện list gợi ý
      batchSelection: "NEW",
      variantId: "",
      batchCode: "",
      manufacturingDate: "",
      expiryDate: "",
      quantity: 1,
      price: 0,
    },
  ]);

  const todayString = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      api.get("/medicines"),
      api.get("/medicines/variants"),
      api.get("/inventories"),
    ])
      .then(([medRes, varRes, invRes]) => {
        setMedicines(medRes.data.data || []);
        setAllVariants(varRes.data.data || []);
        setInventories(invRes.data.data || []);
      })
      .catch((err) => console.error("Lỗi tải dữ liệu", err));
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Nếu người dùng gõ phím vào ô tìm kiếm thuốc -> Mở dropdown & Xóa id thuốc cũ
    if (field === "medicineSearchTerm") {
      newItems[index].isMedicineDropdownOpen = true;
      newItems[index].medicineId = "";
      newItems[index].variantId = "";
      newItems[index].batchSelection = "NEW";
      newItems[index].batchCode = "";
      newItems[index].manufacturingDate = "";
      newItems[index].expiryDate = "";
    }

    setItems(newItems);
  };

  // Hàm riêng xử lý khi BẤM CHỌN một thuốc từ danh sách gợi ý
  const handleSelectMedicine = (index, medicine) => {
    const newItems = [...items];
    newItems[index].medicineId = medicine._id;
    newItems[index].medicineSearchTerm = medicine.name; // Hiển thị tên thuốc lên ô input
    newItems[index].isMedicineDropdownOpen = false; // Đóng dropdown

    // Reset các trường phụ thuộc
    newItems[index].variantId = "";
    newItems[index].batchSelection = "NEW";
    newItems[index].batchCode = "";
    newItems[index].manufacturingDate = "";
    newItems[index].expiryDate = "";

    setItems(newItems);
  };

  const handleBatchSelection = (index, batchCodeValue, availableBatches) => {
    const newItems = [...items];
    newItems[index].batchSelection = batchCodeValue;

    if (batchCodeValue === "NEW") {
      newItems[index].batchCode = "";
      newItems[index].manufacturingDate = "";
      newItems[index].expiryDate = "";
    } else {
      const selectedBatch = availableBatches.find(
        (b) => b.batchCode === batchCodeValue,
      );
      if (selectedBatch) {
        newItems[index].batchCode = selectedBatch.batchCode;
        newItems[index].manufacturingDate = selectedBatch.manufacturingDate
          ? new Date(selectedBatch.manufacturingDate)
              .toISOString()
              .split("T")[0]
          : "";
        newItems[index].expiryDate = selectedBatch.expiryDate
          ? new Date(selectedBatch.expiryDate).toISOString().split("T")[0]
          : "";
      }
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: "",
        medicineSearchTerm: "",
        isMedicineDropdownOpen: false,
        batchSelection: "NEW",
        variantId: "",
        batchCode: "",
        manufacturingDate: "",
        expiryDate: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!supplierName) return alert("Vui lòng nhập tên Nhà cung cấp");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const finalBatchCode =
          item.batchSelection === "NEW" ? item.batchCode : item.batchSelection;

        if (!item.medicineId)
          return alert(
            `Dòng thứ ${i + 1}: Bạn chưa chọn Thuốc gốc từ danh sách!`,
          );
        if (
          !item.variantId ||
          !finalBatchCode ||
          !item.manufacturingDate ||
          !item.expiryDate
        ) {
          return alert(
            `Dòng thứ ${i + 1}: Vui lòng điền đầy đủ Quy cách, Mã Lô và Ngày tháng!`,
          );
        }

        const mfgDate = new Date(item.manufacturingDate);
        const expDate = new Date(item.expiryDate);

        if (mfgDate > today)
          return alert(
            `Dòng thứ ${i + 1}: Ngày sản xuất không được ở tương lai!`,
          );
        if (expDate <= mfgDate)
          return alert(
            `Dòng thứ ${i + 1}: Hạn sử dụng phải lớn hơn Ngày sản xuất!`,
          );
        if (expDate <= today)
          return alert(`Dòng thứ ${i + 1}: Thuốc này đã hết hạn sử dụng!`);
      }

      const payloadItems = items.map((item) => ({
        variantId: item.variantId,
        batchCode:
          item.batchSelection === "NEW" ? item.batchCode : item.batchSelection,
        manufacturingDate: item.manufacturingDate,
        expiryDate: item.expiryDate,
        quantity: Number(item.quantity),
        price: Number(parseFloat(item.price).toFixed(2)),
      }));

      await api.post("/transactions/import-supplier", {
        supplierName,
        items: payloadItems,
      });

      alert("Nhập kho thành công!");
      navigate("/inventory");
    } catch (error) {
      alert(
        "Lỗi nhập kho: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.price),
    0,
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto bg-white rounded-xl shadow p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <PackageCheck size={28} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">
            Nhập Hàng Từ Nhà Cung Cấp
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Tên Nhà Cung Cấp
            </label>
            <input
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-1/3 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Dược Hậu Giang..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-700">Danh sách mặt hàng nhập</h3>

            {items.map((item, index) => {
              const filteredVariants = allVariants.filter(
                (v) =>
                  v.medicineId === item.medicineId ||
                  v.medicineId?._id === item.medicineId,
              );

              const medInventory = inventories.find(
                (inv) =>
                  inv.medicineId === item.medicineId ||
                  inv.medicineId?._id === item.medicineId,
              );
              const availableBatches = medInventory
                ? Array.from(
                    new Map(
                      medInventory.batches.map((b) => [b.batchCode, b]),
                    ).values(),
                  )
                : [];

              const selectedVariantObj = allVariants.find(
                (v) => v._id === item.variantId,
              );
              const unitLabel = selectedVariantObj
                ? selectedVariantObj.unit
                : "Đ.vị";
              const isExistingBatch = item.batchSelection !== "NEW";

              // Danh sách thuốc được lọc khi gõ tìm kiếm
              const searchedMedicines = medicines.filter(
                (m) =>
                  m.name
                    .toLowerCase()
                    .includes(item.medicineSearchTerm.toLowerCase()) ||
                  m.code
                    .toLowerCase()
                    .includes(item.medicineSearchTerm.toLowerCase()),
              );

              return (
                <div
                  key={index}
                  className="flex flex-wrap xl:flex-wrap gap-8 items-end justify-center bg-gray-50 p-4 rounded-lg border">
                  {/* Ô 1: TÌM KIẾM VÀ CHỌN THUỐC GỐC (THAY THẾ SELECT BẰNG AUTOCOMPLETE) */}
                  <div className="flex-1 min-w-[250px] relative">
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
                        className={`w-full border p-2 pl-7 text-sm rounded outline-none focus:ring-1 focus:ring-blue-500 ${!item.medicineId ? "border-red-300" : "border-blue-200 bg-white"}`}
                      />
                    </div>

                    {/* Danh sách xổ xuống */}
                    {item.isMedicineDropdownOpen && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1 divide-y divide-gray-100">
                        {searchedMedicines.length > 0 ? (
                          searchedMedicines.map((m) => (
                            <li
                              key={m._id}
                              onClick={() => handleSelectMedicine(index, m)}
                              className="p-3 text-sm hover:bg-blue-50 cursor-pointer flex flex-col">
                              <span className="font-bold text-gray-800">
                                {m.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                Mã: {m.code}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="p-3 text-sm text-center text-gray-500 italic">
                            Không tìm thấy thuốc
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* 2. Chọn Lô Thuốc */}
                  <div className="w-36">
                    <label className="block text-xs font-medium text-purple-600 mb-1">
                      2. Lô (Batch)
                    </label>
                    <select
                      disabled={!item.medicineId}
                      value={item.batchSelection}
                      onChange={(e) =>
                        handleBatchSelection(
                          index,
                          e.target.value,
                          availableBatches,
                        )
                      }
                      className="w-full border p-2 text-sm rounded outline-none border-purple-200 disabled:bg-gray-100 font-medium">
                      <option value="NEW" className="font-bold text-blue-600">
                        ➕ Tạo Lô mới
                      </option>
                      {availableBatches.map((b) => (
                        <option key={b.batchCode} value={b.batchCode}>
                          {b.batchCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2.1 Nhập Mã Lô mới */}
                  {!isExistingBatch && (
                    <div className="w-28">
                      <label className="block text-xs font-medium mb-1">
                        Mã Lô <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={item.batchCode}
                        onChange={(e) =>
                          handleItemChange(index, "batchCode", e.target.value)
                        }
                        className="w-full border border-purple-300 p-2 text-sm rounded outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                        placeholder="Mã..."
                      />
                    </div>
                  )}

                  {/* 3. Chọn Quy Cách */}
                  <div className="w-40">
                    <label className="block text-xs font-medium text-green-600 mb-1">
                      3. Quy Cách
                    </label>
                    <select
                      required
                      disabled={!item.medicineId}
                      value={item.variantId}
                      onChange={(e) =>
                        handleItemChange(index, "variantId", e.target.value)
                      }
                      className="w-full border p-2 text-sm rounded outline-none border-green-200 disabled:bg-gray-100 bg-white">
                      <option value="">-- Chọn --</option>
                      {filteredVariants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.unit} ({v.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Ngày Sản Xuất */}
                  <div className="w-32">
                    <label className="block text-xs font-medium mb-1">
                      Ngày SX
                    </label>
                    <input
                      type="date"
                      required
                      max={todayString}
                      readOnly={isExistingBatch}
                      value={item.manufacturingDate}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "manufacturingDate",
                          e.target.value,
                        )
                      }
                      className={`w-full border p-2 text-sm rounded outline-none ${isExistingBatch ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200" : "bg-white focus:ring-2 focus:ring-blue-500"}`}
                    />
                  </div>

                  {/* 5. Hạn Sử Dụng */}
                  <div className="w-32">
                    <label className="block text-xs font-medium mb-1">
                      Hạn Sử Dụng
                    </label>
                    <input
                      type="date"
                      required
                      min={item.manufacturingDate || todayString}
                      readOnly={isExistingBatch}
                      value={item.expiryDate}
                      onChange={(e) =>
                        handleItemChange(index, "expiryDate", e.target.value)
                      }
                      className={`w-full border p-2 text-sm rounded outline-none ${isExistingBatch ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200" : "bg-white focus:ring-2 focus:ring-blue-500"}`}
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-xs font-medium mb-1">
                      SL Nhập
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full border p-2 text-sm rounded outline-none bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-xs font-bold text-red-600 mb-1">
                      Giá Nhập (1 {unitLabel})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, "price", e.target.value)
                      }
                      className="w-full border border-red-200 p-2 text-sm rounded outline-none font-semibold text-red-600 bg-white focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 mb-0.5 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addItemRow}
              className="text-blue-600 font-medium flex items-center gap-1 hover:underline mt-2">
              <Plus size={16} /> Thêm dòng mặt hàng
            </button>
          </div>

          <div className="mt-8 pt-6 border-t flex justify-between items-center">
            <div className="text-lg">
              Tổng giá trị phiếu nhập:{" "}
              <span className="font-bold text-red-600 text-xl ml-2">
                {totalValue.toLocaleString()} VNĐ
              </span>
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-lg transition-colors">
              <Save size={20} /> Hoàn tất nhập kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportSupplier;
