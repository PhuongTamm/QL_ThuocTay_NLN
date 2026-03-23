import React, { useState, useEffect } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const AddUser = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    branchId: "",
  });

  useEffect(() => {
    // Load danh sách chi nhánh để hiển thị dropdown
    const loadBranches = async () => {
      const res = await api.get("/branches");
      setBranches(res.data.data || []);
    };
    loadBranches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", formData); // Hoặc /users tùy route server
      alert("Tạo nhân viên thành công!");
      navigate("/users");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex justify-center">
      <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 mb-6 hover:text-blue-600">
          <ArrowLeft size={20} className="mr-2" /> Quay lại
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Thêm Nhân Viên Mới
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Dùng để đăng nhập)
            </label>
            <input
              type="email"
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                value={formData.role}>
                <option value="staff">Nhân viên bán hàng</option>
                <option value="admin">Quản trị viên (Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chi nhánh
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
                required={formData.role === "staff"}
                disabled={formData.role === "admin"} // Admin thường quản lý all
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mt-6 flex justify-center gap-2">
            <Save size={20} /> Lưu tài khoản
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
