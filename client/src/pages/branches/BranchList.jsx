import React, { useState, useEffect } from "react";
import { Plus, Store, Phone, MapPin } from "lucide-react";
import api from "../../services/api";

const BranchList = () => {
  const [branches, setBranches] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    const res = await api.get("/branches");
    setBranches(res.data.data || []);
  };

  const handleCreate = async () => {
    try {
      await api.post("/branches", newBranch);
      setIsModalOpen(false);
      setNewBranch({ name: "", address: "", phone: "" });
      loadBranches();
    } catch (err) {
      alert("Lỗi tạo chi nhánh");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Hệ Thống Chi Nhánh</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} /> Thêm chi nhánh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div
            key={branch._id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Store size={24} />
              </div>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                Hoạt động
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {branch.name}
            </h3>

            <div className="space-y-2 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-sm">{branch.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm">{branch.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Thêm chi nhánh mới</h2>
            <div className="space-y-3">
              <input
                placeholder="Tên chi nhánh"
                className="w-full border p-2 rounded"
                onChange={(e) =>
                  setNewBranch({ ...newBranch, name: e.target.value })
                }
              />
              <input
                placeholder="Địa chỉ"
                className="w-full border p-2 rounded"
                onChange={(e) =>
                  setNewBranch({ ...newBranch, address: e.target.value })
                }
              />
              <input
                placeholder="Số điện thoại"
                className="w-full border p-2 rounded"
                onChange={(e) =>
                  setNewBranch({ ...newBranch, phone: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 rounded">
                Hủy
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchList;
