import { Edit, Loader2, Plus, Store, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../services/api";

const BranchUserManagement = () => {
  const [activeTab, setActiveTab] = useState("branches");
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // === STATES CHO MODAL CHI NHÁNH ===
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    _id: "",
    name: "",
    address: "",
    phone: "",
    type: "store",
  });

  // === STATES CHO MODAL NHÂN VIÊN ===
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

  // ==================== LOGIC CRUD CHI NHÁNH ====================
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
      }); // Thêm mới luôn mặc định là store
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

  // ==================== LOGIC CRUD NHÂN VIÊN ====================
  const handleOpenUserModal = (userObj = null) => {
    if (userObj) {
      setUserForm({ ...userObj, password: "" }); // Chế độ Sửa (Ẩn password đi, nếu nhập sẽ là đổi pass mới)
    } else {
      setUserForm({
        _id: "",
        fullName: "",
        email: "",
        password: "",
        role: "pharmacist",
        branchId: "",
      }); // Thêm mới
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
        // ĐỔI ROUTE TỪ /auth/users SANG /users
        await api.put(`/users/${userForm._id}`, payload);
        alert("Cập nhật nhân sự thành công!");
      } else {
        if (!payload.password) return alert("Vui lòng nhập mật khẩu!");
        // Gọi route register của auth
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
        // ĐỔI ROUTE TỪ /auth/users SANG /users
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cơ cấu tổ chức</h1>
        <button
          onClick={() =>
            activeTab === "branches"
              ? handleOpenBranchModal()
              : handleOpenUserModal()
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm">
          <Plus size={20} />{" "}
          {activeTab === "branches" ? "Thêm Chi nhánh" : "Thêm Nhân sự"}
        </button>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "branches"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          <Store size={18} /> Danh sách Chi nhánh / Kho
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          <Users size={18} /> Danh sách Nhân sự
        </button>
      </div>

      {/* Nội dung Tab */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...
          </div>
        ) : activeTab === "branches" ? (
          /* TAB: CHI NHÁNH */
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="p-4">Tên chi nhánh/Kho</th>
                <th className="p-4">Địa chỉ</th>
                <th className="p-4">Số điện thoại</th>
                <th className="p-4">Loại</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branches.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{b.name}</td>
                  <td className="p-4 text-gray-600">{b.address}</td>
                  <td className="p-4 text-gray-600">{b.phone}</td>
                  <td className="p-4">
                    {/* Dựa vào trường type của Backend để hiển thị màu */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${b.type === "warehouse" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {b.type === "warehouse" ? "Kho tổng" : "Chi nhánh bán lẻ"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenBranchModal(b)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded">
                      <Edit size={16} />
                    </button>

                    {/* Ẩn nút XÓA nếu đây là Kho Tổng */}
                    {b.type !== "warehouse" && (
                      <button
                        onClick={() => handleDeleteBranch(b._id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded ml-1">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-500">
                    Chưa có chi nhánh nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* TAB: NHÂN VIÊN */
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="p-4">Họ và Tên</th>
                <th className="p-4">Email / Tài khoản</th>
                <th className="p-4">Chi nhánh trực thuộc</th>
                <th className="p-4">Vai trò (Role)</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{u.fullName}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4 text-gray-600">
                    {u.branchId?.name || (
                      <span className="text-gray-400 italic">
                        Toàn hệ thống
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                      ${
                        u.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : u.role === "warehouse_manager"
                            ? "bg-purple-100 text-purple-700"
                            : u.role === "branch_manager"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {translateRole(u.role)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenUserModal(u)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded">
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded ml-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-500">
                    Chưa có nhân sự nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL: THÊM / SỬA CHI NHÁNH ================= */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-[500px] overflow-hidden">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {branchForm._id
                  ? "Chỉnh sửa Chi nhánh"
                  : "Thêm Chi nhánh/Kho mới"}
              </h2>
              <button
                onClick={() => setShowBranchModal(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveBranch} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên Chi nhánh <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, name: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Nhà thuốc Cần Thơ 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, address: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Số điện thoại
                </label>
                <input
                  value={branchForm.phone}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, phone: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ĐÃ XÓA CHECKBOX KHO TỔNG Ở ĐÂY */}

              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM / SỬA NHÂN VIÊN ================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-[500px] overflow-hidden">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {userForm._id ? "Chỉnh sửa Nhân sự" : "Thêm Nhân sự mới"}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {/* Thêm ô này vào trên cùng của form nhân viên */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên đăng nhập (Username){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  disabled={!!userForm._id}
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email (Dùng để đăng nhập){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {userForm._id
                    ? "Mật khẩu mới (Bỏ trống nếu không đổi)"
                    : "Mật khẩu"}{" "}
                  {!userForm._id && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="pharmacist">Dược sĩ</option>
                    <option value="branch_manager">Quản lý chi nhánh</option>
                    <option value="warehouse_manager">Quản lý Kho tổng</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nơi làm việc
                  </label>
                  <select
                    value={userForm.branchId || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, branchId: e.target.value })
                    }
                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                    disabled={userForm.role === "admin"}>
                    <option value="">-- Toàn hệ thống --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchUserManagement;
