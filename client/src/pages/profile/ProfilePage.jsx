import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  ShieldCheck,
  Phone,
  ScanFace,
  Building2,
  Camera,
  Loader2,
  Save,
  CalendarDays,
  ArrowRight,
  FileText,
  Calendar,
} from "lucide-react";
import RegisterFace from "../admin/RegisterFace";
import api from "../../services/api";

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [showFaceModal, setShowFaceModal] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [isUploading, setIsUploading] = useState(false);

  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [customRange, setCustomRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const translateRole = (role) => {
    switch (role) {
      case "admin":
        return "Quản trị viên";
      case "warehouse_manager":
        return "Quản lý Kho tổng";
      case "branch_manager":
        return "Quản lý Chi nhánh";
      case "pharmacist":
        return "Dược sĩ";
      default:
        return role || "Chưa phân quyền";
    }
  };

  // FETCH LỊCH SỬ CHẤM CÔNG VỚI LOGIC TÍNH NGÀY 
  const fetchAttendanceHistory = async () => {
    setLoadingHistory(true);
    try {
      let start = "";
      let end = "";
      const today = new Date();

      if (datePreset === "TODAY") {
        start = today.toISOString().split("T")[0];
        end = start;
      } else if (datePreset === "LAST_7_DAYS") {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        start = lastWeek.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (datePreset === "THIS_MONTH") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = firstDay.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (datePreset === "CUSTOM") {
        start = customRange.startDate;
        end = customRange.endDate || today.toISOString().split("T")[0];
      }

      if (datePreset === "CUSTOM" && !start) {
        setLoadingHistory(false);
        return;
      }

      const res = await api.get(`/attendance/my-history`, {
        params: { startDate: start, endDate: end },
      });
      setAttendanceHistory(res.data.data || []);
    } catch (error) {
      console.error("Lỗi lấy lịch sử chấm công:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (
        datePreset !== "CUSTOM" ||
        (datePreset === "CUSTOM" && customRange.startDate)
      ) {
        fetchAttendanceHistory();
      }
    }
  }, [datePreset, customRange, user]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== "CUSTOM") {
      setCustomRange({ startDate: "", endDate: "" });
    }
  };

  //UPLOAD AVATAR 
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const res = await api.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAvatarFile(null);
      alert("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      alert(
        "Lỗi tải ảnh lên: " + (error.response?.data?.message || error.message),
      );
    } finally {
      setIsUploading(false);
    }
  };

  // LÀM PHẲNG DỮ LIỆU LỊCH SỬ THÀNH TỪNG DÒNG 
  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  let flattenedHistory = [];
  attendanceHistory.forEach((record) => {
    if (record.scanTimes && record.scanTimes.length > 0) {
      record.scanTimes.forEach((time, index) => {
        flattenedHistory.push({
          id: `${record._id}-${index}`,
          date: record.date,
          time: time,
          type: index % 2 === 0 ? "IN" : "OUT",
        });
      });
    }
  });
  flattenedHistory.sort((a, b) => new Date(b.time) - new Date(a.time));

  //COMPONENT NÚT CHỌN PRESET 
  const PresetBtn = ({ id, label }) => (
    <button
      onClick={() => handlePresetChange(id)}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        datePreset === id
          ? "bg-sky-500 text-white shadow-md shadow-sky-200"
          : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
      }`}>
      {label}
    </button>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-100/50 to-white p-6 font-sans">
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: fadeInPage 0.4s ease-out forwards;
        }
      `}</style>

      <div className="animate-page-in space-y-6">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-200/50"
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              }}>
              <User size={22} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Hồ sơ cá nhân
              </h1>
              <p className="text-slate-500 text-sm mt-0.5 font-medium">
                Quản lý tài khoản và lịch sử làm việc
              </p>
            </div>
          </div>

          {/* Bộ lọc  */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-sky-100 rounded-xl p-1.5 shadow-sm w-fit">
            <PresetBtn id="TODAY" label="Hôm nay" />
            <PresetBtn id="LAST_7_DAYS" label="7 Ngày" />
            <PresetBtn id="THIS_MONTH" label="Tháng này" />
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex items-center gap-2 px-2">
              <Calendar size={15} className="text-sky-500 shrink-0" />
              <input
                type="date"
                className="border-none outline-none text-sm text-slate-700 bg-transparent font-medium cursor-pointer focus:text-sky-700"
                value={customRange.startDate}
                onChange={(e) => {
                  setDatePreset("CUSTOM");
                  setCustomRange({ ...customRange, startDate: e.target.value });
                }}
              />
              <span className="text-slate-300">–</span>
              <input
                type="date"
                className="border-none outline-none text-sm text-slate-700 bg-transparent font-medium cursor-pointer focus:text-sky-700"
                value={customRange.endDate}
                onChange={(e) => {
                  setDatePreset("CUSTOM");
                  setCustomRange({ ...customRange, endDate: e.target.value });
                }}
              />
            </div>
          </div>
        </div>

        {/*  GRID LAYOUT INFO VÀ BẢNG LỊCH SỬ */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* CỘT TRÁI (1/4): AVATAR + INFO + ACTION */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-50 to-sky-200 border-4 border-white shadow-lg flex items-center justify-center relative mb-4 overflow-hidden group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-sky-600 uppercase">
                    {user.fullName?.charAt(0) || "?"}
                  </span>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 bg-slate-900/50 hidden group-hover:flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Camera className="text-white mb-1" size={20} />
                  <span className="text-white text-[10px] font-bold">
                    Đổi ảnh
                  </span>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {avatarFile && (
                <button
                  onClick={handleUploadAvatar}
                  disabled={isUploading}
                  className="mb-4 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-full shadow-md hover:bg-sky-700 flex items-center gap-1.5 transition-all">
                  {isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Lưu ảnh
                </button>
              )}

              <h2 className="text-lg font-bold text-slate-800">
                {user.fullName}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-800 text-[11px] font-bold rounded-full border border-sky-100">
                <ShieldCheck size={12} /> {translateRole(user.role)}
              </span>

              <div className="w-full mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-sky-50 hover:border-sky-100 transition-colors">
                  <Mail size={16} className="text-sky-500 shrink-0" />
                  <span className="truncate font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-sky-50 hover:border-sky-100 transition-colors">
                  <Phone size={16} className="text-sky-500 shrink-0" />
                  <span className="font-medium">
                    {user.phone || "Chưa cập nhật SĐT"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-sky-50 hover:border-sky-100 transition-colors">
                  <Building2 size={16} className="text-sky-500 shrink-0" />
                  <span className="truncate font-medium">
                    {user.role === "admin"
                      ? "Toàn hệ thống"
                      : user.branchId?.name || "Chi nhánh trực thuộc"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
              <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wide flex items-center gap-2">
                <ScanFace size={16} className="text-sky-600" /> Tiện ích Face ID
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/check-in")}
                  className="w-full py-3 px-4 bg-gradient-to-r bg-sky-600 hover:shadow-lg hover:shadow-sky-500/30 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                  Đến máy Chấm công <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setShowFaceModal(true)}
                  className="w-full py-3 px-4 bg-white border border-sky-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Camera size={16} className="text-sky-400" /> Cập nhật khuôn
                  mặt
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (3/4): LỊCH SỬ CHẤM CÔNG */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-sky-100 flex items-center gap-2 bg-sky-50/50">
                <CalendarDays size={18} className="text-sky-600" />
                <h3 className="font-bold text-slate-700">
                  Chi tiết quét Face ID
                </h3>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                    <tr className="border-b border-sky-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold bg-sky-50">
                      <th className="p-4 w-1/3">Ngày làm việc</th>
                      <th className="p-4 text-center w-1/3">Giờ quét camera</th>
                      <th className="p-4 text-center w-1/3">
                        Hành động ghi nhận
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="3" className="py-16 text-center">
                          <Loader2
                            size={28}
                            className="animate-spin text-sky-600 mx-auto"
                          />
                        </td>
                      </tr>
                    ) : flattenedHistory.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-20 text-center text-slate-400">
                          <FileText
                            size={40}
                            className="mx-auto mb-3 opacity-20 text-sky-300"
                          />
                          <p className="font-medium">
                            Không có dữ liệu trong khoảng thời gian này.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      flattenedHistory.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-sky-50/40 transition-colors">
                          <td className="p-4 text-slate-700 pl-6 font-medium">
                            {item.date.split("-").reverse().join("/")}
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-slate-800 font-bold text-[15px]">
                              {formatTime(item.time)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {item.type === "IN" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] uppercase tracking-wide rounded-lg border border-emerald-200">
                                <ArrowRight size={14} className="rotate-45" />{" "}
                                Giờ Vào ca
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] uppercase tracking-wide rounded-lg border border-amber-200">
                                <ArrowRight size={14} className="-rotate-45" />{" "}
                                Giờ Ra ca
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal đăng ký Face ID */}
      {showFaceModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          style={{ animation: "fadeInPage .2s ease" }}>
          <RegisterFace
            userId={user._id}
            onSuccess={() => {
              setShowFaceModal(false);
              alert("Cập nhật dữ liệu khuôn mặt thành công!");
            }}
            onCancel={() => setShowFaceModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
