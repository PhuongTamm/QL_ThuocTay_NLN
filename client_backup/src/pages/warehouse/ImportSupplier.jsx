import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  PackageCheck,
  Search,
  Tag,
  CalendarDays,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import { useAuth } from "../../context/AuthContext";

const ImportSupplier = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [supplierName, setSupplierName] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);

  const [items, setItems] = useState([
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

  const todayString = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      api.get("/medicines"),
      api.get("/medicines/variants"),
      api.get("/inventories"),
      api.get("/branches"),
    ])
      .then(([medRes, varRes, invRes, branchRes]) => {
        setMedicines(medRes.data.data || []);
        setAllVariants(varRes.data.data || []);
        setInventories(invRes.data.data || []);
        setBranches(branchRes.data.data || []);
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
      newItems[index].batchSelection = "NEW";
      newItems[index].batchCode = "";
      newItems[index].manufacturingDate = "";
      newItems[index].expiryDate = "";
    }
    setItems(newItems);
  };

  const handleSelectMedicine = (index, medicine) => {
    const newItems = [...items];
    newItems[index].medicineId = medicine._id;
    newItems[index].medicineSearchTerm = medicine.name;
    newItems[index].isMedicineDropdownOpen = false;
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

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));

  /* ─── LOGIC IN PHIẾU PDF ─── */
  const generatePDF = async (transaction) => {
    const toName =
      branches.find((b) => b._id === user?.branchId)?.name || "Kho Tổng";
    const txDate = new Date(transaction.createdAt).toLocaleString("vi-VN");

    let totalValue = 0;
    let htmlRows = "";

    transaction.details.forEach((item, idx) => {
      const variant = allVariants.find((v) => v._id === item.variantId);
      const name = variant ? variant.name : "Sản phẩm không rõ";
      const unit = variant ? variant.unit : "---";
      const expiry = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
        : "---";

      const itemTotal = (item.quantity || 0) * (item.price || 0);
      totalValue += itemTotal;

      htmlRows += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${name}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.batchCode || "---"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${expiry}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${unit}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.price || 0).toLocaleString("vi-VN")}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">${itemTotal.toLocaleString("vi-VN")}</td>
        </tr>
      `;
    });

    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 30px; color: #000; width: 1000px; margin: 0 auto; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">HỆ THỐNG PHARMA APP</h3>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị giao (NCC): <strong>${supplierName}</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị nhận: <strong>${toName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">Mã phiếu: ${transaction.code}</p>
            <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${txDate}</p>
          </div>
        </div>

        <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">PHIẾU NHẬP KHO</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #000; padding: 10px; width: 5%;">STT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 30%;">Tên hàng hóa</th>
              <th style="border: 1px solid #000; padding: 10px; width: 12%;">Số lô</th>
              <th style="border: 1px solid #000; padding: 10px; width: 12%;">Hạn SD</th>
              <th style="border: 1px solid #000; padding: 10px; width: 8%;">ĐVT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 8%;">S.Lượng</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Đơn giá</th>
              <th style="border: 1px solid #000; padding: 10px; width: 15%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; text-transform: uppercase;">Cộng thành tiền:</td>
              <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">${totalValue.toLocaleString("vi-VN")} đ</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px;">
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người lập phiếu</strong>
            <span>${user?.fullName || "Hệ thống"}</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Người giao hàng</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Thủ kho nhận</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Giám đốc</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
        </div>
      </div>
    `;

    const printDiv = document.createElement("div");
    printDiv.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `${transaction.code}_${new Date().getTime()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await html2pdf().set(opt).from(printDiv).save();
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
        )
          return alert(
            `Dòng thứ ${i + 1}: Vui lòng điền đầy đủ Quy cách, Mã Lô và Ngày tháng!`,
          );
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

      const response = await api.post("/transactions/import-supplier", {
        supplierName,
        items: payloadItems,
      });

      if (response?.data?.success) {
        // Hỏi in phiếu
        const wantToPrint = window.confirm(
          "Nhập kho thành công! Bạn có muốn in PHIẾU NHẬP KHO không?",
        );
        if (wantToPrint && response.data.transaction) {
          await generatePDF(response.data.transaction);
        }
        navigate("/inventory");
      } else {
        alert(response.data?.message || "Đã có lỗi xảy ra!");
      }
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

  // Shared input/select class helpers
  const inputBase =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-400 read-only:cursor-not-allowed";
  const labelBase = "block text-[10px] font-bold uppercase tracking-wide mb-1";

  return (
    <div
      className="min-h-screen bg-slate-100 p-5"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="max-w-screen-xl mx-auto">
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-200 shrink-0">
            <PackageCheck size={20} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              Nhập Hàng Từ Nhà Cung Cấp
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo phiếu nhập kho mới từ nhà cung cấp
            </p>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ── Supplier Banner ── */}
          <div className=" to-cyan-50 border-b border-sky-100 px-6 py-4">
            <div className="max-w-sm">
              <label className={`${labelBase} text-sky-600`}>
                Tên Nhà Cung Cấp <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className={`${inputBase} border-sky-200 focus:border-sky-400`}
                placeholder="VD: Dược Hậu Giang, Pymepharco..."
              />
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit}>
            <div className="p-5">
              {/* Section Label */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Layers size={14} className="text-slate-500" />
                </div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Danh sách mặt hàng nhập
                </span>
                <span className="bg-slate-100 text-slate-500 text-[11px] font-bold rounded-md px-2 py-0.5">
                  {items.length} dòng
                </span>
              </div>

              {/* ── Item Rows ── */}
              <div className="flex flex-col gap-3">
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
                    : "đ.vị";
                  const isExistingBatch = item.batchSelection !== "NEW";
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
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-sky-200 hover:shadow-sm transition-all duration-200">
                      {/* Row number badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-white border border-slate-200 rounded-md flex items-center justify-center text-[11px] font-bold text-slate-400">
                          {index + 1}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all duration-150">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* ── ROW 1: Tìm thuốc | Lô | Mã lô | Quy cách ── */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {/* 1. TÌM THUỐC */}
                        <div className="relative">
                          <label className={`${labelBase} text-slate-500`}>
                            Tìm &amp; Chọn Thuốc
                          </label>
                          <div className="relative">
                            <Search
                              size={13}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
                              className={`${inputBase} pl-8 ${item.medicineId ? "border-sky-200" : ""}`}
                            />
                          </div>

                          {/* Dropdown */}
                          {item.isMedicineDropdownOpen && (
                            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto">
                              {searchedMedicines.length > 0 ? (
                                searchedMedicines.map((m) => (
                                  <li
                                    key={m._id}
                                    onClick={() =>
                                      handleSelectMedicine(index, m)
                                    }
                                    className="px-3 py-2.5 cursor-pointer border-b border-slate-50 hover:bg-sky-50 transition-colors last:border-0">
                                    <p className="font-bold text-slate-800 text-[13px]">
                                      {m.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Mã: {m.code}
                                    </p>
                                  </li>
                                ))
                              ) : (
                                <li className="px-3 py-3.5 text-center text-[13px] text-slate-400 italic">
                                  Không tìm thấy thuốc
                                </li>
                              )}
                            </ul>
                          )}
                        </div>

                        {/* 2. CHỌN LÔ */}
                        <div>
                          <label className={`${labelBase} text-slate-500`}>
                            Lô (Batch)
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
                            className={`${inputBase} cursor-pointer disabled:cursor-not-allowed ${item.medicineId ? "border-sky-200 focus:border-sky-400 focus:ring-sky-100" : ""}`}>
                            <option value="NEW">➕ Tạo lô mới</option>
                            {availableBatches.map((b) => (
                              <option key={b.batchCode} value={b.batchCode}>
                                {b.batchCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3. MÃ LÔ MỚI (conditional) / placeholder khi existing */}
                        {!isExistingBatch ? (
                          <div>
                            <label className={`${labelBase} text-slate-500`}>
                              Mã Lô
                            </label>
                            <input
                              required
                              value={item.batchCode}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "batchCode",
                                  e.target.value,
                                )
                              }
                              className={`${inputBase} border-sky-200 focus:border-sky-400 focus:ring-sky-100`}
                              placeholder="Mã lô..."
                            />
                          </div>
                        ) : (
                          <div>
                            <label className={`${labelBase} text-slate-500`}>
                              Mã Lô
                            </label>
                            <input
                              readOnly
                              value={item.batchCode}
                              className={inputBase}
                            />
                          </div>
                        )}

                        {/* 4. QUY CÁCH */}
                        <div>
                          <label className={`${labelBase} text-slate-500`}>
                            Quy Cách
                          </label>
                          <select
                            required
                            disabled={!item.medicineId}
                            value={item.variantId}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "variantId",
                                e.target.value,
                              )
                            }
                            className={`${inputBase} cursor-pointer disabled:cursor-not-allowed ${item.medicineId ? "border-sky-200 focus:border-sky-400 focus:ring-sky-100" : ""}`}>
                            <option value="">-- Chọn --</option>
                            {filteredVariants.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.unit} ({v.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* ── ROW 2: Ngày SX | Hạn SD | SL Nhập | Giá nhập ── */}
                      <div className="grid grid-cols-4 gap-3">
                        {/* 5. NGÀY SẢN XUẤT */}
                        <div>
                          <label className={`${labelBase} text-slate-500`}>
                            <span className="flex items-center gap-1">
                              <CalendarDays size={10} /> Ngày Sản Xuất
                            </span>
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
                            className={inputBase}
                          />
                        </div>

                        {/* 6. HẠN SỬ DỤNG */}
                        <div>
                          <label className={`${labelBase} text-slate-500`}>
                            <span className="flex items-center gap-1">
                              <CalendarDays size={10} /> Hạn Sử Dụng
                            </span>
                          </label>
                          <input
                            type="date"
                            required
                            min={item.manufacturingDate || todayString}
                            readOnly={isExistingBatch}
                            value={item.expiryDate}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "expiryDate",
                                e.target.value,
                              )
                            }
                            className={inputBase}
                          />
                        </div>

                        {/* 7. SỐ LƯỢNG */}
                        <div>
                          <label className={`${labelBase} text-slate-500`}>
                            SL Nhập
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            className={`${inputBase} text-center font-extrabold text-base text-sky-600 focus:border-sky-400 focus:ring-sky-100`}
                          />
                        </div>

                        {/* 8. GIÁ NHẬP */}
                        <div>
                          <label className={`${labelBase} text-red-500`}>
                            Giá Nhập / {unitLabel}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.price}
                              onChange={(e) =>
                                handleItemChange(index, "price", e.target.value)
                              }
                              className={`${inputBase} border-red-200 text-red-600 font-bold pr-7 focus:border-red-400 focus:ring-red-100`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold pointer-events-none">
                              đ
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Row */}
              <button
                type="button"
                onClick={addItemRow}
                className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-transparent border border-dashed border-sky-300 rounded-xl text-[13px] font-bold text-sky-600 hover:bg-sky-50 transition-colors duration-200">
                <Plus size={15} strokeWidth={2.5} />
                Thêm dòng mặt hàng
              </button>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
              {/* Total Value */}
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                <span className="text-[13px] text-orange-800 font-semibold">
                  Tổng giá trị phiếu nhập:
                </span>
                <span className="text-xl font-black text-red-600 leading-none">
                  {totalValue.toLocaleString()}
                  <span className="text-[13px] font-bold ml-0.5">đ</span>
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100 transition-colors duration-200">
                  ← Quay lại
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-sky-400 border-none rounded-xl text-[14px] font-extrabold text-white shadow-lg shadow-sky-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-100 active:translate-y-0 transition-all duration-200 tracking-wide">
                  <Save size={16} />
                  Hoàn tất nhập kho
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImportSupplier;
