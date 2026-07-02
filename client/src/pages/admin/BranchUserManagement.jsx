import {
  Edit,
  Loader2,
  Plus,
  Store,
  Trash2,
  Users,
  X,
  Save,
  Building2,
  MapPin,
  Phone,
  ScanFace,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../services/api";
import RegisterFace from "./RegisterFace";

const BranchUserManagement = () => {
  const [activeTab, setActiveTab] = useState("branches");
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceRegisterUser, setFaceRegisterUser] = useState(null);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    _id: "",
    name: "",
    address: "",
    phone: "",
    type: "store",
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    _id: "",
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "pharmacist",
    branchId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchRes, userRes] = await Promise.all([
        api.get("/branches"),
        api.get("/auth/users"),
      ]);
      setBranches(branchRes.data.data || []);
      setUsers(userRes.data.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setBranchForm(branch);
    } else {
      setBranchForm({
        _id: "",
        name: "",
        address: "",
        phone: "",
        type: "store",
      });
    }
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    try {
      if (branchForm._id) {
        await api.put(`/branches/${branchForm._id}`, branchForm);
        alert("Cập nhật chi nhánh thành công!");
      } else {
        await api.post("/branches", branchForm);
        alert("Thêm chi nhánh thành công!");
      }
      setShowBranchModal(false);
      fetchData();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteBranch = async (id) => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn xóa chi nhánh/kho này không? Mọi dữ liệu tồn kho liên quan có thể bị ảnh hưởng!",
      )
    ) {
      try {
        await api.delete(`/branches/${id}`);
        alert("Đã xóa chi nhánh!");
        fetchData();
      } catch (error) {
        alert(
          "Lỗi xóa chi nhánh: " +
            (error.response?.data?.message || error.message),
        );
      }
    }
  };

  const handleOpenUserModal = (userObj = null) => {
    if (userObj) {
      setUserForm({ ...userObj, password: "" });
    } else {
      setUserForm({
        _id: "",
        fullName: "",
        email: "",
        password: "",
        role: "pharmacist",
        branchId: "",
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...userForm };
      if (!payload.branchId) payload.branchId = null;
      if (userForm._id) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${userForm._id}`, payload);
        alert("Cập nhật nhân sự thành công!");
      } else {
        if (!payload.password) return alert("Vui lòng nhập mật khẩu!");
        await api.post("/auth/register", payload);
        alert("Thêm nhân sự thành công!");
      }
      setShowUserModal(false);
      fetchData();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản nhân sự này?")) {
      try {
        await api.delete(`/users/${id}`);
        alert("Đã xóa nhân sự!");
        fetchData();
      } catch (error) {
        alert("Lỗi: " + error.message);
      }
    }
  };

  const translateRole = (role) => {
    switch (role) {
      case "admin":
        return "Quản trị viên";
      case "warehouse_manager":
        return "Quản lý kho tổng";
      case "branch_manager":
        return "Quản lý chi nhánh";
      case "pharmacist":
        return "Dược sĩ";
      default:
        return role || "Chưa phân quyền";
    }
  };

  const getRoleBadge = (role) => {
    
    return (
      <span
        className={`text-sm font-normal text-slate-600`}>
        {translateRole(role)}
      </span>
    );
  };

  /* ── shared styles ── */
  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1d5fa7]/30 focus:border-[#1d5fa7] transition bg-white text-slate-800 placeholder:text-slate-400";
  const labelCls =
    "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }

        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { transform: translateY(14px) scale(.97); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div className="animate-page-in space-y-6">
        {/* ── PAGE HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
                boxShadow: "0 4px 14px rgba(29, 95, 167, 0.3)",
              }}>
              <Building2 size={22} color="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Cơ cấu tổ chức
              </h1>
              <p className="text-xs text-slate-500">
                {activeTab === "branches"
                  ? `${branches.length} chi nhánh / kho`
                  : `${users.length} nhân sự`}
                {" · "}
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              activeTab === "branches"
                ? handleOpenBranchModal()
                : handleOpenUserModal()
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #1d5fa7, #2c78d6)",
              boxShadow: "0 4px 14px rgba(29, 95, 167, 0.4)",
            }}>
            <Plus size={18} strokeWidth={2.5} />
            {activeTab === "branches" ? "Thêm Chi nhánh" : "Thêm Nhân sự"}
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 mb-4 w-fit">
          <button
            onClick={() => setActiveTab("branches")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "branches"
                ? "text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            style={
              activeTab === "branches"
                ? { background: "linear-gradient(135deg, #1d5fa7, #2c78d6)" }
                : {}
            }>
            <Store size={16} /> Danh sách Chi nhánh / Kho
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "users"
                ? "text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            style={
              activeTab === "users"
                ? { background: "linear-gradient(135deg, #1d5fa7, #2c78d6)" }
                : {}
            }>
            <Users size={16} /> Danh sách Nhân sự
          </button>
        </div>

        {/* ── TABLE CONTAINER ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-[#1d5fa7]" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : activeTab === "branches" ? (
            /* ══ TAB: CHI NHÁNH ══ */
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Tên chi nhánh / Kho
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Địa chỉ
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Số điện thoại
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Loại
                  </th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Store size={28} className="text-slate-300" />
                        </div>
                        <p className="text-base font-semibold text-slate-500">
                          Chưa có chi nhánh nào
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr
                      key={b._id}
                      className="hover:bg-[#1d5fa7]/5 transition-colors duration-150">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm ${b.type === "warehouse" ? "bg-violet-50" : "bg-[#1d5fa7]/10"}`}>
                            {b.type === "warehouse" ? (
                              <Building2
                                size={15}
                                className="text-violet-500"
                              />
                            ) : (
                              <Store size={15} className="text-[#1d5fa7]" />
                            )}
                          </div>
                          <span className="font-normal text-slate-800">
                            {b.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-slate-700 text-sm font-normal">
                          <MapPin
                            size={12}
                            className="text-slate-400 shrink-0"
                          />{" "}
                          {b.address}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-slate-700 text-sm font-normal">
                          <Phone
                            size={12}
                            className="text-slate-400 shrink-0"
                          />{" "}
                          {b.phone || "---"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-normal text-slate-700">
                          {b.type === "warehouse"
                            ? "Kho tổng"
                            : "Chi nhánh bán lẻ"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBranchModal(b)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#1d5fa7] hover:bg-[#1d5fa7]/10 transition-all hover:scale-110">
                            <Edit size={16} />
                          </button>
                          {b.type !== "warehouse" && (
                            <button
                              onClick={() => handleDeleteBranch(b._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-all hover:scale-110">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ══ TAB: NHÂN VIÊN ══ */
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Họ và Tên
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Email / Tài khoản
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Chi nhánh trực thuộc
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Vai trò
                  </th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Users size={28} className="text-slate-300" />
                        </div>
                        <p className="text-base font-semibold text-slate-500">
                          Chưa có nhân sự nào
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u._id}
                      className="hover:bg-[#1d5fa7]/5 transition-colors duration-150">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1d5fa7]/5 to-[#1d5fa7]/10 border border-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-[#1d5fa7] font-bold text-xs">
                              {u.fullName?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="font-normal text-slate-800">
                            {u.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 text-sm font-normal">
                        {u.email}
                      </td>
                      <td className="p-4">
                        {u.branchId?.name ? (
                          <span className="flex items-center gap-1.5 text-slate-700 text-sm font-normal">
                            <Store size={12} className="text-slate-400" />{" "}
                            {u.branchId.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-sm font-normal">
                            Toàn hệ thống
                          </span>
                        )}
                      </td>
                      <td className="p-4">{getRoleBadge(u.role)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setFaceRegisterUser(u)}
                            title="Đăng ký Face ID"
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all hover:scale-110">
                            <ScanFace size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            title="Chỉnh sửa"
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#1d5fa7] hover:bg-[#1d5fa7]/10 transition-all hover:scale-110">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            title="Xóa nhân sự"
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-all hover:scale-110">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
         MODAL: THÊM / SỬA CHI NHÁNH
      ══════════════════════════════════════════ */}
      {showBranchModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: "fadeIn .2s ease" }}
          onClick={() => setShowBranchModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[500px] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div
              className="flex justify-between items-center px-6 py-4 text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
              }}>
              <div className="flex items-center gap-2">
                <Store size={18} color="white" />
                <h2 className="text-base font-bold">
                  {branchForm._id
                    ? "Chỉnh sửa Chi nhánh"
                    : "Thêm Chi nhánh / Kho mới"}
                </h2>
              </div>
              <button
                onClick={() => setShowBranchModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} color="white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>
                  Tên Chi nhánh <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, name: e.target.value })
                  }
                  className={inputCls}
                  placeholder="VD: Nhà thuốc Cần Thơ 1"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Địa chỉ <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, address: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Số nhà, đường, quận/huyện..."
                />
              </div>
              <div>
                <label className={labelCls}>Số điện thoại</label>
                <input
                  value={branchForm.phone}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, phone: e.target.value })
                  }
                  className={inputCls}
                  placeholder="0xxx.xxx.xxx"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #1d5fa7, #2c78d6)",
                    boxShadow: "0 4px 12px rgba(29, 95, 167, 0.35)",
                  }}>
                  <Save size={15} /> Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
         MODAL: THÊM / SỬA NHÂN VIÊN
      ══════════════════════════════════════════ */}
      {showUserModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: "fadeIn .2s ease" }}
          onClick={() => setShowUserModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
            style={{ animation: "modalIn .22s ease" }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div
              className="flex justify-between items-center px-6 py-4 text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #1d5fa7 0%, #2c78d6 100%)",
              }}>
              <div className="flex items-center gap-2">
                <Users size={18} color="white" />
                <h2 className="text-base font-bold">
                  {userForm._id ? "Chỉnh sửa Nhân sự" : "Thêm Nhân sự mới"}
                </h2>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} color="white" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSaveUser}
              className="p-6 overflow-y-auto scrollbar-thin space-y-4 flex-1">
              <div>
                <label className={labelCls}>
                  Tên đăng nhập (Username){" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  disabled={!!userForm._id}
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value })
                  }
                  className={
                    inputCls +
                    (userForm._id
                      ? " bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "")
                  }
                  placeholder="VD: pharmacist01"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Họ và tên <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Email (Dùng để đăng nhập){" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className={inputCls}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className={labelCls}>
                  {userForm._id ? (
                    "Mật khẩu mới (Bỏ trống nếu không đổi)"
                  ) : (
                    <>
                      Mật khẩu <span className="text-red-400">*</span>
                    </>
                  )}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Vai trò <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className={inputCls + " appearance-none"}>
                    <option value="pharmacist">Dược sĩ</option>
                    <option value="branch_manager">Quản lý chi nhánh</option>
                    <option value="warehouse_manager">Quản lý Kho tổng</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nơi làm việc</label>
                  <select
                    value={userForm.branchId || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, branchId: e.target.value })
                    }
                    disabled={userForm.role === "admin"}
                    className={
                      inputCls +
                      " appearance-none" +
                      (userForm.role === "admin"
                        ? " bg-slate-50 text-slate-400 cursor-not-allowed"
                        : "")
                    }>
                    <option value="">-- Toàn hệ thống --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #1d5fa7, #2c78d6)",
                    boxShadow: "0 4px 12px rgba(29, 95, 167, 0.35)",
                  }}>
                  <Save size={15} /> Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
         MODAL: ĐĂNG KÝ KHUÔN MẶT
      ══════════════════════════════════════════ */}
      {faceRegisterUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <RegisterFace
            userId={faceRegisterUser._id}
            onSuccess={() => {
              setFaceRegisterUser(null);
              fetchData();
            }}
            onCancel={() => setFaceRegisterUser(null)}
          />
        </div>
      )}
    </div>
  );
};

export default BranchUserManagement;
