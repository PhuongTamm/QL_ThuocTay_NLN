import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Save,
  Trash2,
  Plus,
  Search,
  Store,
  Undo2,
  AlertCircle,
  PackageX,
  Trash,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DistributePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- BỔ SUNG MODE "DISPOSE" ---
  const [mode, setMode] = useState("DISTRIBUTE"); // 'DISTRIBUTE' | 'RETURN' | 'DISPOSE'

  const [branches, setBranches] = useState([]);
  const [toBranchId, setToBranchId] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [items, setItems] = useState([
    {
      medicineId: "",
      medicineSearchTerm: "",
      isMedicineDropdownOpen: false,
      variantId: "",
      batchCode: "",
      reason: "OVERSTOCK",
      quantity: 1,
    },
  ]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    fetchInventoryForMode();
  }, [mode]);

  const fetchBaseData = async () => {
    try {
      const [branchRes, medRes, varRes] = await Promise.all([
        api.get("/branches"),
        api.get("/medicines"),
        api.get("/medicines/variants"),
      ]);
      setBranches(
        (branchRes.data.data || []).filter((b) => !b.isMainWarehouse),
      );
      setMedicines(medRes.data.data || []);
      setAllVariants(varRes.data.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu nền", err);
    }
  };

  const fetchInventoryForMode = async () => {
    try {
      // DISTRIBUTE và DISPOSE (nếu là Admin) thường làm ở Kho Tổng. RETURN làm ở Chi nhánh.
      const branchQuery =
        (mode === "RETURN" || mode === "DISPOSE") && user.branchId
          ? `?branchId=${user.branchId}`
          : "";
      const invRes = await api.get(`/inventories${branchQuery}`);
      setInventories(invRes.data.data || []);
      setItems([
        {
          medicineId: "",
          medicineSearchTerm: "",
          isMedicineDropdownOpen: false,
          variantId: "",
          batchCode: "",
          reason: "OVERSTOCK",
          quantity: 1,
        },
      ]);
    } catch (err) {
      console.error("Lỗi tải tồn kho", err);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === "medicineSearchTerm") {
      newItems[index].isMedicineDropdownOpen = true;
      newItems[index].medicineId = "";
      newItems[index].variantId = "";
      newItems[index].batchCode = "";
    }
    setItems(newItems);
  };

  const handleSelectMedicine = (index, medicine) => {
    const newItems = [...items];
    newItems[index].medicineId = medicine._id;
    newItems[index].medicineSearchTerm = medicine.name;
    newItems[index].isMedicineDropdownOpen = false;
    newItems[index].variantId = "";
    newItems[index].batchCode = "";
    setItems(newItems);
  };

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));
  const addItemRow = () =>
    setItems([
      ...items,
      {
        medicineId: "",
        medicineSearchTerm: "",
        isMedicineDropdownOpen: false,
        variantId: "",
        batchCode: "",
        reason: "OVERSTOCK",
        quantity: 1,
      },
    ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "DISTRIBUTE" && !toBranchId)
        return alert("Vui lòng chọn chi nhánh nhận hàng!");

      for (let i = 0; i < items.length; i++) {
        if (!items[i].medicineId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
        if (!items[i].variantId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
        if ((mode === "RETURN" || mode === "DISPOSE") && !items[i].batchCode)
          return alert(`Dòng thứ ${i + 1}: Vui lòng chọn Mã lô cần thao tác!`);
        if (items[i].quantity <= 0)
          return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);
      }

      const payloadItems = items.map((item) => ({
        variantId: item.variantId,
        batchCode: mode !== "DISTRIBUTE" ? item.batchCode : undefined,
        reason: mode !== "DISTRIBUTE" ? item.reason : undefined,
        quantity: Number(item.quantity),
      }));

      let endpoint = "/transactions/distribute";
      if (mode === "RETURN") endpoint = "/transactions/return";
      if (mode === "DISPOSE") endpoint = "/transactions/dispose"; // API xử lý xuất hủy

      const response = await api.post(endpoint, {
        toBranchId: mode === "DISTRIBUTE" ? toBranchId : undefined,
        items: payloadItems,
      });
      if (response?.data?.success) {
        alert("Giao dịch thành công!");
        navigate("/inventory");
      } else {
        alert(response.message || "Đã có lỗi xảy ra!");
      }
    } catch (error) {
      alert(
        "Lỗi giao dịch: " + (error.response?.data?.message || error.message),
      );
    }
  };

  // Helper để tô màu UI dựa theo Mode
  const getThemeColors = () => {
    if (mode === "DISTRIBUTE")
      return {
        bg: "bg-blue-100",
        text: "text-blue-600",
        activeTab: "bg-white text-blue-600",
        btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30",
      };
    if (mode === "RETURN")
      return {
        bg: "bg-orange-100",
        text: "text-orange-600",
        activeTab: "bg-white text-orange-600",
        btn: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30",
      };
    return {
      bg: "bg-red-100",
      text: "text-red-600",
      activeTab: "bg-white text-red-600",
      btn: "bg-red-600 hover:bg-red-700 shadow-red-500/30",
    };
  };
  const theme = getThemeColors();

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-[1000px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* --- HEADER & TABS SWITCHER --- */}
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 gap-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${theme.bg}`}>
              {mode === "DISTRIBUTE" ? (
                <ArrowRightLeft size={28} className={theme.text} />
              ) : mode === "RETURN" ? (
                <Undo2 size={28} className={theme.text} />
              ) : (
                <Trash size={28} className={theme.text} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">
                {mode === "DISTRIBUTE"
                  ? "Luân Chuyển Xuất Kho"
                  : mode === "RETURN"
                    ? "Trả Hàng Về Kho Tổng"
                    : "Lập Phiếu Xuất Hủy"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {mode === "DISTRIBUTE"
                  ? "Phân phối hàng hóa từ Kho tổng đến các Chi nhánh"
                  : mode === "RETURN"
                    ? "Gửi trả hàng cận date, bán chậm về lại Kho tổng"
                    : "Hủy bỏ hàng hóa hết hạn, hư hỏng (Ghi nhận vào Chi phí tổn thất)"}
              </p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setMode("DISTRIBUTE")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === "DISTRIBUTE" ? theme.activeTab : "text-gray-500 hover:text-gray-700"}`}>
              <ArrowRightLeft size={16} /> Xuất đi
            </button>
            <button
              type="button"
              onClick={() => setMode("RETURN")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === "RETURN" ? theme.activeTab : "text-gray-500 hover:text-gray-700"}`}>
              <Undo2 size={16} /> Trả về
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* THÔNG BÁO TÙY THEO CHẾ ĐỘ */}
          {mode === "DISTRIBUTE" ? (
            <div className="mb-8 max-w-md bg-blue-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-sm font-bold mb-2 text-blue-800 flex items-center gap-2">
                <Store size={16} /> Chọn chi nhánh nhận hàng{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full border-none p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-gray-700 shadow-sm">
                <option value="">-- Chọn chi nhánh đích đến --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    Chi nhánh: {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-8 max-w-md bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
              <AlertCircle
                size={24}
                className="text-orange-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-bold text-orange-800 mb-1">
                  Nơi nhận: Kho Tổng
                </p>
                <p className="text-xs text-orange-600 leading-relaxed">
                  Hàng hóa trả về sẽ được chuyển vào khu vực chờ kiểm duyệt.
                  Hàng lỗi/cận date sẽ không được phân phối lại.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
              <PackageX size={18} /> Danh sách mặt hàng
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
              const activeBatches = medInventory
                ? medInventory.batches.filter((b) => b.quantity > 0)
                : [];

              return (
                <div
                  key={index}
                  className={`flex flex-wrap md:flex-nowrap gap-4 items-start p-5 rounded-xl border ${mode === "RETURN" ? "bg-orange-50/30 border-orange-100" : mode === "DISPOSE" ? "bg-red-50/30 border-red-100" : "bg-gray-50 border-gray-200"}`}>
                  {/* 1. TÌM THUỐC */}
                  <div className="flex-1 min-w-[250px] relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Thuốc / Sản phẩm
                    </label>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhập tên hoặc mã..."
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
                        className="w-full border p-2.5 pl-9 text-sm font-bold text-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {item.isMedicineDropdownOpen && (
                      <ul className="absolute z-50 w-full bg-white border rounded-xl shadow-2xl max-h-60 overflow-y-auto mt-1 divide-y divide-gray-50">
                        {searchedMedicines.length > 0 ? (
                          searchedMedicines.map((m) => (
                            <li
                              key={m._id}
                              onMouseDown={() => handleSelectMedicine(index, m)}
                              className="p-3 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                              <span className="font-bold text-gray-800">
                                {m.name}
                              </span>
                              <span className="text-gray-400 text-xs font-mono bg-gray-100 px-1.5 rounded">
                                {m.code}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="p-4 text-sm text-gray-500 text-center italic">
                            Không tìm thấy thuốc này
                          </li>
                        )}
                      </ul>
                    )}
                    {item.medicineId && (
                      <p className="text-xs mt-2 font-medium text-gray-500">
                        Trong kho có:{" "}
                        <span
                          className={`font-bold ${totalBaseQty > 0 ? "text-green-600" : "text-red-500"}`}>
                          {totalBaseQty} {baseUnit}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* 2. CHỌN QUY CÁCH */}
                  <div className="w-[130px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Quy cách
                    </label>
                    <select
                      required
                      disabled={!item.medicineId}
                      value={item.variantId}
                      onChange={(e) =>
                        handleItemChange(index, "variantId", e.target.value)
                      }
                      className="w-full border p-2.5 text-sm font-bold text-gray-700 rounded-lg outline-none disabled:bg-gray-100 bg-white focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Chọn --</option>
                      {filteredVariants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* KHỐI CHỌN LÔ & LÝ DO (CHỈ HIỆN KHI TRẢ HÀNG HOẶC XUẤT HỦY) */}
                  {(mode === "RETURN" || mode === "DISPOSE") && (
                    <>
                      <div className="w-[150px]">
                        <label
                          className={`block text-xs font-bold uppercase tracking-wider mb-2 ${mode === "DISPOSE" ? "text-red-600" : "text-orange-600"}`}>
                          Mã Lô
                        </label>
                        <select
                          required
                          disabled={
                            !item.medicineId || activeBatches.length === 0
                          }
                          value={item.batchCode}
                          onChange={(e) =>
                            handleItemChange(index, "batchCode", e.target.value)
                          }
                          className={`w-full border p-2.5 text-sm font-bold text-gray-700 rounded-lg outline-none disabled:bg-gray-100 bg-white focus:ring-2 ${mode === "DISPOSE" ? "border-red-200 focus:ring-red-500" : "border-orange-200 focus:ring-orange-500"}`}>
                          <option value="">-- Chọn lô --</option>
                          {activeBatches.map((b, i) => (
                            <option key={i} value={b.batchCode}>
                              {b.batchCode} (Còn {b.quantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-[150px]">
                        <label
                          className={`block text-xs font-bold uppercase tracking-wider mb-2 ${mode === "DISPOSE" ? "text-red-600" : "text-orange-600"}`}>
                          Lý do
                        </label>
                        <select
                          value={item.reason}
                          onChange={(e) =>
                            handleItemChange(index, "reason", e.target.value)
                          }
                          className={`w-full border p-2.5 text-sm font-bold text-gray-700 rounded-lg outline-none bg-white focus:ring-2 ${mode === "DISPOSE" ? "border-red-200 focus:ring-red-500" : "border-orange-200 focus:ring-orange-500"}`}>
                          {mode === "RETURN" && (
                            <option value="OVERSTOCK">Bán chậm/Quá tồn</option>
                          )}
                          <option value="EXPIRED">Cận Date / Hết hạn</option>
                          <option value="DAMAGED">Hư hỏng / Lỗi NSX</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* 3. SỐ LƯỢNG */}
                  <div className="w-[100px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Số lượng
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full border p-2.5 text-sm rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 font-black text-center text-blue-700"
                    />
                  </div>

                  <div className="pt-7">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addItemRow}
              className={`font-bold flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors mt-2 border border-dashed ${mode === "DISTRIBUTE" ? "text-blue-600 border-blue-300 hover:bg-blue-50" : mode === "RETURN" ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-red-600 border-red-300 hover:bg-red-50"}`}>
              <Plus size={18} />{" "}
              {mode === "DISTRIBUTE"
                ? "Thêm thuốc luân chuyển"
                : mode === "RETURN"
                  ? "Thêm thuốc trả về"
                  : "Thêm thuốc xuất hủy"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className={`px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 text-white shadow-lg transition-transform active:scale-95 ${theme.btn}`}>
              <Save size={20} />{" "}
              {mode === "DISTRIBUTE"
                ? "Tạo Phiếu Xuất"
                : mode === "RETURN"
                  ? "Xác Nhận Trả Hàng"
                  : "Chốt Phiếu Xuất Hủy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributePage;
