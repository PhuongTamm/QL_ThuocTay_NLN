import html2pdf from "html2pdf.js";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Info,
  Minus,
  Package,
  Phone,
  Pill,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
  Store, // Thêm icon Store
} from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/* ─────────────────────────────────────────
   TOAST ALERT SYSTEM
───────────────────────────────────────── */
const ToastContext = React.createContext(null);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-md pointer-events-auto
              animate-[slideUp_0.3s_ease-out]
              ${t.type === "error" ? "bg-red-500/90 text-white" : ""}
              ${t.type === "success" ? "bg-emerald-500/90 text-white" : ""}
              ${t.type === "warning" ? "bg-amber-400/90 text-gray-900" : ""}
              ${t.type === "info" ? "bg-white/90 text-gray-800 border border-gray-100" : ""}
            `}>
            {t.type === "error" && <AlertTriangle size={16} />}
            {t.type === "success" && <CheckCircle2 size={16} />}
            {t.type === "warning" && <AlertTriangle size={16} />}
            {t.type === "info" && <Info size={16} />}
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

const useToast = () => React.useContext(ToastContext);

/* ─────────────────────────────────────────
   CONFIRM DIALOG
───────────────────────────────────────── */
const ConfirmDialog = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150]">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <p className="text-gray-800 font-semibold text-sm leading-snug">
            {message}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN POS PAGE
───────────────────────────────────────── */
const POSPageInner = () => {
  const toast = useToast();
  const { user } = useAuth(); // Lấy thông tin user đăng nhập

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [inventories, setInventories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariants, setSelectedVariants] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    _id: null,
    name: "",
    phone: "",
  });

  const [medicineDetailModal, setMedicineDetailModal] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerGivenMoney, setCustomerGivenMoney] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    message: "",
    onConfirm: null,
  });

  const ROLE_LABELS = {
    admin: "Quản trị viên",
    warehouse_manager: "Quản lý kho",
    branch_manager: "Quản lý chi nhánh",
    pharmacist: "Dược sĩ",
  };

  // 1. Tải danh sách khách hàng và chi nhánh lúc đầu
  useEffect(() => {
    fetchCustomers();
    fetchBranches();
  }, []);

  // 2. Fetch tồn kho mỗi khi selectedBranchId thay đổi
  useEffect(() => {
    if (selectedBranchId) {
      fetchInventory(selectedBranchId);
      // Làm sạch giỏ hàng khi đổi chi nhánh để tránh lỗi hàng
      setCart([]);
    }
  }, [selectedBranchId]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      const storeBranches = (res.data.data || []).filter(
        (b) => b.type !== "warehouse",
      );
      setBranches(storeBranches);

      // Mặc định chọn chi nhánh của user nếu có, không thì chọn cái đầu tiên
      if (user?.branchId) {
        setSelectedBranchId(user.branchId);
      } else if (storeBranches.length > 0) {
        setSelectedBranchId(storeBranches[0]._id);
      }
    } catch (e) {
      console.error("Lỗi lấy chi nhánh", e);
    }
  };

  const fetchInventory = async (branchId) => {
    try {
      const res = await api.get(`/inventories?branchId=${branchId}`);
      const data = res.data.data || [];
      setInventories(data);
      const initialSelected = {};
      data.forEach((inv) => {
        if (inv.variants && inv.variants.length > 0) {
          initialSelected[inv.medicineId._id] = inv.variants[0]._id;
        }
      });
      setSelectedVariants(initialSelected);
    } catch (err) {
      console.error("Lỗi lấy tồn kho", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data.data || []);
    } catch (err) {
      console.log("Chưa có API lấy khách hàng:", err.message);
    }
  };

  const handleSelectVariant = (medicineId, variantId) => {
    setSelectedVariants({ ...selectedVariants, [medicineId]: variantId });
  };

  const handlePhoneChange = (e) => {
    // 1. Chỉ giữ lại số, loại bỏ chữ và ký tự đặc biệt
    const val = e.target.value.replace(/\D/g, "");

    // 2. Chặn không cho nhập quá 10 số
    if (val.length > 10) return;

    setCustomerInfo({ ...customerInfo, phone: val, _id: null });

    if (val.trim()) {
      const filtered = customers.filter((c) => c.phone.includes(val));
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
      const exactMatch = customers.find((c) => c.phone === val);
      if (exactMatch) {
        setCustomerInfo({
          _id: exactMatch._id,
          phone: exactMatch.phone,
          name: exactMatch.name,
        });
        setShowCustomerDropdown(false);
      }
    } else {
      setShowCustomerDropdown(false);
      setCustomerInfo({ _id: null, name: "", phone: "" });
    }
  };

  const handleSelectCustomer = (c) => {
    setCustomerInfo({ _id: c._id, phone: c.phone, name: c.name });
    setShowCustomerDropdown(false);
  };

  // const handleUpdateQuantity = (inv, activeVariant, newQuantity) => {
  //   if (newQuantity < 1) return false;
  //   const medId = inv.medicineId._id;
  //   const existingBaseQtyInCart = cart
  //     .filter(
  //       (item) =>
  //         item.medicineId === medId && item.variantId !== activeVariant._id,
  //     )
  //     .reduce((sum, item) => sum + item.quantity * item.conversionRate, 0);
  //   const neededBaseQty =
  //     existingBaseQtyInCart + newQuantity * activeVariant.conversionRate;
  //   if (neededBaseQty > inv.totalQuantity) {
  //     toast(
  //       `Không đủ tồn kho! Còn ${inv.totalQuantity} ${inv.medicineId.baseUnit}.`,
  //       "warning",
  //     );
  //     return false;
  //   }
  //   const existingItemIndex = cart.findIndex(
  //     (item) => item.variantId === activeVariant._id,
  //   );
  //   if (existingItemIndex > -1) {
  //     const newCart = [...cart];
  //     newCart[existingItemIndex].quantity = newQuantity;
  //     setCart(newCart);
  //   } else {
  //     setCart([
  //       ...cart,
  //       {
  //         medicineId: medId,
  //         variantId: activeVariant._id,
  //         name: activeVariant.name,
  //         unit: activeVariant.unit,
  //         price: activeVariant.currentPrice,
  //         conversionRate: activeVariant.conversionRate,
  //         quantity: newQuantity,
  //       },
  //     ]);
  //   }
  //   return true;
  // };

  // BƯỚC 2: THAY THẾ HÀM handleUpdateQuantity CŨ
  const handleUpdateQuantity = (inv, activeVariant, newQuantity) => {
    if (newQuantity < 1) return false;
    const medId = inv.medicineId._id;

    // Tính tổng số lượng (theo đơn vị cơ sở) của các quy cách KHÁC của cùng thuốc này đang có trong giỏ
    const existingBaseQtyInCart = cart
      .filter(
        (item) =>
          item.medicineId === medId && item.variantId !== activeVariant._id,
      )
      .reduce((sum, item) => sum + item.quantity * item.conversionRate, 0);

    const neededBaseQty =
      existingBaseQtyInCart + newQuantity * activeVariant.conversionRate;

    // Tính số lượng tồn kho THỰC TẾ HỢP LỆ
    const validQty = getValidBaseQuantity(inv);

    // Ràng buộc: Chặn nếu vượt quá Tồn kho hợp lệ
    if (neededBaseQty > validQty) {
      toast(
        `Không đủ hàng hợp lệ! Chỉ còn ${validQty} ${inv.medicineId.baseUnit} (Đã loại trừ hàng cận/lỗi).`,
        "warning",
      );
      return false;
    }

    const existingItemIndex = cart.findIndex(
      (item) => item.variantId === activeVariant._id,
    );

    if (existingItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity = newQuantity;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          medicineId: medId,
          variantId: activeVariant._id,
          name: activeVariant.name,
          unit: activeVariant.unit,
          price: activeVariant.currentPrice,
          conversionRate: activeVariant.conversionRate,
          quantity: newQuantity,
        },
      ]);
    }
    return true;
  };

  const addToCart = (inv) => {
    const medId = inv.medicineId._id;
    const activeVariantId = selectedVariants[medId];
    const activeVariant = inv.variants.find((v) => v._id === activeVariantId);
    if (!activeVariant) return;
    const existingCartItem = cart.find(
      (item) => item.variantId === activeVariant._id,
    );
    const currentQty = existingCartItem ? existingCartItem.quantity : 0;
    const success = handleUpdateQuantity(inv, activeVariant, currentQty + 1);
  };

  const clearCart = () => {
    setConfirmDialog({
      open: true,
      message: "Bạn có chắc muốn xóa toàn bộ giỏ hàng?",
      onConfirm: () => {
        setCart([]);
        setConfirmDialog({ open: false });
        toast("Đã xóa giỏ hàng", "info");
      },
    });
  };

  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // BƯỚC 1: THÊM HÀM NÀY VÀO TRONG POSPageInner
  const getValidBaseQuantity = (inv) => {
    if (!inv || !inv.batches) return 0;
    const today = new Date();
    return inv.batches.reduce((sum, b) => {
      // Chỉ cộng dồn những lô CÒN HÀNG, CHẤT LƯỢNG TỐT và CHƯA HẾT HẠN
      if (
        b.quantity > 0 &&
        b.quality === "GOOD" &&
        new Date(b.expiryDate) > today
      ) {
        return sum + b.quantity;
      }
      return sum;
    }, 0);
  };

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return;

    if (customerInfo.phone) {
      if (customerInfo.phone.length !== 10) {
        return toast(
          "Số điện thoại khách hàng phải bao gồm đúng 10 số!",
          "warning",
        );
      }
      if (!customerInfo.name) {
        return toast("Vui lòng nhập tên cho khách hàng mới!", "warning");
      }
    }

    setCustomerGivenMoney("");

    // TÌM VÀ CẬP NHẬT ĐOẠN NÀY: Tìm chi nhánh đang chọn để gán Tên & SĐT vào hóa đơn
    const currentBranch = branches.find((b) => b._id === selectedBranchId);
    const branchName = currentBranch?.name || "Chi nhánh hiện tại";
    const branchPhone = currentBranch?.phone || "Đang cập nhật...";

    setReceiptData({
      code: "HD" + Date.now(),
      date: new Date().toLocaleString("vi-VN"),
      branchName: branchName,
      branchPhone: branchPhone, // Bổ sung SĐT chi nhánh
      items: [...cart],
      total: total,
      customer: customerInfo,
      paymentMethod: paymentMethod,
      // Bổ sung thông tin người lập phiếu
      staffName: user?.fullName || user?.username || "Nhân viên",
      staffRole: ROLE_LABELS[user?.role] || "Nhân viên",
    });
    setShowCheckoutModal(true);
  };

  const confirmPayment = async () => {
    if (paymentMethod === "CASH") {
      const given = Number(customerGivenMoney.replace(/[^0-9]/g, "")) || 0;
      if (given < total)
        return toast("Khách đưa chưa đủ tiền thanh toán!", "error");
    }
    try {
      const payload = {
        branchId: selectedBranchId, // Bổ sung branchId động
        customerId: customerInfo._id,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        paymentMethod: paymentMethod,
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      const res = await api.post("/transactions/sell", payload);
      setReceiptData((prev) => ({
        ...prev,
        code: res.data.data?.code || prev.code,
      }));
      setCart([]);
      setCustomerInfo({ _id: null, name: "", phone: "" });
      fetchInventory(selectedBranchId); // Tải lại tồn kho nhánh hiện tại
      fetchCustomers();
      setShowCheckoutModal(false);
      setShowReceipt(true);
      toast("Thanh toán thành công!", "success");
    } catch (err) {
      toast("Lỗi: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const filteredInventory = inventories.filter((inv) => {
    if (!inv.medicineId) return false;
    const term = searchTerm.toLowerCase();
    return (
      inv.medicineId.name.toLowerCase().includes(term) ||
      inv.medicineId.code.toLowerCase().includes(term)
    );
  });

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    const element = document.getElementById("print-receipt");
    const elementHeight = element.offsetHeight;
    const heightInMm = elementHeight * 0.264583 + 10;
    const opt = {
      margin: 2,
      filename: `HoaDon_${receiptData.code}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: [80, heightInMm], orientation: "portrait" },
    };
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => setIsGeneratingPDF(false));
  };

  const handleMoneyInputChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setCustomerGivenMoney(
      rawValue ? Number(rawValue).toLocaleString("vi-VN") : "",
    );
  };

  const calculateChange = () => {
    const given = Number(customerGivenMoney.replace(/[^0-9]/g, "")) || 0;
    return given - total;
  };

  return (
    <div
      className="flex h-screen font-sans overflow-hidden"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        * { box-sizing: border-box; }

        :root {
          --primary: #0ea5e9;
          --primary-dark: #0284c7;
          --primary-light: #e0f2fe;
          --accent: #06b6d4;
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --border: #e2e8f0;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --text-light: #94a3b8;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
          --shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
          --shadow-lg: 0 10px 30px rgba(0,0,0,.12), 0 4px 10px rgba(0,0,0,.05);
        }

        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .card-medicine {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
        }
        .card-medicine:hover {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(14,165,233,.08), var(--shadow-md);
          transform: translateY(-1px);
        }

        .variant-btn {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          border: 1.5px solid var(--border);
          color: var(--text-muted);
          background: var(--surface-2);
          cursor: pointer;
          transition: all 0.15s ease;
          line-height: 1.5;
        }
        .variant-btn.active {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary-dark);
        }
        .variant-btn:hover:not(.active) { background: #f1f5f9; border-color: #94a3b8; }

        .btn-add {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          border: none;
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s ease;
          box-shadow: 0 3px 8px rgba(14,165,233,.35);
        }
        .btn-add:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(14,165,233,.45); }
        .btn-add:active { transform: scale(0.97); }
        .btn-add:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed; transform: none; }

        .qty-control {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border-radius: 10px;
          overflow: hidden;
          border: 1.5px solid var(--border);
        }
        .qty-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .qty-btn:hover { background: #e2e8f0; color: var(--text-main); }
        .qty-input {
          width: 40px;
          text-align: center;
          border: none;
          background: white;
          border-left: 1.5px solid var(--border);
          border-right: 1.5px solid var(--border);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          padding: 4px 0;
          outline: none;
          -moz-appearance: textfield;
        }
        .qty-input::-webkit-outer-spin-button, .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        .pay-method-btn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 2px solid var(--border);
          background: var(--surface-2);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .pay-method-btn.active {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary-dark);
          box-shadow: 0 0 0 3px rgba(14,165,233,.1);
        }
        .pay-method-btn:hover:not(.active) { border-color: #94a3b8; background: #f8fafc; }

        .checkout-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #0ea5e9, #06b6d4);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.3px;
          box-shadow: 0 6px 20px rgba(14,165,233,.4);
          transition: all 0.2s ease;
        }
        .checkout-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(14,165,233,.5); }
        .checkout-btn:active { transform: scale(0.98); }
        .checkout-btn:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed; transform: none; }

        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,.55);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box { animation: slideUp2 .25s ease; }
        @keyframes slideUp2 {
          from { transform: translateY(16px) scale(.98); opacity: 0; }
          to { transform: none; opacity: 1; }
        }

        .badge-stock { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; width: fit-content; }
        .badge-stock.ok { background: #dcfce7; color: #15803d; }
        .badge-stock.low { background: #fef3c7; color: #92400e; }
        .badge-stock.out { background: #fee2e2; color: #b91c1c; }

        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm; font-family: monospace; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      {/* ── LEFT: Medicine Grid ── */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        style={{ padding: "20px 16px 20px 20px" }}>
        {/* Header & Branch Selector */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
                borderRadius: 14,
                width: 44,
                height: 44,
              }}
              className="flex items-center justify-center shrink-0">
              <Pill size={22} color="white" />
            </div>
            <div>
              <h1 className="brand-font text-2xl font-bold text-gray-900">
                Bán lẻ thuốc
              </h1>
              <p style={{ fontSize: 12, color: "#64748b" }}>
                {filteredInventory.length} sản phẩm ·{" "}
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* DROPDOWN CHỌN CHI NHÁNH */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Store size={16} className="text-slate-400" />
            <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">
              Chi nhánh:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-sm font-bold text-sky-600 outline-none cursor-pointer">
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 shrink-0">
          <Search
            size={17}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            style={{
              width: "100%",
              paddingLeft: 44,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              border: "1.5px solid #e2e8f0",
              borderRadius: 14,
              fontSize: 14,
              color: "#0f172a",
              background: "white",
              outline: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,.05)",
              transition: "border-color .2s",
            }}
            placeholder="Tìm theo tên thuốc, mã SKU..."
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Medicine Grid */}
        <div
          className="scrollbar-thin"
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
            paddingBottom: 20,
          }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}>
            {filteredInventory.map((inv) => {
              const med = inv.medicineId;
              const activeVarId = selectedVariants[med._id];
              const activeVar = inv.variants?.find(
                (v) => v._id === activeVarId,
              );

              const validQty = getValidBaseQuantity(inv);

              const stockLevel =
                validQty === 0 ? "out" : validQty < 10 ? "low" : "ok";

              return (
                <div
                  key={med._id}
                  className="card-medicine"
                  onClick={() => setMedicineDetailModal(inv)}>
                  {/* Top badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}>
                      <span className={`badge-stock ${stockLevel}`}>
                        <Package size={10} />
                        {validQty} {med.baseUnit}
                      </span>
                      {med.isPrescription ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#ef4444",
                            background: "#fee2e2",
                            padding: "3px 8px",
                            borderRadius: 6,
                            width: "fit-content",
                          }}>
                          Thuốc kê đơn
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#10b981",
                            background: "#d1fae5",
                            padding: "3px 8px",
                            borderRadius: 6,
                            width: "fit-content",
                          }}>
                          Không kê đơn
                        </span>
                      )}
                    </div>
                    <span style={{ color: "#cbd5e1", transition: "color .2s" }}>
                      <Info size={15} />
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 140,
                      marginBottom: 12,
                      background: "#f8fafc",
                      borderRadius: 12,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}>
                    <img
                      src={
                        med.images && med.images.length > 0
                          ? med.images[0].startsWith("http")
                            ? med.images[0]
                            : `http://localhost:5000${med.images[0]}`
                          : "https://via.placeholder.com/150?text=No+Image"
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        mixBlendMode: "darken",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://via.placeholder.com/150?text=No+Image";
                      }}
                    />
                  </div>

                  {/* Name */}
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#0f172a",
                      lineHeight: 1.4,
                      marginBottom: 10,
                      flex: 1,
                    }}>
                    {med.name.length > 40
                      ? med.name.substring(0, 40) + "…"
                      : med.name}
                  </p>

                  {/* Variant chips */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      marginBottom: 12,
                    }}>
                    {inv.variants?.map((v) => (
                      <button
                        key={v._id}
                        className={`variant-btn ${activeVarId === v._id ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVariant(med._id, v._id);
                        }}>
                        {v.unit}
                      </button>
                    ))}
                  </div>

                  {/* Price + Add */}
                  {activeVar && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1.5px solid #f1f5f9",
                        paddingTop: 10,
                      }}>
                      <div>
                        <p
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "#ef4444",
                            lineHeight: 1,
                          }}>
                          {activeVar.currentPrice.toLocaleString()}đ
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            marginTop: 2,
                          }}>
                          / {activeVar.unit}
                        </p>
                      </div>
                      <button
                        className="btn-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(inv);
                        }}
                        disabled={validQty <= 0}>
                        <Plus size={14} strokeWidth={3} /> Thêm
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
      <div
        style={{
          width: 420,
          background: "white",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1.5px solid #e2e8f0",
          boxShadow: "-4px 0 20px rgba(0,0,0,.06)",
          flexShrink: 0,
          zIndex: 10,
        }}>
        {/* Cart Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1.5px solid #f1f5f9",
            background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
          }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <ShoppingCart size={22} color="white" />
                {cart.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      background: "#fbbf24",
                      color: "#78350f",
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    {cart.length}
                  </span>
                )}
              </div>
              <div>
                <p style={{ color: "white", fontWeight: 800, fontSize: 15 }}>
                  Hóa đơn bán lẻ
                </p>
                {cart.length > 0 && (
                  <p style={{ color: "rgba(255,255,255,.75)", fontSize: 11 }}>
                    {totalItems} sản phẩm
                  </p>
                )}
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: "rgba(255,255,255,.15)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                <Trash2 size={14} /> Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1.5px solid #f1f5f9",
            background: "#f8fafc",
          }}>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                border: "1.5px solid #e2e8f0",
                borderRadius: 12,
              }}>
              <span
                style={{ paddingLeft: 12, color: "#94a3b8", flexShrink: 0 }}>
                <Phone size={15} />
              </span>
              <input
                type="text"
                placeholder="SĐT khách hàng..."
                value={customerInfo.phone}
                onChange={handlePhoneChange}
                onFocus={() => {
                  if (customerInfo.phone) setShowCustomerDropdown(true);
                }}
                onBlur={() =>
                  setTimeout(() => setShowCustomerDropdown(false), 200)
                }
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  background: "transparent",
                  color: "#0f172a",
                }}
              />
              {customerInfo._id && (
                <CheckCircle2
                  size={16}
                  color="#10b981"
                  style={{ marginRight: 12, flexShrink: 0 }}
                />
              )}
            </div>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                  zIndex: 50,
                  maxHeight: 180,
                  overflowY: "auto",
                }}>
                {filteredCustomers.map((c) => (
                  <li
                    key={c._id}
                    onMouseDown={() => handleSelectCustomer(c)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f0f9ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "white")
                    }>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>
                      {c.phone}
                    </span>
                    <span style={{ color: "#64748b" }}>{c.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "white",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
            }}>
            <span style={{ paddingLeft: 12, color: "#94a3b8", flexShrink: 0 }}>
              <User size={15} />
            </span>
            <input
              type="text"
              placeholder="Tên khách hàng..."
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, name: e.target.value })
              }
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "none",
                outline: "none",
                fontSize: 13,
                background: "transparent",
                color: customerInfo._id ? "#0284c7" : "#0f172a",
                fontWeight: customerInfo._id ? 700 : 400,
              }}
            />
          </div>
          {customerInfo.phone && (
            <div style={{ marginTop: 8, textAlign: "right" }}>
              {customerInfo._id ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#059669",
                    background: "#d1fae5",
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}>
                  ✓ Thành viên
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#d97706",
                    background: "#fef3c7",
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}>
                  + Khách mới
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div
          className="scrollbar-thin"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
          {cart.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#cbd5e1",
                paddingBottom: 40,
              }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "#f1f5f9",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}>
                <ShoppingCart size={28} color="#cbd5e1" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>
                Chưa có sản phẩm
              </p>
              <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                Chọn thuốc từ danh sách bên trái
              </p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const currentInv = inventories.find(
                (i) => i.medicineId._id === item.medicineId,
              );
              const activeVariant = currentInv?.variants.find(
                (v) => v._id === item.variantId,
              );

              return (
                <div
                  key={idx}
                  style={{
                    background: "white",
                    border: "1.5px solid #f1f5f9",
                    borderRadius: 14,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                    animation: "fadeIn .2s ease",
                  }}>
                  {/* Tên & Đơn giá */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {item.price.toLocaleString()}đ / {item.unit}
                    </p>
                  </div>

                  {/* Tăng / Giảm Số lượng */}
                  <div className="qty-control">
                    <button
                      className="qty-btn"
                      onClick={() => {
                        if (item.quantity > 1) {
                          const nc = [...cart];
                          nc[idx].quantity -= 1;
                          setCart(nc);
                        } else {
                          const nc = [...cart];
                          nc.splice(idx, 1);
                          setCart(nc);
                        }
                      }}>
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      className="qty-input"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(
                          currentInv,
                          activeVariant,
                          parseInt(e.target.value) || 1,
                        )
                      }
                    />
                    <button
                      className="qty-btn"
                      style={{ color: "#0ea5e9" }}
                      onClick={() =>
                        handleUpdateQuantity(
                          currentInv,
                          activeVariant,
                          item.quantity + 1,
                        )
                      }>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Tổng tiền của món đó */}
                  <div style={{ minWidth: 65, textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#ef4444", // Màu đỏ
                      }}>
                      {(item.price * item.quantity).toLocaleString()}đ
                    </p>
                  </div>

                  {/* NÚT THÙNG RÁC */}
                  <button
                    onClick={() => {
                      const newCart = [...cart];
                      newCart.splice(idx, 1);
                      setCart(newCart);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      transition: "all 0.2s",
                      marginLeft: "2px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#fee2e2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Xóa sản phẩm khỏi giỏ">
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout Area */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1.5px solid #f1f5f9",
            background: "white",
          }}>
          {/* Payment method */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
            Phương thức thanh toán
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              className={`pay-method-btn ${paymentMethod === "CASH" ? "active" : ""}`}
              onClick={() => setPaymentMethod("CASH")}>
              <Banknote size={18} /> Tiền mặt
            </button>
            <button
              className={`pay-method-btn ${paymentMethod === "QR" ? "active" : ""}`}
              onClick={() => setPaymentMethod("QR")}>
              <QrCode size={18} /> QR / CK
            </button>
          </div>

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff7ed",
              border: "1.5px solid #fed7aa",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 12,
            }}>
            <span style={{ fontSize: 13, color: "#9a3412", fontWeight: 600 }}>
              Khách cần trả
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#dc2626" }}>
              {total.toLocaleString()}đ
            </span>
          </div>

          <button
            className="checkout-btn"
            onClick={handleOpenCheckoutModal}
            disabled={cart.length === 0}>
            <Receipt size={20} /> Xác nhận thanh toán
            {cart.length > 0 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* ── MODAL 1: Medicine Detail ── */}
      {medicineDetailModal && (
        <div
          className="modal-overlay"
          onClick={() => setMedicineDetailModal(null)}>
          <div
            className="modal-box scrollbar-thin"
            style={{
              background: "white",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,.2)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}>
                  <div
                    style={{
                      background: "#e0f2fe",
                      borderRadius: 8,
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                    <Pill size={12} color="#0284c7" />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#0284c7",
                      }}>
                      {medicineDetailModal.medicineId.code}
                    </span>
                  </div>
                </div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.3,
                  }}>
                  {medicineDetailModal.medicineId.name}
                </h2>
              </div>
              <button
                onClick={() => setMedicineDetailModal(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            {medicineDetailModal.medicineId.images &&
              medicineDetailModal.medicineId.images.length > 0 && (
                <div
                  className="scrollbar-thin"
                  style={{
                    display: "flex",
                    gap: 12,
                    overflowX: "auto",
                    marginBottom: 20,
                    paddingBottom: 8,
                  }}>
                  {medicineDetailModal.medicineId.images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={
                        imgUrl.startsWith("http")
                          ? imgUrl
                          : `http://localhost:5000${imgUrl}`
                      }
                      alt={`${medicineDetailModal.medicineId.name}-${idx}`}
                      style={{
                        height: 120,
                        width: 120,
                        objectFit: "contain",
                        mixBlendMode: "darken",
                        borderRadius: 12,
                        border: "1.5px solid #e2e8f0",
                        flexShrink: 0,
                        background: "#f8fafc",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://via.placeholder.com/120?text=No+Image";
                      }}
                    />
                  ))}
                </div>
              )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                border: "1.5px solid #f1f5f9",
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 20,
              }}>
              {[
                [
                  "Phân loại",
                  medicineDetailModal.medicineId.isPrescription
                    ? "Thuốc kê đơn (Rx)"
                    : "Thuốc không kê đơn",
                ],
                [
                  "Công dụng",
                  medicineDetailModal.medicineId.description ||
                    "Đang cập nhật...",
                ],
                [
                  "Hoạt chất",
                  medicineDetailModal.medicineId.ingredients || "Đang cập nhật",
                ],
                [
                  "Nhà sản xuất",
                  medicineDetailModal.medicineId.manufacturer ||
                    "Đang cập nhật",
                ],
                ["Đơn vị cơ sở", medicineDetailModal.medicineId.baseUnit],
                [
                  "Tồn kho hợp lệ (Bán được)",
                  `${getValidBaseQuantity(medicineDetailModal)} ${medicineDetailModal.medicineId.baseUnit}`,
                ],
              ].map(([label, value], i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "11px 16px",
                    background: i % 2 === 0 ? "white" : "#f8fafc",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      flexShrink: 0,
                      minWidth: 90,
                    }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        label === "Phân loại" &&
                        medicineDetailModal.medicineId.isPrescription
                          ? "#ef4444"
                          : "#0f172a",
                      textAlign: "right",
                      wordBreak: "break-word",
                      lineHeight: 1.5,
                    }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}>
              Quy cách đóng gói
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {medicineDetailModal.variants?.map((v) => (
                <div
                  key={v._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#f0f9ff",
                    border: "1.5px solid #bae6fd",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}>
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    1 {v.unit}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#0284c7",
                        fontWeight: 600,
                      }}>
                      {v.conversionRate}{" "}
                      {medicineDetailModal.medicineId.baseUnit}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#ef4444",
                      }}>
                      {v.currentPrice.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Checkout ── */}
      {showCheckoutModal && receiptData && (
        <div className="modal-overlay">
          <div
            className="modal-box"
            style={{
              background: "white",
              color: "#0f172a",
              borderRadius: 24,
              width: "100%",
              maxWidth: 860,
              boxShadow: "0 24px 80px rgba(0,0,0,.25)",
              overflow: "hidden",
              display: "flex",
              maxHeight: "90vh",
            }}>
            {/* Left: Receipt preview */}
            <div
              style={{
                width: "45%",
                background: "#f8fafc",
                borderRight: "1.5px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
              }}>
              <div
                style={{
                  padding: "20px 20px 14px",
                  borderBottom: "1px solid #e2e8f0",
                }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                  }}>
                  Xem trước hóa đơn
                </p>
              </div>
              <div
                className="scrollbar-thin"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 20,
                  display: "flex",
                  justifyContent: "center",
                }}>
                <div
                  style={{
                    width: 280,
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,.1)",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}>
                  {/* <div
                    style={{
                      textAlign: "center",
                      borderBottom: "1px dashed #d1d5db",
                      paddingBottom: 10,
                      marginBottom: 10,
                    }}>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        textTransform: "uppercase",
                      }}>
                      Nhà Thuốc Của Bạn
                    </p>
                    <p style={{ fontSize: 10, color: "#6b7280" }}>
                      Đ/c: {receiptData.branchName}
                    </p>
                    <p
                      style={{
                        fontWeight: 700,
                        marginTop: 6,
                        textTransform: "uppercase",
                      }}>
                      Hóa Đơn Bán Lẻ
                    </p>
                  </div> */}
                  <div
                    style={{
                      textAlign: "center",
                      borderBottom: "1px dashed #d1d5db",
                      paddingBottom: 10,
                      marginBottom: 10,
                    }}>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        textTransform: "uppercase",
                      }}>
                      Nhà Thuốc Của Bạn
                    </p>
                    <p style={{ fontSize: 10, color: "#6b7280" }}>
                      Đ/c: {receiptData.branchName}
                    </p>
                    {/* BỔ SUNG SĐT CHI NHÁNH VÀO XEM TRƯỚC */}
                    <p style={{ fontSize: 10, color: "#6b7280" }}>
                      SĐT: {receiptData.branchPhone}
                    </p>
                    <p
                      style={{
                        fontWeight: 700,
                        marginTop: 6,
                        textTransform: "uppercase",
                      }}>
                      Hóa Đơn Bán Lẻ
                    </p>
                  </div>
                  {receiptData.customer.name && (
                    <div
                      style={{
                        borderBottom: "1px dashed #d1d5db",
                        paddingBottom: 8,
                        marginBottom: 8,
                        fontSize: 10,
                      }}>
                      <p>
                        Khách: <strong>{receiptData.customer.name}</strong>
                      </p>
                    </div>
                  )}
                  <table
                    style={{ width: "100%", fontSize: 10, marginBottom: 8 }}>
                    <tbody>
                      {receiptData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ paddingBottom: 4, maxWidth: 130 }}>
                            {item.name}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            x{item.quantity}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    style={{
                      borderTop: "1px dashed #d1d5db",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                    <span>Tổng cộng:</span>
                    <span>{receiptData.total.toLocaleString()}đ</span>
                  </div>
                  {/* BỔ SUNG NGƯỜI LẬP VÀO XEM TRƯỚC */}
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 12,
                      fontSize: 10,
                      color: "#6b7280",
                    }}>
                    <p style={{ fontWeight: 600 }}>
                      Người lập: {receiptData.staffRole} -{" "}
                      {receiptData.staffName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Payment */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "22px 24px 16px",
                  borderBottom: "1.5px solid #f1f5f9",
                }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  Xác nhận thanh toán
                </h2>
              </div>

              <div
                className="scrollbar-thin"
                style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1.5px solid #fed7aa",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}>
                  <span
                    style={{ fontSize: 14, color: "#9a3412", fontWeight: 600 }}>
                    Khách cần trả:
                  </span>
                  <span
                    style={{ fontSize: 28, fontWeight: 900, color: "#dc2626" }}>
                    {total.toLocaleString()}đ
                  </span>
                </div>

                {paymentMethod === "CASH" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          marginBottom: 8,
                        }}>
                        Tiền khách đưa (VNĐ):
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="0"
                        value={customerGivenMoney}
                        onChange={handleMoneyInputChange}
                        style={{
                          width: "100%",
                          textAlign: "right",
                          fontSize: 26,
                          fontWeight: 800,
                          padding: "12px 16px",
                          border: "2px solid #0ea5e9",
                          borderRadius: 14,
                          outline: "none",
                          color: "#0f172a",
                          background: "#f0f9ff",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background:
                          calculateChange() >= 0 ? "#f0fdf4" : "#f8fafc",
                        border: `1.5px solid ${calculateChange() >= 0 ? "#bbf7d0" : "#e2e8f0"}`,
                        borderRadius: 14,
                        padding: "14px 18px",
                      }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#475569",
                        }}>
                        Tiền thối lại:
                      </span>
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: calculateChange() >= 0 ? "#059669" : "#cbd5e1",
                        }}>
                        {calculateChange() > 0
                          ? calculateChange().toLocaleString()
                          : 0}
                        đ
                      </span>
                    </div>
                  </div>
                )}

                {paymentMethod === "QR" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "#f0f9ff",
                      border: "1.5px solid #bae6fd",
                      borderRadius: 16,
                      padding: 20,
                    }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0369a1",
                        marginBottom: 12,
                      }}>
                      Quét mã QR để thanh toán
                    </p>
                    <img
                      src={`https://img.vietqr.io/image/970415-107874755908-compact2.png?amount=${total}&addInfo=Thanh%20toan%20don%20thuoc%20${receiptData.code}&accountName=Pharmacy Management System`}
                      alt="QR"
                      style={{
                        height: 350,
                        borderRadius: 12,
                        border: "4px solid white",
                        boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                        objectFit: "cover",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 12,
                        textAlign: "center",
                        fontStyle: "italic",
                      }}>
                      Kiểm tra app ngân hàng trước khi xác nhận
                    </p>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1.5px solid #f1f5f9",
                  background: "#f8fafc",
                  display: "flex",
                  gap: 10,
                }}>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  style={{
                    flex: 1,
                    padding: "13px",
                    background: "white",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "#64748b",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "white")
                  }>
                  ← Sửa lại
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={paymentMethod === "CASH" && calculateChange() < 0}
                  style={{
                    flex: 2,
                    padding: "13px",
                    background:
                      paymentMethod === "CASH" && calculateChange() < 0
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor:
                      paymentMethod === "CASH" && calculateChange() < 0
                        ? "not-allowed"
                        : "pointer",
                    color:
                      paymentMethod === "CASH" && calculateChange() < 0
                        ? "#94a3b8"
                        : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow:
                      paymentMethod === "CASH" && calculateChange() < 0
                        ? "none"
                        : "0 4px 14px rgba(14,165,233,.4)",
                  }}>
                  <CheckCircle2 size={20} /> Chốt đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Receipt / Print ── */}
      {showReceipt && receiptData && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div
            className="modal-box"
            style={{
              background: "#f8fafc",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxHeight: "95vh",
            }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                width: 320,
              }}>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}>
                {isGeneratingPDF ? "Đang xuất..." : "Tải PDF"}
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 12px",
                  background: "white",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  cursor: "pointer",
                  color: "#64748b",
                }}>
                <X size={18} />
              </button>
            </div>

            <div
              className="scrollbar-thin"
              style={{ overflowY: "auto", width: 320 }}>
              <div
                id="print-receipt"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  width: 300,
                  padding: 16,
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                {/* <div
                  style={{
                    textAlign: "center",
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: 10,
                    marginBottom: 10,
                  }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      textTransform: "uppercase",
                    }}>
                    Nhà Thuốc Của Bạn
                  </p>
                  <p style={{ fontSize: 11 }}>Đ/c: {receiptData.branchName}</p>
                  <p style={{ fontSize: 11 }}>SĐT: 0123.456.789</p>
                  <p
                    style={{
                      fontWeight: 700,
                      marginTop: 6,
                      textTransform: "uppercase",
                    }}>
                    Hóa Đơn Bán Lẻ
                  </p>
                  <p style={{ fontSize: 11 }}>Mã: {receiptData.code}</p>
                  <p style={{ fontSize: 11 }}>Ngày: {receiptData.date}</p>
                </div> */}
                <div
                  style={{
                    textAlign: "center",
                    borderBottom: "1px dashed #9ca3af",
                    paddingBottom: 10,
                    marginBottom: 10,
                  }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      textTransform: "uppercase",
                    }}>
                    Nhà Thuốc Của Bạn
                  </p>
                  <p style={{ fontSize: 11 }}>Đ/c: {receiptData.branchName}</p>
                  {/* SỬA LẠI THÀNH SĐT ĐỘNG CỦA CHI NHÁNH */}
                  <p style={{ fontSize: 11 }}>SĐT: {receiptData.branchPhone}</p>

                  <p
                    style={{
                      fontWeight: 700,
                      marginTop: 6,
                      textTransform: "uppercase",
                    }}>
                    Hóa Đơn Bán Lẻ
                  </p>
                  <p style={{ fontSize: 11 }}>Mã: {receiptData.code}</p>
                  <p style={{ fontSize: 11 }}>Ngày: {receiptData.date}</p>
                </div>
                {receiptData.customer.name && (
                  <div
                    style={{
                      borderBottom: "1px dashed #9ca3af",
                      paddingBottom: 8,
                      marginBottom: 8,
                      fontSize: 11,
                    }}>
                    <p>
                      Khách hàng: <strong>{receiptData.customer.name}</strong>
                    </p>
                    {receiptData.customer.phone && (
                      <p>SĐT: {receiptData.customer.phone}</p>
                    )}
                  </div>
                )}
                <table
                  style={{ width: "100%", fontSize: 11, marginBottom: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                      <th style={{ textAlign: "left", paddingBottom: 4 }}>
                        Tên hàng
                      </th>
                      <th style={{ textAlign: "center" }}>SL</th>
                      <th style={{ textAlign: "right" }}>T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingTop: 4, wordBreak: "break-word" }}>
                          {item.name}
                        </td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {(item.price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    borderTop: "1px dashed #9ca3af",
                    paddingTop: 8,
                    marginBottom: 16,
                  }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      fontSize: 14,
                    }}>
                    <span>Tổng Cộng:</span>
                    <span>{receiptData.total.toLocaleString()}đ</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      marginTop: 4,
                    }}>
                    <span>Hình thức TT:</span>
                    <span>
                      {receiptData.paymentMethod === "CASH"
                        ? "Tiền mặt"
                        : "Quẹt mã QR"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    fontStyle: "italic",
                  }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontStyle: "normal",
                      marginBottom: 4,
                    }}>
                    Người lập: {receiptData.staffRole} - {receiptData.staffName}
                  </p>
                  <p>Cảm ơn quý khách và hẹn gặp lại!</p>
                  <p>(Hàng mua rồi miễn đổi trả)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />
    </div>
  );
};;;

const POSPage = () => (
  <ToastProvider>
    <POSPageInner />
  </ToastProvider>
);

export default POSPage;
