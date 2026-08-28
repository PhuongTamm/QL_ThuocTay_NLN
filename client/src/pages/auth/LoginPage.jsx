import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader, HeartPulse, ShieldCheck } from "lucide-react";
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

      login(user, accessToken);

      if (user.role === "pharmacist") {
        navigate("/pos");
      } else {
        navigate("/");
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      {/* Khung chứa chính dạng Split-card chuyên nghiệp */}
      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* ─── PHẦN BÊN TRÁI: Branding & Decor (Đồng bộ màu Sidebar) ─── */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#1068ec] to-[#51b2db] p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
          {/* Họa tiết nền mờ */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-inner">
              <HeartPulse size={36} className="text-white" strokeWidth={2} />
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight">
              PharmaSys
            </h2>
            <p className="text-white/90 text-lg font-medium leading-relaxed max-w-sm">
              Hệ thống quản lý nhà thuốc toàn diện. Tối ưu vận hành, kiểm soát
              chặt chẽ.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90 bg-white/10 w-fit px-4 py-2.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
              <ShieldCheck size={18} className="text-emerald-300" />
              <span>Bảo mật dữ liệu cấp y tế</span>
            </div>
            <p className="text-white/60 text-xs font-medium mt-6">
              © {new Date().getFullYear()} Pharmacy Management System.
            </p>
          </div>
        </div>

        {/* ─── PHẦN BÊN PHẢI: Form Đăng nhập ─── */}
        <div className="md:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative bg-white">
          {/* Logo hiển thị trên mobile (ẩn trên PC) */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1068ec] to-[#51b2db] rounded-xl flex items-center justify-center shadow-lg shadow-[#1068ec]/30">
              <HeartPulse size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              PharmaSys
            </h2>
          </div>

          <div className="mb-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
              Đăng nhập hệ thống
            </h3>
            <p className="text-slate-500 font-medium">
              Vui lòng nhập thông tin xác thực để tiếp tục
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Hiển thị lỗi */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold flex items-start gap-3 animate-[fadeIn_.3s_ease]">
                <div className="mt-0.5">
                  <span className="flex w-2 h-2 rounded-full bg-red-500 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  </span>
                </div>
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Input Email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Tài khoản Email
                </label>
                <div className="relative group">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1068ec] transition-colors"
                    size={20}
                  />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#1068ec]/10 focus:border-[#1068ec] outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pharmacy.com"
                  />
                </div>
              </div>

              {/* Input Mật khẩu */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1068ec] transition-colors"
                    size={20}
                  />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#1068ec]/10 focus:border-[#1068ec] outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3286d4] text-white py-4 rounded-xl font-bold text-base hover:bg-[#0d56c2] hover:shadow-lg hover:shadow-[#1068ec]/30 transition-all flex justify-center items-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none">
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
