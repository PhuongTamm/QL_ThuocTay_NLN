import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Store,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Eye,
  X,
  History,
  Loader2,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Trash2,
  Plus,
  Minus,
  FileWarning,
  Printer,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import html2pdf from "html2pdf.js";

/* ─── 1. ĐƯA MODAL OVERLAY RA NGOÀI ĐỂ KHÔNG BỊ GIẬT/LOAD LẠI KHI GÕ PHÍM ─── */
const ModalOverlay = ({ children, onClose, zIndex = "z-40" }) => (
  <div
    className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center ${zIndex} p-4`}
    style={{ animation: "fadeIn .2s ease" }}
    onClick={onClose}>
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        animation: "modalIn .22s ease",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}>
      {children}
    </div>
  </div>
);

const InventoryPage = () => {
  const { user } = useAuth();
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("qty_desc");

  // Modals Detail & History
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- STATES CHO CHỨC NĂNG XUẤT HỦY ---
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [disposeSearchTerm, setDisposeSearchTerm] = useState("");
  const [disposeCart, setDisposeCart] = useState([]);
  const [isSubmittingDispose, setIsSubmittingDispose] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "warehouse_manager") {
      api.get("/branches").then((res) => setBranches(res.data.data || []));
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const url = selectedBranchId
        ? `/inventories?branchId=${selectedBranchId}`
        : "/inventories";
      const res = await api.get(url);
      setInventories(res.data.data || []);
    } catch (error) {
      console.error("Lỗi tải tồn kho:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProcessedData = () => {
    let data = [...inventories];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (inv) =>
          inv.medicineId?.name.toLowerCase().includes(term) ||
          inv.medicineId?.code.toLowerCase().includes(term),
      );
    }
    if (filterStatus !== "all") {
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(today.getMonth() + 3);
      data = data.filter((inv) => {
        if (filterStatus === "low_stock") return inv.totalQuantity < 20;
        const activeBatches = inv.batches.filter((b) => b.quantity > 0);
        if (activeBatches.length === 0) return false;
        const nearestExpiry = new Date(
          Math.min(...activeBatches.map((b) => new Date(b.expiryDate))),
        );
        if (filterStatus === "expired") return nearestExpiry < today;
        if (filterStatus === "expiring_soon")
          return nearestExpiry >= today && nearestExpiry <= threeMonthsLater;
        return true;
      });
    }
    data.sort((a, b) => {
      if (sortBy === "qty_desc") return b.totalQuantity - a.totalQuantity;
      if (sortBy === "qty_asc") return a.totalQuantity - b.totalQuantity;
      if (sortBy === "name_asc")
        return (a.medicineId?.name || "").localeCompare(
          b.medicineId?.name || "",
        );
      return 0;
    });
    return data;
  };
  const processedData = getProcessedData();

  const handleOpenDetail = (inv) => {
    setSelectedInventory(inv);
    setIsModalOpen(true);
  };

  const handleOpenBatchHistory = async (
    batchCode,
    importPrice,
    batchQuality,
  ) => {
    setSelectedBatchCode(batchCode);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const targetBranch = selectedBranchId || user.branchId;
      const res = await api.get(
        `/transactions/batch-history?branchId=${targetBranch}&medicineId=${selectedInventory.medicineId._id}&batchCode=${batchCode}&importPrice=${importPrice}&batchQuality=${batchQuality}`,
      );
      setBatchHistory(res.data.data || []);
    } catch (error) {
      alert("Lỗi lấy lịch sử: " + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getExpiryStatus = (value) => {
    if (value === "OVERSTOCK")
      return {
        label: "Hàng ế (Thừa)",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: "warning",
      };
    if (value === "EXPIRED")
      return {
        label: "Hàng hết hạn",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: "expired",
      };
    if (value === "DAMAGED")
      return {
        label: "Hàng lỗi / Hư hỏng",
        color: "bg-orange-200 text-orange-700 border-orange-300",
        icon: "expired",
      };
    if (value === "GOOD") value = null;

    const expiryDate = new Date(value);
    if (!isNaN(expiryDate.getTime())) {
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0)
        return {
          label: "Đã quá hạn",
          color: "bg-red-100 text-red-700 border-red-200",
          icon: "expired",
        };
      if (diffDays <= 90)
        return {
          label: `Còn ${diffDays} ngày`,
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: "warning",
        };
      return {
        label: "An toàn",
        color: "bg-emerald-50 text-emerald-600 border-emerald-100",
        icon: "ok",
      };
    }
    return {
      label: "Không xác định",
      color: "bg-slate-100 text-slate-600 border-slate-200",
      icon: null,
    };
  };

  /* ─── LOGIC IN PHIẾU BÁO CÁO TỒN KHO PDF ─── */
  const handleExportPDF = () => {
    setIsExportingPDF(true);

    let branchName = user?.branchId
      ? branches.find((x) => x._id === user.branchId)?.name
      : "Kho của tôi";
    if (selectedBranchId) {
      const b = branches.find((x) => x._id === selectedBranchId);
      if (b)
        branchName =
          b.type === "warehouse"
            ? `Kho Tổng: ${b.name}`
            : `Chi nhánh: ${b.name}`;
    } else if (user?.role === "branch_manager" || user?.role === "pharmacist") {
      branchName = "Kho Chi nhánh của tôi";
    }

    const creatorName = user?.fullName || user?.username || "Admin";
    const exportTime = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    let totalMedicines = processedData.length;
    let totalBatches = 0;
    let totalBaseQuantity = 0;
    let totalImportValue = 0;
    let totalRetailValue = 0;

    processedData.forEach((inv) => {
      const activeBatches = inv.batches.filter((b) => b.quantity > 0);
      totalBatches += activeBatches.length;
      totalBaseQuantity += inv.totalQuantity;

      let itemTotalBaseQty = 0;
      activeBatches.forEach((b) => {
        totalImportValue += b.quantity * (b.importPrice || 0);
        itemTotalBaseQty += b.quantity;
      });

      let itemRetailValue = 0;
      if (inv.variants && inv.variants.length > 0) {
        const sortedVariants = [...inv.variants].sort(
          (a, b) => b.conversionRate - a.conversionRate,
        );

        let remainQty = itemTotalBaseQty;

        for (const variant of sortedVariants) {
          if (remainQty <= 0) break;
          const qtyForVariant = Math.floor(remainQty / variant.conversionRate);
          itemRetailValue += qtyForVariant * variant.currentPrice;
          remainQty = remainQty % variant.conversionRate;
        }

        if (remainQty > 0) {
          const smallestVariant = sortedVariants[sortedVariants.length - 1];
          itemRetailValue +=
            remainQty *
            (smallestVariant.currentPrice / smallestVariant.conversionRate);
        }
      }

      totalRetailValue += itemRetailValue;
    });

    const printDiv = document.createElement("div");
    printDiv.style.fontFamily = "Arial, sans-serif";
    printDiv.style.color = "#000000";
    printDiv.style.backgroundColor = "#ffffff";
    printDiv.style.padding = "20px";

    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold;">BÁO CÁO TỒN KHO TỔNG HỢP</h2>
      </div>

      <div style="margin-bottom: 25px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0;">Kho / Vị trí: <strong>${branchName}</strong></p>
        <p style="margin: 0;">Ngày xuất báo cáo: <strong>${exportTime}</strong></p>
        <p style="margin: 0;">Người lập phiếu: <strong>${creatorName}</strong></p>
      </div>

      <div style="margin-bottom: 30px; font-size: 14px; line-height: 1.8;">
        <h3 style="font-size: 16px; margin-bottom: 12px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 4px;">THỐNG KÊ TỔNG QUAN</h3>
        <p style="margin: 0;">Tổng số lô thuốc hiện có: <strong>${totalBatches} lô</strong></p>
        <p style="margin: 0;">Tổng số loại thuốc: <strong>${totalMedicines} loại</strong></p>
        <p style="margin: 0;">Tổng số lượng tồn: <strong>${totalBaseQuantity.toLocaleString()} (Đơn vị cơ sở)</strong></p>
        <p style="margin: 0;">Tổng giá trị tồn kho (theo giá nhập): <strong>${Math.round(totalImportValue).toLocaleString()} VNĐ</strong></p>
        <p style="margin: 0;">Tổng giá trị tồn kho (theo giá bán ước tính): <strong style="color: #0369a1;">${Math.round(totalRetailValue).toLocaleString()} VNĐ</strong></p>
      </div>

      <h3 style="font-size: 16px; margin-bottom: 10px; text-transform: uppercase; font-weight: bold;">BẢNG KÊ CHI TIẾT</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 5%;">STT</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 12%;">Mã Thuốc</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 25%;">Tên Thuốc</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; width: 45%;">Chi tiết Lô (Mã lô - HSD - Tồn - Đơn giá vốn)</th>
            <th style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; width: 13%;">Tổng Tồn</th>
          </tr>
        </thead>
        <tbody>
    `;

    processedData.forEach((inv, idx) => {
      const activeBatches = inv.batches.filter((b) => b.quantity > 0);
      let batchHtml = "";

      if (activeBatches.length > 0) {
        batchHtml = activeBatches
          .map((b) => {
            const expiry = b.expiryDate
              ? new Date(b.expiryDate).toLocaleDateString("vi-VN")
              : "---";
            const qualityText =
              b.quality !== "GOOD"
                ? ` <span style="color: #ef4444; font-size: 10px; font-weight: bold;">(${b.quality})</span>`
                : "";

            return `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1; font-family: monospace;">
                    <strong>${b.batchCode}</strong> | HSD: ${expiry} | Tồn: <span style="color: #ef4444; font-weight: bold;">${b.quantity}</span> | Vốn: ${b.importPrice?.toLocaleString() || 0}đ${qualityText}
                  </div>`;
          })
          .join("");
      } else {
        batchHtml = `<span style="color: #94a3b8; font-style: italic;">Đã xuất sạch / Hết hàng</span>`;
      }

      html += `
        <tr>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">${idx + 1}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top; font-family: monospace;"><strong>${inv.medicineId?.code || ""}</strong></td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">${inv.medicineId?.name || ""}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; vertical-align: top;">${batchHtml}</td>
          <td style="padding: 10px 8px; border: 1px solid #94a3b8; text-align: center; vertical-align: top;">
            <span style="color: #0369a1; font-weight: bold; font-size: 16px;">${inv.totalQuantity.toLocaleString()}</span><br/>
            <span style="font-size: 10px; color: #64748b;">${inv.medicineId?.baseUnit || ""}</span>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    printDiv.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `BaoCaoTonKho_${branchName.replace(/\s+/g, "")}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    html2pdf()
      .set(opt)
      .from(printDiv)
      .save()
      .then(() => {
        setIsExportingPDF(false);
      });
  };

  /* ─── LOGIC IN PHIẾU XUẤT HỦY (MỚI THÊM) ─── */
  const generateDisposalPDF = async (transaction) => {
    let branchName = user?.branchId
      ? branches.find((x) => x._id === user.branchId)?.name
      : "Kho của tôi";
    if (selectedBranchId) {
      const b = branches.find((x) => x._id === selectedBranchId);
      if (b)
        branchName =
          b.type === "warehouse"
            ? `Kho Tổng: ${b.name}`
            : `Chi nhánh: ${b.name}`;
    } else if (user?.role === "branch_manager" || user?.role === "pharmacist") {
      branchName = "Kho Chi nhánh của tôi";
    }

    const creatorName = user?.fullName || user?.username || "Admin";
    const txDate = new Date(transaction.createdAt).toLocaleString("vi-VN");

    let totalValue = 0;
    let htmlRows = "";

    transaction.details.forEach((item, idx) => {
      // Tìm thông tin biến thể từ dữ liệu disposeCart hiện tại hoặc fallback
      const cartItem = disposeCart.find((c) => c.variantId === item.variantId);
      const name = cartItem?.medicine?.name || "Sản phẩm không rõ";
      const unit =
        cartItem?.inventory?.variants?.find((v) => v._id === item.variantId)
          ?.unit || "---";
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

  /* ─── LOGIC XỬ LÝ CART XUẤT HỦY ─── */
  const getFlatBatchesForDisposal = () => {
    const list = [];
    inventories.forEach((inv) => {
      const matchSearch =
        inv.medicineId?.name
          .toLowerCase()
          .includes(disposeSearchTerm.toLowerCase()) ||
        inv.medicineId?.code
          .toLowerCase()
          .includes(disposeSearchTerm.toLowerCase()) ||
        inv.batches.some((b) =>
          b.batchCode.toLowerCase().includes(disposeSearchTerm.toLowerCase()),
        );

      if (matchSearch) {
        inv.batches
          .filter((b) => b.quantity > 0)
          .forEach((batch) => {
            list.push({
              inventory: inv,
              medicine: inv.medicineId,
              batch: batch,
            });
          });
      }
    });
    return list.sort((a, b) => {
      if (a.batch.quality !== "GOOD" && b.batch.quality === "GOOD") return -1;
      if (a.batch.quality === "GOOD" && b.batch.quality !== "GOOD") return 1;
      return new Date(a.batch.expiryDate) - new Date(b.batch.expiryDate);
    });
  };

  const handleAddToDisposeCart = (med, inv, batch) => {
    const cartItemId = `${med._id}_${batch._id}`;
    const existing = disposeCart.find((item) => item.cartItemId === cartItemId);

    if (existing) {
      alert("Lô này đã có trong danh sách xuất hủy bên phải!");
      return;
    }

    setDisposeCart([
      ...disposeCart,
      {
        cartItemId,
        inventory: inv,
        medicine: med,
        batch: batch,
        variantId: inv.variants?.[0]?._id || "",
        quantity: 1,
        reason: batch.quality !== "GOOD" ? batch.quality : "EXPIRED",
      },
    ]);
  };

  const handleUpdateDisposeCart = (cartItemId, field, value) => {
    setDisposeCart(
      disposeCart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmitDisposal = async () => {
    if (disposeCart.length === 0)
      return alert("Chưa chọn lô thuốc nào để hủy!");

    for (let i = 0; i < disposeCart.length; i++) {
      const item = disposeCart[i];
      if (!item.variantId)
        return alert(`Dòng ${i + 1}: Chưa chọn quy cách (Đơn vị tính)!`);
      if (item.quantity <= 0)
        return alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0!`);

      const variant = item.inventory.variants.find(
        (v) => v._id === item.variantId,
      );
      const baseDeduct = item.quantity * variant.conversionRate;
      if (baseDeduct > item.batch.quantity) {
        return alert(
          `Dòng ${i + 1}: Số lượng hủy (${baseDeduct} ${item.medicine.baseUnit}) vượt quá tồn kho của lô này (${item.batch.quantity})!`,
        );
      }
    }

    setIsSubmittingDispose(true);
    try {
      const payload = {
        items: disposeCart.map((item) => ({
          variantId: item.variantId,
          batchCode: item.batch.batchCode,
          batchId: item.batch._id,
          quantity: Number(item.quantity),
          reason: item.reason,
        })),
      };

      const res = await api.post("/transactions/dispose", payload);
      if (res.data.success) {
        // ĐÃ CẬP NHẬT: Hỏi và In PDF
        const wantToPrint = window.confirm(
          "Chốt phiếu xuất hủy thành công! Chi phí tổn thất đã được ghi nhận. Bạn có muốn in PHIẾU XUẤT HỦY không?",
        );
        if (wantToPrint && res.data.transaction) {
          await generateDisposalPDF(res.data.transaction);
        }

        setIsDisposeModalOpen(false);
        setDisposeCart([]);
        fetchInventory();
      }
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmittingDispose(false);
    }
  };

  const totalDisposalLossValue = disposeCart.reduce((sum, item) => {
    const variant = item.inventory.variants.find(
      (v) => v._id === item.variantId,
    );
    if (!variant) return sum;
    const baseQty = item.quantity * variant.conversionRate;
    return sum + baseQty * item.batch.importPrice;
  }, 0);

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition bg-white text-slate-800 placeholder:text-slate-400";

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { transform: translateY(14px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
            }}>
            <ClipboardList size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Quản lý Tồn Kho
            </h1>
            <p className="text-xs text-slate-500">
              {processedData.length} mặt hàng ·{" "}
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || processedData.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
            {isExportingPDF ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Printer size={18} />
            )}
            Xuất PDF
          </button>

          <button
            onClick={() => {
              setDisposeSearchTerm("");
              setDisposeCart([]);
              setIsDisposeModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white font-bold rounded-2xl shadow-lg hover:bg-red-600 transition-all hover:-translate-y-0.5 shadow-red-500/30">
            <FileWarning size={18} /> Lập Phiếu Xuất Hủy
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-4">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              className={inputCls + " pl-10"}
              placeholder="Tìm mã thuốc, tên thuốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative md:col-span-3">
            <Filter
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              className={inputCls + " pl-9 appearance-none"}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="low_stock">📦 Sắp/Đã hết hàng (&lt; 20)</option>
              <option value="expiring_soon">⚠️ Hạn ngắn (&lt; 3 tháng)</option>
              <option value="expired">🚨 Đã hết hạn</option>
            </select>
          </div>
          <div className="relative md:col-span-2">
            <ArrowUpDown
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              className={inputCls + " pl-9 appearance-none"}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}>
              <option value="qty_desc">Tồn kho giảm dần</option>
              <option value="qty_asc">Tồn kho tăng dần</option>
              <option value="name_asc">Tên thuốc (A-Z)</option>
            </select>
          </div>
          {(user?.role === "admin" || user?.role === "warehouse_manager") && (
            <div className="relative md:col-span-3">
              <Store
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                className={
                  inputCls + " pl-9 appearance-none font-semibold text-sky-700"
                }
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}>
                <option value="">-- Kho của tôi (Mặc định) --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.type === "warehouse" ? "🏢 Kho Tổng: " : "🏪 CN: "}{" "}
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── INVENTORY TABLE ── */}
      <div
        id="inventory-table-print"
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="hidden print:block p-6 border-b border-slate-200 mb-4 text-center">
          <h1 className="text-2xl font-bold uppercase mb-2">
            Báo Cáo Tồn Kho Hiện Tại
          </h1>
          <p>Ngày trích xuất: {new Date().toLocaleDateString("vi-VN")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r border-b border-slate-100">
                <th className="p-4 w-14 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  STT
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mã Thuốc
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Tên Thuốc
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Đơn vị
                </th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Tổng Tồn Kho
                </th>
                <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide no-print">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2
                        size={32}
                        className="animate-spin text-sky-400"
                      />
                      <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Package size={28} className="text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-500">
                        Không có dữ liệu tồn kho
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedData.map((inv, idx) => {
                  const activeBatches = inv.batches.filter(
                    (b) => b.quantity > 0,
                  );
                  const hasWarning = activeBatches.some(
                    (b) =>
                      new Date(b.expiryDate) <=
                      new Date(new Date().setMonth(new Date().getMonth() + 3)),
                  );
                  const isLowStock = inv.totalQuantity < 20;

                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-sky-50/40 transition-colors duration-150">
                      <td className="p-4 text-center text-slate-400 text-sm font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                          {inv.medicineId?.code}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {inv.medicineId?.name}
                          </span>
                          {hasWarning && (
                            <span
                              title="Có lô sắp hết hạn"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-full border border-red-100">
                              <AlertTriangle size={9} /> Hạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {inv.medicineId?.baseUnit}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-lg font-bold ${isLowStock ? "text-orange-500" : "text-sky-600"}`}>
                          {inv.totalQuantity.toLocaleString()}
                        </span>
                        {isLowStock && (
                          <p className="text-[10px] text-orange-400 font-medium mt-0.5 no-print">
                            Sắp hết
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right no-print">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 transition-all hover:scale-105">
                          <Eye size={13} /> Chi tiết (
                          {
                            inv.batches.filter((item, index, self) => {
                              return (
                                self.findIndex(
                                  (x) => x.batchCode === item.batchCode,
                                ) === index
                              );
                            }).length
                          }{" "}
                          lô)
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MODAL: TẠO PHIẾU XUẤT HỦY (DISPOSAL)
      ══════════════════════════════════════════ */}
      {isDisposeModalOpen && (
        <ModalOverlay
          onClose={() => setIsDisposeModalOpen(false)}
          zIndex="z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-w-[95vw] h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 bg-red-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <FileWarning size={24} />
                <div>
                  <h2 className="text-lg font-bold">Lập Phiếu Xuất Hủy</h2>
                  <p className="text-red-200 text-xs mt-0.5">
                    Hàng hóa sẽ bị trừ vĩnh viễn khỏi kho và ghi nhận vào chi
                    phí tổn thất.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDisposeModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden bg-slate-50">
              <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100 shrink-0">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      autoFocus
                      placeholder="Tìm mã thuốc, tên, lô thuốc cần hủy..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-slate-50 text-sm"
                      value={disposeSearchTerm}
                      onChange={(e) => setDisposeSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                  {getFlatBatchesForDisposal().map((item, idx) => {
                    const status = getExpiryStatus(
                      item.batch.quality === "GOOD"
                        ? item.batch.expiryDate
                        : item.batch.quality,
                    );
                    const isErrorBatch = item.batch.quality !== "GOOD";

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${isErrorBatch ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200 hover:border-sky-300"} transition shadow-sm flex flex-col gap-2`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mr-2">
                              {item.medicine.code}
                            </span>
                            <span className="font-bold text-slate-800">
                              {item.medicine.name}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex justify-between items-end mt-1">
                          <div className="text-xs text-slate-500 space-y-1">
                            <p>
                              Mã lô:{" "}
                              <span className="font-mono font-bold text-slate-700">
                                {item.batch.batchCode}
                              </span>
                            </p>
                            <p>
                              HSD:{" "}
                              {new Date(
                                item.batch.expiryDate,
                              ).toLocaleDateString("vi-VN")}
                            </p>
                            <p>
                              Tồn:{" "}
                              <span className="font-bold text-red-500 text-sm">
                                {item.batch.quantity}
                              </span>{" "}
                              {item.medicine.baseUnit}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleAddToDisposeCart(
                                item.medicine,
                                item.inventory,
                                item.batch,
                              )
                            }
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition flex items-center gap-1 shadow-md">
                            <Plus size={14} /> Thêm vào phiếu
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {getFlatBatchesForDisposal().length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm italic">
                      Không tìm thấy lô thuốc nào phù hợp.
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">
                    Danh sách chờ hủy ({disposeCart.length})
                  </h3>
                  <button
                    onClick={() => setDisposeCart([])}
                    className="text-xs text-red-500 font-bold hover:underline">
                    Xóa tất cả
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                  {disposeCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                      <Trash2 size={40} className="opacity-20" />
                      <p className="text-sm font-medium">
                        Chưa có lô thuốc nào được chọn
                      </p>
                    </div>
                  ) : (
                    disposeCart.map((cartItem, idx) => {
                      const variantList = cartItem.inventory.variants || [];
                      const selectedVariant = variantList.find(
                        (v) => v._id === cartItem.variantId,
                      );
                      const baseQtyDeduct = selectedVariant
                        ? cartItem.quantity * selectedVariant.conversionRate
                        : 0;
                      const isOverLimit =
                        baseQtyDeduct > cartItem.batch.quantity;

                      return (
                        <div
                          key={cartItem.cartItemId}
                          className={`p-4 rounded-xl border bg-white shadow-sm relative overflow-hidden ${isOverLimit ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"}`}>
                          {cartItem.batch.quality !== "GOOD" && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                          )}

                          <div className="flex justify-between items-start mb-3">
                            <div className="pr-6">
                              <p className="font-bold text-slate-800 text-sm leading-tight">
                                {cartItem.medicine.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Lô:{" "}
                                <span className="font-mono font-bold text-slate-700">
                                  {cartItem.batch.batchCode}
                                </span>{" "}
                                (Trạng thái: {cartItem.batch.quality})
                              </p>
                              <p className="text-xs text-slate-500">
                                Tồn:{" "}
                                <span className="font-bold text-red-500">
                                  {cartItem.batch.quantity}
                                </span>{" "}
                                {cartItem.medicine.baseUnit}
                                <span className="ml-2 text-slate-400">
                                  Giá vốn:{" "}
                                  {(
                                    cartItem.batch.importPrice || 0
                                  ).toLocaleString()}
                                  đ/đv
                                </span>
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setDisposeCart(
                                  disposeCart.filter(
                                    (i) => i.cartItemId !== cartItem.cartItemId,
                                  ),
                                )
                              }
                              className="text-slate-300 hover:text-red-500 transition absolute top-3 right-3">
                              <X size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="col-span-5">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Đơn vị
                              </label>
                              <select
                                value={cartItem.variantId}
                                onChange={(e) =>
                                  handleUpdateDisposeCart(
                                    cartItem.cartItemId,
                                    "variantId",
                                    e.target.value,
                                  )
                                }
                                className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none bg-white">
                                <option value="">- Chọn -</option>
                                {variantList.map((v) => (
                                  <option key={v._id} value={v._id}>
                                    {v.unit} (x{v.conversionRate})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Số lượng
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={cartItem.quantity}
                                onChange={(e) =>
                                  handleUpdateDisposeCart(
                                    cartItem.cartItemId,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className={`w-full text-xs p-1.5 border rounded outline-none text-center font-bold ${isOverLimit ? "border-red-500 text-red-600 bg-red-50" : "border-slate-200 text-slate-800 bg-white"}`}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Lý do hủy
                              </label>
                              <select
                                value={cartItem.reason}
                                onChange={(e) =>
                                  handleUpdateDisposeCart(
                                    cartItem.cartItemId,
                                    "reason",
                                    e.target.value,
                                  )
                                }
                                className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none bg-white text-red-600 font-semibold">
                                <option value="EXPIRED">
                                  Cận Date/Hết hạn
                                </option>
                                <option value="DAMAGED">Hư hỏng/Lỗi</option>
                              </select>
                            </div>
                          </div>
                          {isOverLimit && (
                            <p className="text-[10px] text-red-500 mt-2 italic">
                              * Số lượng quy đổi ({baseQtyDeduct}) vượt quá tồn
                              kho hiện tại!
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex flex-col gap-3">
                  <div className="flex justify-between items-center bg-red-50 border border-red-100 p-3 rounded-xl">
                    <span className="text-sm font-bold text-red-800">
                      Tổng giá trị tổn thất ước tính:
                    </span>
                    <span className="text-xl font-black text-red-600">
                      {totalDisposalLossValue.toLocaleString()} đ
                    </span>
                  </div>
                  <button
                    onClick={handleSubmitDisposal}
                    disabled={isSubmittingDispose || disposeCart.length === 0}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 transition-all active:scale-95">
                    {isSubmittingDispose ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    Chốt Xuất Hủy & Ghi Nhận Chi Phí
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════
          MODAL 1: CHI TIẾT LÔ HÀNG
      ══════════════════════════════════════════ */}
      {isModalOpen && selectedInventory && (
        <ModalOverlay onClose={() => setIsModalOpen(false)} zIndex="z-30">
          <div className="bg-white rounded-2xl shadow-2xl w-[920px] max-h-[85vh] flex flex-col overflow-hidden">
            <div
              className="flex justify-between items-center px-6 py-4 text-white"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              }}>
              <div>
                <h2 className="text-lg font-bold">Danh sách Lô hàng tồn kho</h2>
                <p className="text-sky-100 text-xs mt-0.5">
                  Thuốc:{" "}
                  <span className="font-bold text-white">
                    {selectedInventory.medicineId?.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} color="white" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto scrollbar-thin flex-1 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gradient-to-r border-b border-slate-100">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Mã Lô
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Ngày SX
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Hạn SD
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Tồn / Gốc
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Giá vốn (1 {selectedInventory.medicineId?.baseUnit})
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Tình trạng
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedInventory.batches
                      .sort(
                        (a, b) =>
                          new Date(a.expiryDate) - new Date(b.expiryDate),
                      )
                      .map((batch, index) => {
                        const isOutOfStock = batch.quantity === 0;
                        const status = isOutOfStock
                          ? {
                              label: "Đã bán/xuất hết",
                              color:
                                "bg-slate-100 text-slate-400 border-slate-200",
                              icon: null,
                            }
                          : batch.quality === "OVERSTOCK" ||
                              batch.quality === "EXPIRED" ||
                              batch.quality === "DAMAGED"
                            ? getExpiryStatus(batch.quality)
                            : getExpiryStatus(batch.expiryDate);

                        return (
                          <tr
                            key={index}
                            className={`transition-colors ${isOutOfStock ? "opacity-60 bg-slate-50/50" : "hover:bg-sky-50/30"}`}>
                            <td className="py-3 px-4">
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg ${isOutOfStock ? "text-slate-400 bg-slate-100" : "text-sky-600 bg-sky-50"}`}>
                                {batch.batchCode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500 text-xs">
                              {batch.manufacturingDate
                                ? new Date(
                                    batch.manufacturingDate,
                                  ).toLocaleDateString("vi-VN")
                                : "---"}
                            </td>
                            <td
                              className={`py-3 px-4 text-center text-sm font-medium ${isOutOfStock ? "text-slate-400" : "text-slate-700"}`}>
                              {new Date(batch.expiryDate).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-bold text-base ${isOutOfStock ? "text-slate-400" : "text-sky-600"}`}>
                                {batch.quantity}
                              </span>
                              <span className="text-slate-400 text-xs ml-1">
                                / {batch.initialQuantity}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-semibold ${isOutOfStock ? "text-slate-400" : "text-red-500"}`}>
                              {batch.importPrice?.toLocaleString()}đ
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${status.color}`}>
                                {status.icon === "ok" && (
                                  <CheckCircle2 size={10} />
                                )}
                                {status.icon === "warning" && (
                                  <Clock size={10} />
                                )}
                                {status.icon === "expired" && (
                                  <AlertTriangle size={10} />
                                )}
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() =>
                                  handleOpenBatchHistory(
                                    batch.batchCode,
                                    batch.importPrice,
                                    batch.quality,
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 ${isOutOfStock ? "text-slate-400 border-slate-200 bg-slate-50 hover:bg-slate-100" : "text-sky-600 border-sky-100 bg-white hover:bg-sky-50"}`}>
                                <History size={12} /> Lịch sử
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════
          MODAL 2: LỊCH SỬ NHẬP LÔ
      ══════════════════════════════════════════ */}
      {isHistoryModalOpen && (
        <ModalOverlay
          onClose={() => setIsHistoryModalOpen(false)}
          zIndex="z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[820px] max-h-[88vh] flex flex-col overflow-hidden">
            <div
              className="flex justify-between items-center px-6 py-4 text-white"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              }}>
              <div className="flex items-center gap-3">
                <History size={20} color="white" />
                <div>
                  <p className="font-bold text-sm">Lịch sử nhập lô hàng</p>
                  <p className="text-sky-100 text-xs mt-0.5">
                    Mã lô:{" "}
                    <span className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">
                      {selectedBatchCode}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} color="white" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto scrollbar-thin flex-1 bg-slate-50/50">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-sky-400" />
                  <p className="text-sm font-medium">Đang tra cứu dữ liệu...</p>
                </div>
              ) : batchHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <History size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    Không tìm thấy lịch sử nhập của lô này
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {batchHistory.map((hist, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:border-sky-200 transition-colors">
                      <div className="flex justify-between items-center px-5 py-3 border-b border-slate-50 bg-slate-50/70">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-sky-400 to-cyan-400 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                              Thời gian ghi nhận
                            </p>
                            <p className="text-sm font-semibold text-slate-700">
                              {new Date(hist.date).toLocaleString("vi-VN", {
                                timeStyle: "medium",
                                dateStyle: "short",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                            Mã phiếu
                          </p>
                          <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                            {hist.transactionCode}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Nguồn cung cấp
                          </p>
                          <p className="font-semibold text-slate-800 text-sm">
                            {hist.source || "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Người thực hiện
                          </p>
                          <p className="font-medium text-slate-700 text-sm">
                            {hist.createdBy}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            SL x Đơn vị nhập
                          </p>
                          <p className="font-bold text-lg text-sky-600 leading-tight">
                            {hist.quantity}{" "}
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                              {hist.unit}
                            </span>
                          </p>
                          <p
                            className="text-xs text-slate-400 truncate mt-0.5"
                            title={hist.variantName}>
                            ({hist.variantName})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Đơn giá / Tổng tiền
                          </p>
                          <p className="text-xs text-slate-500">
                            {hist.unitPrice.toLocaleString()}đ / {hist.unit}
                          </p>
                          <p className="font-bold text-red-500 text-lg leading-tight">
                            {hist.totalValue.toLocaleString()}đ
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

export default InventoryPage;
