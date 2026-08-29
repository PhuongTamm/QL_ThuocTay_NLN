import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Trạng thái đang load user lúc mới vào app

  // Check token khi App khởi động (F5)
  useEffect(() => {
    const checkLogin = async () => {
      const token = localStorage.getItem("accessToken");

      if (token) {
        try {
          // Gọi API /me để lấy thông tin user mới nhất & kiểm tra token hợp lệ
          // (Dựa trên route /me đã có trong auth.route.js)
          const res = await api.get("/auth/me");
          setUser(res.data.user);
        } catch (error) {
          // Nếu token hết hạn hoặc lỗi -> Xóa token, logout
          console.error("Phiên đăng nhập hết hạn", error);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLogin();
  }, []);

  // Login 
  const login = (userData, token) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData)); // Lưu tạm để dùng ngay
    setUser(userData);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
    // Có thể điều hướng về login ở đây hoặc ở component dùng context
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, logout, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook để dùng nhanh ở các trang khác
export const useAuth = () => useContext(AuthContext);
