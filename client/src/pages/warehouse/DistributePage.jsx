import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Plus,
  Save,
  Search,
  Store,
  Trash,
  Trash2,
  Undo2,
  Layers,
  CheckCircle2,
  Pill,
  CalendarDays,
  User,
  Info,
  X,
  Tag,
  FileWarning,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import html2pdf from "html2pdf.js";

const DistributePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("DISTRIBUTE");
  const [allBranches, setAllBranches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [toBranchId, setToBranchId] = useState("");
  const [allVariants, setAllVariants] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [categories, setCategories] = useState([]);

  // State bộ lọc (Trái)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterRx, setFilterRx] = useState("ALL");

  // Modal Chi tiết thuốc
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Danh sách item trong phiếu (Phải)
  const [items, setItems] = useState([]);

  const todayString = new Date().toLocaleDateString("vi-VN");

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    fetchInventoryForMode();
  }, [mode]);

  const fetchBaseData = async () => {
    try {
      const [branchRes, varRes, catRes] = await Promise.all([
        api.get("/branches"),
        api.get("/medicines/variants"),
        api.get("/categories"),
      ]);
      const fetchedBranches = branchRes.data.data || [];
      setAllBranches(fetchedBranches);
      setBranches(fetchedBranches.filter((b) => b.type !== "warehouse"));
      setAllVariants(varRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu nền", err);
    }
  };

  const fetchInventoryForMode = async () => {
    try {
      const branchQuery =
        (mode === "RETURN" || mode === "DISPOSE") && user.branchId
          ? `?branchId=${user.branchId}`
          : "";
      const invRes = await api.get(`/inventories${branchQuery}`);
      setInventories(invRes.data.data || []);
      setItems([]); // Clear phiếu khi đổi mode
    } catch (err) {
      console.error("Lỗi tải tồn kho", err);
    }
  };

  // LỌC TỒN KHO: Chỉ lấy những thuốc đang thực sự có trong kho (inventories)
  const filteredInventories = inventories.filter((inv) => {
    const med = inv.medicineId;
    if (!med) return false;

    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.ingredients &&
        med.ingredients.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "" ||
      med.categoryId?._id === selectedCategory ||
      med.categoryId === selectedCategory;

    const matchesRx =
      filterRx === "ALL" ||
      (filterRx === "RX" && med.isPrescription === true) ||
      (filterRx === "NON_RX" && med.isPrescription === false);

    return matchesSearch && matchesCategory && matchesRx;
  });

  const handleOpenDetailModal = (medicine) => {
    setSelectedMedicine(medicine);
    setIsModalOpen(true);
  };

  const handleSelectVariantToAdd = (medicine, variant) => {
    const newItem = {
      medicineId: medicine._id,
      medicineName: medicine.name,
      medicineCode: medicine.code,
      variantId: variant._id,
      variantName: variant.name,
      unit: variant.unit,
      batchCode: "",
      batchId: "",
      reason: "OVERSTOCK",
      quantity: 1,
    };
    setItems([...items, newItem]);
    setIsModalOpen(false);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách?")) {
      setItems([]);
    }
  };

  /* ─── LOGIC IN PHIẾU XUẤT HỦY ─── */
  const generateDisposalPDF = async (transaction) => {
    let branchName = user?.branchId
      ? allBranches.find((x) => x._id === user.branchId)?.name
      : "Kho Tổng";

    const creatorName = user?.fullName || user?.username || "Admin";
    const txDate = new Date(transaction.createdAt).toLocaleString("vi-VN");

    let totalValue = 0;
    let htmlRows = "";

    transaction.details.forEach((item, idx) => {
      const formItem =
        items.find(
          (c) =>
            c.variantId === item.variantId && c.batchCode === item.batchCode,
        ) || items.find((c) => c.variantId === item.variantId);

      const name = formItem?.medicineName || "Sản phẩm không rõ";
      const unit = formItem?.unit || "---";
      const expiry = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
        : "---";

      const itemTotal = (item.quantity || 0) * (item.price || 0);
      totalValue += itemTotal;

      let reasonText = "";
      if (item.reason === "EXPIRED") reasonText = "Hết hạn/Cận date";
      else if (item.reason === "DAMAGED") reasonText = "Hư hỏng";
      else reasonText = item.reason || "Lý do khác";

      htmlRows += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${name}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.batchCode || "---"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${expiry}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${unit}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${reasonText}</td>
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
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị hủy: <strong>${branchName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">Mã phiếu: ${transaction.code}</p>
            <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${txDate}</p>
          </div>
        </div>

        <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">PHIẾU XUẤT HỦY HÀNG HÓA</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #000; padding: 10px; width: 5%;">STT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 25%;">Tên hàng hóa</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Số lô</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Hạn SD</th>
              <th style="border: 1px solid #000; padding: 10px; width: 8%;">ĐVT</th>
              <th style="border: 1px solid #000; padding: 10px; width: 7%;">S.Lượng</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Lý do</th>
              <th style="border: 1px solid #000; padding: 10px; width: 10%;">Đơn giá vốn</th>
              <th style="border: 1px solid #000; padding: 10px; width: 15%;">Trị giá tổn thất</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="8" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; text-transform: uppercase;">Tổng giá trị xuất hủy (Tổn thất):</td>
              <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; color: #dc2626;">${totalValue.toLocaleString("vi-VN")} đ</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px;">
          <div style="width: 30%;">
            <strong style="display: block; margin-bottom: 80px;">Người lập phiếu</strong>
            <span>${creatorName}</span>
          </div>
          <div style="width: 30%;">
            <strong style="display: block; margin-bottom: 80px;">Thủ kho / Dược sĩ</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 30%;">
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

  /* ─── LOGIC IN PHIẾU XUẤT/TRẢ PDF ─── */
  const generatePDF = async (transaction, currentMode, targetBranchId) => {
    let fromName = "Kho Tổng";
    let toName = "Kho Tổng";

    if (currentMode === "DISTRIBUTE") {
      fromName =
        allBranches.find((b) => b._id === user.branchId)?.name || "Kho Tổng";
      toName =
        allBranches.find((b) => b._id === targetBranchId)?.name ||
        "Chi nhánh...";
    } else if (currentMode === "RETURN") {
      fromName =
        allBranches.find((b) => b._id === user.branchId)?.name ||
        "Chi nhánh...";
      toName = "Kho Tổng";
    }

    const title =
      currentMode === "DISTRIBUTE"
        ? "PHIẾU XUẤT KHO"
        : "PHIẾU TRẢ HÀNG VỀ KHO TỔNG";
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
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị xuất: <strong>${fromName}</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Đơn vị nhận: <strong>${toName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">Mã phiếu: ${transaction.code}</p>
            <p style="margin: 5px 0; font-size: 14px; font-style: italic;">Ngày lập: ${txDate}</p>
          </div>
        </div>

        <h2 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 25px;">${title}</h2>

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
            <strong style="display: block; margin-bottom: 80px;">Người nhận</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div style="width: 25%;">
            <strong style="display: block; margin-bottom: 80px;">Thủ kho xuất</strong>
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
      if (mode === "RETURN") {
        if (
          !user.branchId ||
          user.role === "admin" ||
          user.role === "warehouse_manager"
        ) {
          return alert(
            "Lỗi: Kho tổng không thể thao tác trả hàng về chính Kho tổng!",
          );
        }
      }

      if (mode === "DISTRIBUTE" && !toBranchId)
        return alert("Vui lòng chọn chi nhánh nhận hàng!");

      if (items.length === 0) return alert("Phiếu chưa có mặt hàng nào!");

      // --- LOGIC KIỂM TRA TỒN KHO TRƯỚC KHI SUBMIT ---
      // for (let i = 0; i < items.length; i++) {
      //   if (!items[i].medicineId)
      //     return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
      //   if (!items[i].variantId)
      //     return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
      //   if ((mode === "RETURN" || mode === "DISPOSE") && !items[i].batchId)
      //     return alert(`Dòng thứ ${i + 1}: Vui lòng chọn Mã lô cần thao tác!`);
      //   if (items[i].quantity <= 0)
      //     return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);

      //   // Check vượt quá tồn kho (Bất kể Distribute hay Dispose)
      //   const variant = allVariants.find((v) => v._id === items[i].variantId);
      //   const medInv = inventories.find(
      //     (inv) => inv.medicineId?._id === items[i].medicineId,
      //   );
      //   const batch = medInv?.batches.find((b) => b._id === items[i].batchId);

      //   if (variant && batch) {
      //     const baseQtyDeduct = items[i].quantity * variant.conversionRate;
      //     if (baseQtyDeduct > batch.quantity) {
      //       return alert(
      //         `Dòng ${i + 1}: Số lượng quy đổi (${baseQtyDeduct} đ.vị cơ sở) vượt quá tồn kho thực tế của lô này (${batch.quantity})!`,
      //       );
      //     }
      //   }
      // }
      // --- LOGIC KIỂM TRA TỒN KHO TRƯỚC KHI SUBMIT ---
      for (let i = 0; i < items.length; i++) {
        if (!items[i].medicineId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
        if (!items[i].variantId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
        if ((mode === "RETURN" || mode === "DISPOSE") && !items[i].batchId)
          return alert(`Dòng thứ ${i + 1}: Vui lòng chọn Mã lô cần thao tác!`);
        if (items[i].quantity <= 0)
          return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);

        const variant = allVariants.find((v) => v._id === items[i].variantId);
        const medInv = inventories.find(
          (inv) => inv.medicineId?._id === items[i].medicineId,
        );

        if (!variant || !medInv) continue;

        const baseQtyDeduct = items[i].quantity * variant.conversionRate;

        // 1. KIỂM TRA CHO CHẾ ĐỘ XUẤT ĐI (Cộng dồn tất cả các lô đang có)
        if (mode === "DISTRIBUTE") {
          const activeBatches = medInv.batches.filter(
            (b) =>
              b.quantity > 0 &&
              b.quality === "GOOD" &&
              new Date(b.expiryDate) > new Date(),
          );
          const totalAvailable = activeBatches.reduce(
            (sum, b) => sum + b.quantity,
            0,
          );

          if (baseQtyDeduct > totalAvailable) {
            return alert(
              `Dòng ${i + 1}: Số lượng xuất quy đổi (${baseQtyDeduct} đ.vị) vượt quá TỔNG tồn kho khả dụng (${totalAvailable} đ.vị) của thuốc này!`,
            );
          }
        }
        // 2. KIỂM TRA CHO CHẾ ĐỘ TRẢ VỀ / XUẤT HỦY (Chỉ kiểm tra trên 1 lô cụ thể được chọn)
        else {
          const batch = medInv.batches.find((b) => b._id === items[i].batchId);
          if (batch && baseQtyDeduct > batch.quantity) {
            return alert(
              `Dòng ${i + 1}: Số lượng quy đổi (${baseQtyDeduct} đ.vị) vượt quá tồn kho thực tế của lô này (${batch.quantity})!`,
            );
          }
        }
      }
      const payloadItems = items.map((item) => ({
        variantId: item.variantId,
        batchCode: mode !== "DISTRIBUTE" ? item.batchCode : undefined,
        batchId: mode !== "DISTRIBUTE" ? item.batchId : undefined,
        reason: mode !== "DISTRIBUTE" ? item.reason : undefined,
        quantity: Number(item.quantity),
      }));

      let endpoint = "/transactions/distribute";
      if (mode === "RETURN") endpoint = "/transactions/return";
      if (mode === "DISPOSE") endpoint = "/transactions/dispose";

      const response = await api.post(endpoint, {
        toBranchId: mode === "DISTRIBUTE" ? toBranchId : undefined,
        items: payloadItems,
      });

      if (response?.data?.success) {
        if (mode === "DISPOSE") {
          const wantToPrint = window.confirm(
            "Chốt phiếu xuất hủy thành công! Chi phí tổn thất đã được ghi nhận. Bạn có muốn in PHIẾU XUẤT HỦY không?",
          );
          if (wantToPrint && response.data.transaction) {
            await generateDisposalPDF(response.data.transaction);
          }
        } else {
          const wantToPrint = window.confirm(
            `Giao dịch thành công! Bạn có muốn in ${mode === "RETURN" ? "PHIẾU TRẢ HÀNG" : "PHIẾU XUẤT KHO"} không?`,
          );
          if (wantToPrint && response.data.transaction) {
            await generatePDF(response.data.transaction, mode, toBranchId);
          }
        }

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

  const themes = {
    DISTRIBUTE: {
      icon: <ArrowRightLeft size={22} color="white" />,
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)", // Sky theme
      shadow: "0 4px 14px rgba(14, 165, 233, 0.3)",
      bannerBg: "bg-sky-50/50",
      bannerBorder: "border-sky-100",
      rowHover: "hover:border-sky-300 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
      submitShadow: "0 4px 14px rgba(14, 165, 233, 0.3)",
      title: "Luân Chuyển Xuất Kho",
      subtitle: "Phân phối hàng hóa từ Kho tổng đến các Chi nhánh",
      submitLabel: "Hoàn Tất Xuất Kho",
      focusRing: "focus:border-sky-500 focus:ring-sky-500/20",
      textPrimary: "text-sky-600",
    },
    RETURN: {
      icon: <Undo2 size={22} color="white" />,
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
      shadow: "0 4px 14px rgba(14, 165, 233, 0.3)",
      bannerBg: "bg-sky-50/50",
      bannerBorder: "border-sky-100",
      rowHover: "hover:border-sky-300 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
      submitShadow: "0 4px 14px rgba(14, 165, 233, 0.3)",
      title: "Trả Hàng Về Kho Tổng",
      subtitle: "Gửi trả hàng cận date, bán chậm về lại Kho tổng",
      submitLabel: "Hoàn Tất Trả Hàng",
      focusRing: "focus:border-sky-500 focus:ring-sky-500/20",
      textPrimary: "text-sky-600",
    },
    DISPOSE: {
      icon: <Trash size={22} color="white" />,
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      shadow: "0 4px 14px rgba(239,68,68,.35)",
      bannerBg: "bg-red-50/50",
      bannerBorder: "border-red-200",
      rowHover: "hover:border-red-300 hover:shadow-md",
      submitGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
      submitShadow: "0 4px 14px rgba(239,68,68,.35)",
      title: "Lập Phiếu Xuất Hủy",
      subtitle: "Hủy bỏ hàng hóa hết hạn, hư hỏng (Ghi nhận vào tổn thất)",
      submitLabel: "Chốt Phiếu Xuất Hủy",
      focusRing: "focus:border-red-500 focus:ring-red-500/20",
      textPrimary: "text-red-600",
    },
  };
  const t = themes[mode];

  const inputBase = `w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 bg-white outline-none transition ${t.focusRing} disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50 read-only:text-slate-500 read-only:font-bold`;
  const labelBase =
    "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <div
      className="flex flex-col h-[calc(100vh-10px)] bg-gradient-to-br from-sky-50 via-blue-50
      to-slate-50 p-6 font-sans "
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-up {
          animation: floatUp 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0 animate-float-up">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{ background: t.gradient, boxShadow: t.shadow }}>
            {t.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {t.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 w-full md:w-auto">
          {[
            { key: "DISTRIBUTE", label: "Xuất đi" },
            { key: "RETURN", label: "Trả về" },
            // { key: "DISPOSE", label: "Xuất hủy" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                // Kiểm tra quyền: Nếu là Admin hoặc Warehouse Manager và nhấn vào tab RETURN
                if (
                  key === "RETURN" &&
                  (user?.role === "admin" || user?.role === "warehouse_manager")
                ) {
                  alert("Bạn không có quyền thực hiện hành động này");
                  return; // Dừng lại, không thực hiện setMode
                }
                setMode(key);
              }}
              className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === key
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
              style={
                mode === key
                  ? {
                      background:
                        key === "DISPOSE"
                          ? "linear-gradient(135deg, #ef4444, #dc2626)"
                          : "linear-gradient(135deg, #0ea5e9, #0369a1)",
                    }
                  : {}
              }>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* WORKSPACE CHIA LÀM 2 PHẦN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden animate-float-up">
        {/* ==================== PHẦN BÊN TRÁI: DANH SÁCH THUỐC ==================== */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2
              className={`text-sm font-bold ${mode === "DISPOSE" ? "text-red-600" : "text-slate-600"} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
              <Pill size={16} /> Tìm & Chọn Thuốc
            </h2>

            {/* Thanh tìm kiếm nâng cao */}
            <div className="relative mb-3">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Tìm theo tên thuốc, mã..."
                className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 border border-slate-200 rounded-xl focus:ring-2 ${mode === "DISPOSE" ? "focus:border-red-500 focus:ring-red-500/20" : "focus:border-sky-500 focus:ring-sky-500/20"}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bộ lọc đa tiêu chí */}
            <div className="grid grid-cols-2 gap-2">
              <select
                className={`w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-600 ${mode === "DISPOSE" ? "focus:border-red-500" : "focus:border-sky-500"}`}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                className={`w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-600 ${mode === "DISPOSE" ? "focus:border-red-500" : "focus:border-sky-500"}`}
                value={filterRx}
                onChange={(e) => setFilterRx(e.target.value)}>
                <option value="ALL">Tất cả phân loại</option>
                <option value="RX">Thuốc kê đơn (Rx)</option>
                <option value="NON_RX">Không kê đơn</option>
              </select>
            </div>
          </div>

          {/* Khối hiển thị danh sách thuốc (Lấy từ Tồn kho) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30 scrollbar-thin">
            {filteredInventories.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                Không tìm thấy loại thuốc nào trong kho của bạn.
              </div>
            ) : (
              filteredInventories.map((inv) => {
                const med = inv.medicineId;
                if (!med) return null;

                const medVariants = allVariants.filter(
                  (v) =>
                    v.medicineId?._id === med._id || v.medicineId === med._id,
                );

                // Lọc số lượng lô hợp lệ tùy theo Mode
                const activeBatches = inv.batches.filter((b) => {
                  if (b.quantity <= 0) return false;
                  if (mode === "DISTRIBUTE") {
                    const today = new Date();
                    return (
                      b.quality === "GOOD" && new Date(b.expiryDate) > today
                    );
                  }
                  return true;
                });

                const totalValidBaseQty = activeBatches.reduce(
                  (sum, b) => sum + b.quantity,
                  0,
                );
                const hasErrorBatches = inv.batches.some(
                  (b) => b.quantity > 0 && b.quality !== "GOOD",
                );

                const hoverBorder =
                  mode === "DISPOSE"
                    ? "hover:border-red-500"
                    : "hover:border-sky-500";
                const textHighlight =
                  mode === "DISPOSE"
                    ? "group-hover:text-red-600"
                    : "group-hover:text-sky-600";
                const bgHighlight =
                  mode === "DISPOSE"
                    ? "group-hover:bg-red-50"
                    : "group-hover:bg-sky-50";

                return (
                  <div
                    key={inv._id}
                    className={`bg-white border border-slate-100 rounded-xl p-3 shadow-sm ${hoverBorder} hover:shadow-md transition-all duration-200 flex flex-col`}>
                    {/* Header Thuốc - Click mở modal */}
                    <div
                      className="flex justify-between items-start mb-2 cursor-pointer group"
                      onClick={() => handleOpenDetailModal(med)}>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {med.code}
                          </span>
                          {med.isPrescription && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100">
                              Rx
                            </span>
                          )}
                        </div>
                        <h3
                          className={`font-bold text-slate-800 text-sm truncate transition-colors ${textHighlight}`}>
                          {med.name}
                        </h3>
                        <p
                          className="text-xs text-slate-400 truncate mt-0.5"
                          title={med.ingredients}>
                          Hoạt chất: {med.ingredients || "---"}
                        </p>

                        {/* Cảnh báo thuốc hết hàng hoặc có lỗi/cận date */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {totalValidBaseQty === 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              Hết tồn khả dụng
                            </span>
                          )}
                          {mode !== "DISTRIBUTE" && hasErrorBatches && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
                              Có hàng cận/lỗi
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 p-1.5 bg-slate-50 text-slate-400 rounded-lg transition-colors ${bgHighlight} ${textHighlight}`}
                        title="Xem chi tiết">
                        <Info size={16} />
                      </div>
                    </div>

                    {/* Danh sách quy cách (Biến thể) inline để bấm thêm nhanh */}
                    <div className="mt-1 pt-2 border-t border-slate-100 space-y-1.5">
                      {medVariants.length === 0 ? (
                        <p className="text-[11px] text-amber-500 italic">
                          Chưa cấu hình đơn vị.
                        </p>
                      ) : (
                        medVariants.map((variant) => {
                          const variantQty = Math.floor(
                            totalValidBaseQty / variant.conversionRate,
                          );
                          const isOutOfStock = variantQty <= 0;

                          return (
                            <div
                              key={variant._id}
                              className={`flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 transition-colors ${isOutOfStock ? "opacity-80" : mode === "DISPOSE" ? "hover:border-red-200" : "hover:border-sky-200"}`}>
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="text-xs font-semibold text-slate-700 block line-clamp-1">
                                  {variant.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ĐV: {variant.unit} | Tồn:{" "}
                                  <strong
                                    className={
                                      isOutOfStock
                                        ? "text-red-500"
                                        : mode === "DISPOSE"
                                          ? "text-red-600"
                                          : "text-sky-600"
                                    }>
                                    {variantQty}
                                  </strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectVariantToAdd(med, variant);
                                }}
                                className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md transition-colors border ${
                                  isOutOfStock
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                    : mode === "DISPOSE"
                                      ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600"
                                      : "bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-600 hover:text-white hover:border-sky-600"
                                }`}>
                                <Plus size={12} strokeWidth={3} /> Chọn
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== PHẦN BÊN PHẢI: GIAO DIỆN PHIẾU XUẤT ==================== */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
          {/* Header Phiếu & Nơi nhận */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            {/* Box Thông Tin Phiếu: Ngày Lập, Nhân Viên, Vị Trí Hiện Tại */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <CalendarDays size={14} /> Ngày lập:
                </span>
                <span className="font-bold text-slate-800">{todayString}</span>
              </div>
              <div className="w-px h-4 bg-slate-200 hidden md:block"></div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <User size={14} /> Người lập:
                </span>
                <span className="font-bold text-slate-800">
                  {user?.fullName || "Hệ thống"}
                </span>
              </div>
              <div className="w-px h-4 bg-slate-200 hidden md:block"></div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Store size={14} /> Từ kho:
                </span>
                <span className="font-bold text-slate-800">
                  {allBranches.find((b) => b._id === user?.branchId)?.name ||
                    "Kho Tổng"}
                </span>
              </div>
            </div>

            {/* Khung cấu hình Nơi nhận (Dành cho Distribute) hoặc Cảnh báo */}
            <div>
              {mode === "DISTRIBUTE" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Chọn chi nhánh nhận hàng{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className={`w-full px-3 py-2 text-sm outline-none border border-slate-200 rounded-xl transition-all font-semibold text-slate-400 ${t.focusRing}`}>
                    <option value="">-- Vui lòng chọn --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : mode === "RETURN" ? (
                <>
                  <p className={`text-sm font-bold ${t.textPrimary} mb-1`}>
                    Nơi nhận: Kho Tổng
                  </p>
                  <p
                    className={`text-xs ${t.textPrimary} opacity-80 leading-relaxed font-medium`}>
                    Hàng hóa trả về sẽ được chuyển vào khu vực chờ kiểm duyệt
                    tại Kho tổng. Hàng lỗi/cận date sẽ không được phân phối lại.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#b91c1c] mb-1 flex items-center gap-1.5">
                    <FileWarning size={16} /> Lưu ý nghiệp vụ Hủy hàng
                  </p>
                  <p className="text-xs text-[#991b1b] leading-relaxed font-medium">
                    Phiếu xuất hủy sẽ trừ vĩnh viễn số lượng tồn kho và tự động
                    hạch toán vào <strong>Chi phí tổn thất</strong>. Hệ thống sẽ
                    cảnh báo đỏ nếu số lượng xuất vượt quá số lượng tồn kho thực
                    tế của lô.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Dải tiêu đề của Bảng chi tiết mặt hàng */}
          <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Layers size={16} className={t.textPrimary} />
              <span className="text-sm font-bold text-slate-700">
                Chi tiết xuất hàng ({items.length})
              </span>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors">
                <Trash2 size={14} /> Xóa tất cả
              </button>
            )}
          </div>

          {/* Bảng chi tiết các mặt hàng Responsive Grid */}
          <div className="flex-1 overflow-auto p-4 bg-slate-50/30 scrollbar-thin">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-10">
                <Tag size={40} className="text-slate-200" />
                <p className="text-sm font-medium text-slate-500">
                  Chưa có sản phẩm nào trong phiếu.
                </p>
                <p className="text-xs text-slate-400">
                  Chọn thuốc ở danh sách bên trái để thêm vào phiếu.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                {items.map((item, index) => {
                  const medInventory = inventories.find(
                    (inv) =>
                      inv.medicineId === item.medicineId ||
                      inv.medicineId?._id === item.medicineId,
                  );
                  const baseUnit = medInventory
                    ? medInventory.medicineId.baseUnit
                    : "đ.vị";

                  // Lọc lô hiển thị dựa trên mode
                  const activeBatches = medInventory
                    ? medInventory.batches.filter((b) => {
                        if (b.quantity <= 0) return false;
                        if (mode === "DISTRIBUTE") {
                          const today = new Date();
                          return (
                            b.quality === "GOOD" &&
                            new Date(b.expiryDate) > today
                          );
                        }
                        return true;
                      })
                    : [];

                  const totalValidBaseQty = activeBatches.reduce(
                    (sum, b) => sum + b.quantity,
                    0,
                  );

                  // KIỂM TRA OVERLIMIT (SỐ LƯỢNG LỐ) CHO DÒNG HIỆN TẠI
                  const selectedVariant = allVariants.find(
                    (v) => v._id === item.variantId,
                  );
                  const selectedBatch = activeBatches.find(
                    (b) => b._id === item.batchId,
                  );
                  const baseQtyDeduct =
                    selectedVariant && selectedBatch && item.quantity
                      ? item.quantity * selectedVariant.conversionRate
                      : 0;

                  // Chỉ check overLimit khi không phải mode DISTRIBUTE (hoặc nếu phân phối cũng bắt buộc phải chọn lô trước)
                  const isOverLimit =
                    (mode === "RETURN" || mode === "DISPOSE") &&
                    selectedBatch &&
                    baseQtyDeduct > selectedBatch.quantity;

                  // CSS viền đỏ nếu lỗi
                  const errorBorderCls = isOverLimit
                    ? "border-red-400 ring-1 ring-red-400"
                    : "border-slate-200";

                  return (
                    <div
                      key={index}
                      className={`bg-white border rounded-xl p-3 shadow-sm transition-all duration-200 ${errorBorderCls} ${t.rowHover} relative overflow-hidden`}>
                      {/* Dải line màu cảnh báo nếu là hàng hư hỏng ở mode Dispose */}
                      {(mode === "RETURN" || mode === "DISPOSE") &&
                        selectedBatch?.quality !== "GOOD" &&
                        selectedBatch && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                        )}

                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                        <div className="pl-3">
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-100 rounded text-[10px] flex items-center justify-center text-slate-500 font-bold">
                              {index + 1}
                            </span>
                            {item.variantName || item.medicineName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 pl-7">
                            Mã: {item.medicineCode} | ĐV: {item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Hiển thị tổng tồn kho khả dụng */}
                          <span
                            className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                              totalValidBaseQty > 0
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-red-700 bg-red-50 border-red-200"
                            }`}>
                            Tồn khả dụng: {totalValidBaseQty} {baseUnit}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                            title="Xóa dòng">
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pl-10 pr-2">
                        {/* 1. MÃ LÔ (Khác DISTRIBUTE thì bắt buộc chọn lô) */}
                        {mode !== "DISTRIBUTE" && (
                          <div className="col-span-2 lg:col-span-2">
                            <label className={labelBase}>
                              Mã Lô <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              disabled={activeBatches.length === 0}
                              value={item.batchId || ""}
                              onChange={(e) => {
                                const bId = e.target.value;
                                const bMatch = activeBatches.find(
                                  (b) => b._id === bId,
                                );
                                handleItemChange(index, "batchId", bId);
                                handleItemChange(
                                  index,
                                  "batchCode",
                                  bMatch ? bMatch.batchCode : "",
                                );
                              }}
                              className={inputBase}>
                              <option value="">-- Chọn lô --</option>
                              {activeBatches.map((b) => {
                                const qualityLabel =
                                  b.quality === "GOOD"
                                    ? "An toàn"
                                    : b.quality === "EXPIRED"
                                      ? "Hết hạn"
                                      : b.quality === "DAMAGED"
                                        ? "Hư hỏng"
                                        : b.quality;
                                return (
                                  <option key={b._id} value={b._id}>
                                    {b.batchCode} (Tồn {b.quantity}) —{" "}
                                    {qualityLabel}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}

                        {/* 2. LÝ DO (Chỉ RETURN và DISPOSE) */}
                        {mode !== "DISTRIBUTE" && (
                          <div className="col-span-2 lg:col-span-1">
                            <label className={labelBase}>Lý do</label>
                            <select
                              value={item.reason}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "reason",
                                  e.target.value,
                                )
                              }
                              className={inputBase}>
                              {mode === "RETURN" && (
                                <option value="OVERSTOCK">
                                  Bán chậm / Quá tồn
                                </option>
                              )}
                              <option value="EXPIRED">
                                Cận Date / Hết hạn
                              </option>
                              <option value="DAMAGED">Hư hỏng / Lỗi NSX</option>
                            </select>
                          </div>
                        )}

                        {/* 3. SỐ LƯỢNG (Dùng cho cả 3 Mode) */}
                        <div
                          className={`col-span-2 ${mode === "DISTRIBUTE" ? "lg:col-span-4" : "lg:col-span-1"}`}>
                          <label className={labelBase}>
                            Số lượng <span className="text-red-500">*</span>
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
                                Math.max(1, parseInt(e.target.value) || 1),
                              )
                            }
                            className={`w-full border rounded-xl px-2.5 py-2 text-center font-extrabold text-[15px] outline-none transition 
                              ${isOverLimit ? "border-red-500 text-red-600 bg-red-50" : "border-slate-200 " + t.textPrimary + " bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"}`}
                          />
                        </div>
                      </div>

                      {/* Hiển thị lỗi đỏ nếu số lượng quy đổi lớn hơn tồn của lô (Giống logic trong Modal Disposal cũ) */}
                      {isOverLimit && (
                        <p className="text-[10px] text-red-500 mt-2 pl-10 italic">
                          * Lỗi: Số lượng quy đổi ra đơn vị cơ sở (
                          {baseQtyDeduct} {baseUnit}) vượt quá tồn kho hiện tại
                          của lô này ({selectedBatch.quantity} {baseUnit})!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER: NÚT LƯU PHIẾU */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button
              type="submit"
              disabled={items.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: items.length > 0 ? t.submitGradient : "#94a3b8",
                boxShadow: items.length > 0 ? t.submitShadow : "none",
              }}>
              <Save size={18} />
              {t.submitLabel}
            </button>
          </div>
        </form>
      </div>

      {/* ==================== DIALOG MODAL: CHI TIẾT THUỐC ==================== */}
      {isModalOpen && selectedMedicine && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg ${mode === "DISPOSE" ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600"} flex items-center justify-center font-bold text-sm`}>
                  <Pill size={16} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-base leading-tight">
                    Thông Tin Chi Tiết Thuốc
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mã thuốc hệ thống:{" "}
                    <span className="font-bold text-slate-600">
                      {selectedMedicine.code}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-slate-700">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Tên thuốc gốc
                </p>
                <p className="font-bold text-slate-800 text-base mt-0.5">
                  {selectedMedicine.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Phân loại đơn
                  </p>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {selectedMedicine.isPrescription ? (
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        Thuốc Kê Đơn (Rx)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Thuốc Không Kê Đơn
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Đơn vị cơ sở gốc
                  </p>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {selectedMedicine.baseUnit || "Viên"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Thành phần / Hoạt chất chính
                </p>
                <p className="font-medium text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                  {selectedMedicine.ingredients ||
                    "Chưa cập nhật dữ liệu hoạt chất lâm sàng."}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Hãng / Nhà sản xuất
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedMedicine.manufacturer || "Chưa rõ nguồn gốc xuất xứ"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributePage;
