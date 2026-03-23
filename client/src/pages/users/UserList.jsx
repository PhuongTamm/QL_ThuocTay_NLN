import React, { useState, useEffect } from "react";
import { Plus, Trash2, UserCog, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("auth/users");
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa nhân viên này?")) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers(); // Reload list
      } catch (err) {
        alert("Lỗi xóa user");
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân viên</h1>
        <button
          onClick={() => navigate("/users/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} /> Thêm nhân viên
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 font-medium">
            <tr>
              <th className="p-4">Tên nhân viên</th>
              <th className="p-4">Email (Tài khoản)</th>
              <th className="p-4">Vai trò</th>
              <th className="p-4">Chi nhánh làm việc</th>
              <th className="p-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{user.name}</td>
                <td className="p-4 text-gray-600">{user.email}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                    {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </span>
                </td>
                <td className="p-4 flex items-center gap-2 text-gray-600">
                  <MapPin size={16} />
                  {user.branchId?.name || "Toàn hệ thống"}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
