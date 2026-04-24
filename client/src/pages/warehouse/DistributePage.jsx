import {
  AlertCircle,
  ArrowRightLeft,
  PackageX,
  Plus,
  Save,
  Search,
  Store,
  Trash,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import html2pdf from "html2pdf.js";

const DistributePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("DISTRIBUTE");
  const [allBranches, setAllBranches] = useState([]); // Chứa TẤT CẢ kho/nhánh để lấy tên khi in phiếu
  const [branches, setBranches] = useState([]); // Chỉ chứa chi nhánh để chọn
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
      batchId: "",
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
      const fetchedBranches = branchRes.data.data || [];
      setAllBranches(fetchedBranches);
      setBranches(fetchedBranches.filter((b) => b.type !== "warehouse"));
      setMedicines(medRes.data.data || []);
      setAllVariants(varRes.data.data || []);
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
      setItems([
        {
          medicineId: "",
          medicineSearchTerm: "",
          isMedicineDropdownOpen: false,
          variantId: "",
          batchCode: "",
          batchId: "",
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
      newItems[index].batchId = "";
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
    newItems[index].batchId = "";
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
        batchId: "",
        reason: "OVERSTOCK",
        quantity: 1,
      },
    ]);

  /* ─── LOGIC IN PHIẾU PDF ─── */
  const generatePDF = async (transaction, currentMode, targetBranchId) => {
    // 1. Xác định tên người Gửi / Nhận
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

    // 2. Tạo HTML cho các dòng hàng hóa
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

    // 3. Lắp ráp HTML Khung Phiếu
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
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }, // In ngang để bảng rộng rãi
    };

    await html2pdf().set(opt).from(printDiv).save();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Ràng buộc: Kho tổng KHÔNG thể tự trả hàng
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

      for (let i = 0; i < items.length; i++) {
        if (!items[i].medicineId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn thuốc!`);
        if (!items[i].variantId)
          return alert(`Dòng thứ ${i + 1}: Chưa chọn quy cách!`);
        if ((mode === "RETURN" || mode === "DISPOSE") && !items[i].batchId)
          return alert(`Dòng thứ ${i + 1}: Vui lòng chọn Mã lô cần thao tác!`);
        if (items[i].quantity <= 0)
          return alert(`Dòng thứ ${i + 1}: Số lượng phải lớn hơn 0!`);
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
        // Hỏi in phiếu sau khi thành công (Áp dụng cho Xuất đi và Trả về)
        if (mode === "DISTRIBUTE" || mode === "RETURN") {
          const wantToPrint = window.confirm(
            `Giao dịch thành công! Bạn có muốn in ${mode === "RETURN" ? "PHIẾU TRẢ HÀNG" : "PHIẾU XUẤT KHO"} không?`,
          );
          if (wantToPrint && response.data.transaction) {
            await generatePDF(response.data.transaction, mode, toBranchId);
          }
        } else {
          alert("Giao dịch xuất hủy thành công!");
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
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
      shadow: "0 6px 16px rgba(14,165,233,.35)",
      tabActive: { color: "#0284c7", background: "white" },
      bannerBg: "#f0f9ff",
      bannerBorder: "#bae6fd",
      bannerIcon: <Store size={18} color="#0284c7" />,
      rowBg: "#f8fafc",
      rowBorder: "#e2e8f0",
      submitGradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
      submitShadow: "0 6px 20px rgba(14,165,233,.4)",
      addBtnColor: "#0284c7",
      addBtnBorder: "#bae6fd",
      addBtnHoverBg: "#f0f9ff",
      title: "Luân Chuyển Xuất Kho",
      subtitle: "Phân phối hàng hóa từ Kho tổng đến các Chi nhánh",
      submitLabel: "Tạo Phiếu Xuất",
      addLabel: "Thêm thuốc luân chuyển",
    },
    RETURN: {
      icon: <Undo2 size={22} color="white" />,
      gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      shadow: "0 6px 16px rgba(249,115,22,.35)",
      tabActive: { color: "#c2410c", background: "white" },
      bannerBg: "#fff7ed",
      bannerBorder: "#fed7aa",
      bannerIcon: <AlertCircle size={18} color="#ea580c" />,
      rowBg: "#fff7ed",
      rowBorder: "#fed7aa",
      submitGradient: "linear-gradient(135deg, #f97316, #ea580c)",
      submitShadow: "0 6px 20px rgba(249,115,22,.4)",
      addBtnColor: "#c2410c",
      addBtnBorder: "#fed7aa",
      addBtnHoverBg: "#fff7ed",
      title: "Trả Hàng Về Kho Tổng",
      subtitle: "Gửi trả hàng cận date, bán chậm về lại Kho tổng",
      submitLabel: "Xác Nhận Trả Hàng",
      addLabel: "Thêm thuốc trả về",
    },
    DISPOSE: {
      icon: <Trash size={22} color="white" />,
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      shadow: "0 6px 16px rgba(239,68,68,.35)",
      tabActive: { color: "#b91c1c", background: "white" },
      bannerBg: "#fef2f2",
      bannerBorder: "#fecaca",
      bannerIcon: <Trash2 size={18} color="#ef4444" />,
      rowBg: "#fef2f2",
      rowBorder: "#fecaca",
      submitGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
      submitShadow: "0 6px 20px rgba(239,68,68,.4)",
      addBtnColor: "#b91c1c",
      addBtnBorder: "#fecaca",
      addBtnHoverBg: "#fef2f2",
      title: "Lập Phiếu Xuất Hủy",
      subtitle:
        "Hủy bỏ hàng hóa hết hạn, hư hỏng (Ghi nhận vào Chi phí tổn thất)",
      submitLabel: "Chốt Phiếu Xuất Hủy",
      addLabel: "Thêm thuốc xuất hủy",
    },
  };
  const t = themes[mode];

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .dist-input { width: 100%; border: 1.5px solid #e2e8f0; padding: 10px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-radius: 10px; outline: none; background: white; transition: border-color .2s; }
        .dist-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.08); }
        .dist-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
        .dist-select { width: 100%; border: 1.5px solid #e2e8f0; padding: 10px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-radius: 10px; outline: none; background: white; transition: border-color .2s; cursor: pointer; }
        .dist-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.08); }
        .dist-select:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
        .submit-btn { display: flex; align-items: center; gap: 8px; padding: 13px 28px; border: none; border-radius: 14px; font-size: 14px; font-weight: 800; color: white; cursor: pointer; transition: all .2s ease; letter-spacing: .2px; }
        .submit-btn:hover { transform: translateY(-1px); }
        .submit-btn:active { transform: scale(.97); }
        .item-row { border-radius: 14px; border: 1.5px solid; padding: 18px; display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; box-shadow: 0 1px 4px rgba(0,0,0,.04); transition: box-shadow .2s; }
        .item-row:hover { box-shadow: 0 3px 12px rgba(0,0,0,.07); }
        .field-label { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 7px; }
        .mode-tab { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all .2s; color: #94a3b8; background: transparent; }
        .mode-tab.active { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .mode-tab:not(.active):hover { color: #64748b; background: rgba(255,255,255,.5); }
      `}</style>

      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 gap-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: t.gradient,
                borderRadius: 14,
                width: 46,
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: t.shadow,
                flexShrink: 0,
              }}>
              {t.icon}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}>
                {t.title}
              </h1>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              background: "#e2e8f0",
              borderRadius: 13,
              padding: 4,
              gap: 2,
            }}>
            {[
              {
                key: "DISTRIBUTE",
                icon: <ArrowRightLeft size={14} />,
                label: "Xuất đi",
              },
              { key: "RETURN", icon: <Undo2 size={14} />, label: "Trả về" },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`mode-tab ${mode === key ? "active" : ""}`}
                style={mode === key ? { ...themes[key].tabActive } : {}}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 20,
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 2px 12px rgba(0,0,0,.06)",
            overflow: "hidden",
          }}>
          <div
            style={{
              background: t.bannerBg,
              borderBottom: `1.5px solid ${t.bannerBorder}`,
              padding: "14px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "white",
                border: `1.5px solid ${t.bannerBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              }}>
              {t.bannerIcon}
            </div>
            <div>
              {mode === "DISTRIBUTE" ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0284c7",
                      marginBottom: 4,
                    }}>
                    Chọn chi nhánh nhận hàng
                  </p>
                  <select
                    required
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="dist-select"
                    style={{
                      width: 320,
                      marginTop: 2,
                      borderColor: "#bae6fd",
                    }}>
                    <option value="">-- Chọn chi nhánh đích đến --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        Chi nhánh: {b.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : mode === "RETURN" ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#c2410c",
                      marginBottom: 2,
                    }}>
                    Nơi nhận: Kho Tổng
                  </p>
                  <p
                    style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.6 }}>
                    Hàng hóa trả về sẽ được chuyển vào khu vực chờ kiểm duyệt.
                    Hàng lỗi/cận date sẽ không được phân phối lại.
                  </p>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#b91c1c",
                      marginBottom: 2,
                    }}>
                    Lưu ý nghiệp vụ Hủy hàng
                  </p>
                  <p
                    style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                    Phiếu xuất hủy sẽ trừ vĩnh viễn số lượng tồn kho và hạch
                    toán vào <strong>Chi phí tổn thất</strong>.
                  </p>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <PackageX size={15} color="#64748b" />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                  Danh sách mặt hàng
                </span>
                <span
                  style={{
                    marginLeft: 4,
                    background: "#f1f5f9",
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}>
                  {items.length} dòng
                </span>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  const baseUnit = medInventory
                    ? medInventory.medicineId.baseUnit
                    : "đ.vị";

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

                  return (
                    <div
                      key={index}
                      className="item-row"
                      style={{ background: t.rowBg, borderColor: t.rowBorder }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          paddingTop: 30,
                        }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            background: "white",
                            border: `1.5px solid ${t.rowBorder}`,
                            borderRadius: 7,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#94a3b8",
                          }}>
                          {index + 1}
                        </span>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 220,
                          position: "relative",
                        }}>
                        <label className="field-label">Thuốc / Sản phẩm</label>
                        <div style={{ position: "relative" }}>
                          <Search
                            size={15}
                            style={{
                              position: "absolute",
                              left: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#94a3b8",
                              pointerEvents: "none",
                            }}
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
                            className="dist-input"
                            style={{ paddingLeft: 36 }}
                          />
                        </div>
                        {item.isMedicineDropdownOpen && (
                          <ul
                            style={{
                              position: "absolute",
                              zIndex: 50,
                              width: "100%",
                              background: "white",
                              border: "1.5px solid #e2e8f0",
                              borderRadius: 12,
                              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                              maxHeight: 220,
                              overflowY: "auto",
                              marginTop: 4,
                            }}>
                            {searchedMedicines.length > 0 ? (
                              searchedMedicines.map((m) => (
                                <li
                                  key={m._id}
                                  onMouseDown={() =>
                                    handleSelectMedicine(index, m)
                                  }
                                  style={{
                                    padding: "10px 14px",
                                    fontSize: 13,
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderBottom: "1px solid #f8fafc",
                                    transition: "background .15s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#f0f9ff")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "white")
                                  }>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "#0f172a",
                                    }}>
                                    {m.name}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 11,
                                      color: "#64748b",
                                      background: "#f1f5f9",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: 6,
                                      padding: "1px 7px",
                                    }}>
                                    {m.code}
                                  </span>
                                </li>
                              ))
                            ) : (
                              <li
                                style={{
                                  padding: "14px",
                                  fontSize: 13,
                                  color: "#94a3b8",
                                  textAlign: "center",
                                  fontStyle: "italic",
                                }}>
                                Không tìm thấy thuốc này
                              </li>
                            )}
                          </ul>
                        )}
                        {item.medicineId && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              marginTop: 6,
                            }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                {mode === "DISTRIBUTE"
                                  ? "Tồn kho hợp lệ:"
                                  : "Tổng tồn kho:"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color:
                                    totalValidBaseQty > 0
                                      ? "#059669"
                                      : "#dc2626",
                                  background:
                                    totalValidBaseQty > 0
                                      ? "#dcfce7"
                                      : "#fee2e2",
                                  border: `1px solid ${totalValidBaseQty > 0 ? "#bbf7d0" : "#fecaca"}`,
                                  borderRadius: 6,
                                  padding: "1px 8px",
                                }}>
                                {totalValidBaseQty} {baseUnit}
                              </span>
                            </div>

                            {filteredVariants.length > 0 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontStyle: "italic",
                                  marginLeft: 2,
                                }}>
                                <span>Quy cách: </span>
                                <span style={{ fontWeight: 600 }}>
                                  {(item.variantId
                                    ? filteredVariants.find(
                                        (v) => v._id === item.variantId,
                                      )?.packagingSpecification
                                    : filteredVariants[0]
                                        ?.packagingSpecification) ||
                                    "Đang cập nhật..."}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ width: 120 }}>
                        <label className="field-label">Quy cách</label>
                        <select
                          required
                          disabled={!item.medicineId}
                          value={item.variantId}
                          onChange={(e) =>
                            handleItemChange(index, "variantId", e.target.value)
                          }
                          className="dist-select">
                          <option value="">-- Chọn --</option>
                          {filteredVariants.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(mode === "RETURN" || mode === "DISPOSE") && (
                        <>
                          <div style={{ width: 160 }}>
                            <label
                              className="field-label"
                              style={{
                                color:
                                  mode === "DISPOSE" ? "#b91c1c" : "#c2410c",
                              }}>
                              Mã Lô
                            </label>
                            <select
                              required
                              disabled={
                                !item.medicineId || activeBatches.length === 0
                              }
                              value={item.batchId || ""}
                              onChange={(e) => {
                                const bId = e.target.value;
                                const selectedBatch = activeBatches.find(
                                  (b) => b._id === bId,
                                );
                                const newItems = [...items];
                                newItems[index].batchId = bId;
                                newItems[index].batchCode = selectedBatch
                                  ? selectedBatch.batchCode
                                  : "";
                                setItems(newItems);
                              }}
                              className="dist-select"
                              style={{
                                borderColor:
                                  mode === "DISPOSE" ? "#fecaca" : "#fed7aa",
                              }}>
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
                                    {b.batchCode} (Còn {b.quantity}) —{" "}
                                    {qualityLabel}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div style={{ width: 160 }}>
                            <label
                              className="field-label"
                              style={{
                                color:
                                  mode === "DISPOSE" ? "#b91c1c" : "#c2410c",
                              }}>
                              Lý do
                            </label>
                            <select
                              value={item.reason}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "reason",
                                  e.target.value,
                                )
                              }
                              className="dist-select"
                              style={{
                                borderColor:
                                  mode === "DISPOSE" ? "#fecaca" : "#fed7aa",
                              }}>
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
                        </>
                      )}

                      <div style={{ width: 96 }}>
                        <label className="field-label">Số lượng</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          className="dist-input"
                          style={{
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: 15,
                            color: "#0284c7",
                          }}
                        />
                      </div>

                      <div style={{ paddingTop: 28 }}>
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          style={{
                            background: "white",
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 10,
                            width: 38,
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#94a3b8",
                            transition: "all .2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#fee2e2";
                            e.currentTarget.style.borderColor = "#fecaca";
                            e.currentTarget.style.color = "#ef4444";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.color = "#94a3b8";
                          }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addItemRow}
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 16px",
                  background: "transparent",
                  border: `1.5px dashed ${t.addBtnBorder}`,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: t.addBtnColor,
                  cursor: "pointer",
                  transition: "background .2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = t.addBtnHoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }>
                <Plus size={16} strokeWidth={2.5} /> {t.addLabel}
              </button>
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1.5px solid #f1f5f9",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: "12px 20px",
                  background: "white",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#64748b",
                  cursor: "pointer",
                  transition: "background .2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }>
                ← Quay lại
              </button>
              <button
                type="submit"
                className="submit-btn"
                style={{
                  background: t.submitGradient,
                  boxShadow: t.submitShadow,
                }}>
                <Save size={18} /> {t.submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DistributePage;
