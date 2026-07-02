import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader, HeartPulse } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, user } = res.data;

      // Lưu thông tin vào Context
      login(user, accessToken);

      // --- ĐIỀU HƯỚNG DỰA TRÊN ROLE ---
      if (user.role === "pharmacist") {
        navigate("/pos"); // Dược sĩ vào thẳng quầy thu ngân
      } else {
        navigate("/"); // Quản lý & Admin vào trang Tổng quan (Dashboard)
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-white">
        {/* Header Login */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg mb-4">
            <HeartPulse size={36} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">
            PharmaApp
          </h2>
          <p className="text-gray-500 text-sm mt-2 font-medium">
            Đăng nhập để vào hệ thống quản lý
          </p>
        </div>

        {/* Báo lỗi */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center justify-center animate-pulse">
            {error}
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
              Email đăng nhập
            </label>
            <div className="relative group">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                size={20}
              />
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: admin@pharma.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
              Mật khẩu
            </label>
            <div className="relative group">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                size={20}
              />
              <input
                type="password"
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-800"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg transition-all flex justify-center items-center gap-2 mt-4 active:scale-[0.98] disabled:bg-gray-400 disabled:pointer-events-none">
            {loading ? (
              <Loader className="animate-spin" size={24} />
            ) : (
              "ĐĂNG NHẬP"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
