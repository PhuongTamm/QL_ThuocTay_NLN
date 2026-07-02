import {
  ArrowRightLeft,
  BarChart,
  ClipboardList,
  Download,
  History,
  LayoutDashboard,
  LogOut,
  Pill,
  ShoppingCart,
  Store,
  Tags,
  Truck,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      path: "/",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      roles: ["admin", "branch_manager", "warehouse_manager"],
    },
    {
      path: "/pos",
      icon: <ShoppingCart size={20} />,
      label: "POS Bán hàng",
      roles: ["branch_manager", "pharmacist"],
    },

    {
      path: "/categories",
      icon: <Tags size={20} />,
      label: "Danh mục Thuốc",
      roles: ["admin"],
    },
    {
      path: "/medicines",
      icon: <Pill size={20} />,
      label: "Danh sách Thuốc",
      roles: ["admin", "warehouse_manager"],
    },

    {
      path: "/inventory",
      icon: <ClipboardList size={20} />,
      label: "Xem Tồn Kho",
      roles: ["admin", "warehouse_manager", "branch_manager", "pharmacist"],
    },
    {
      path: "/import-supplier",
      icon: <Truck size={20} />,
      label: "Nhập hàng (NCC)",
      roles: ["admin", "warehouse_manager"],
    },
    {
      path: "/distribute",
      icon: <ArrowRightLeft size={20} />,
      label: "Phân phối hàng",
      roles: ["admin", "warehouse_manager", "branch_manager"],
    },
    {
      path: "/pending-imports",
      icon: <Download size={20} />,
      label: "Xác nhận nhận hàng",
      roles: ["admin", "branch_manager", "warehouse_manager"],
    },
    {
      path: "/history-imports",
      icon: <History size={20} />,
      label: "Lịch sử nhập xuất",
      roles: ["admin", "warehouse_manager", "branch_manager", "pharmacist"],
    },

    {
      path: "/organization",
      icon: <Store size={20} />,
      label: "Cơ cấu tổ chức",
      roles: ["admin"],
    },
    {
      path: "/monthly-reports",
      icon: <BarChart size={20} />,
      label: "Báo cáo tồn kho",
      roles: ["admin", "branch_manager", "warehouse_manager"],
    },
  ];

  const visibleMenu = menuItems.filter((item) => {
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  const getRoleName = (role) => {
    switch (role) {
      case "admin":
        return "Quản trị viên";
      case "warehouse_manager":
        return "Quản lý kho";
      case "branch_manager":
        return "Quản lý chi nhánh";
      default:
        return "Dược sĩ";
    }
  };

  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-sky-200 to-sky-100 text-slate-700 flex flex-col shadow-xl overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-white/50">
        <h1
          className="
            text-3xl
            font-extrabold
            bg-gradient-to-r
            from-sky-600
            to-teal-500
            bg-clip-text
            text-transparent
            drop-shadow-sm
          ">
          PharmaSys
        </h1>
      </div>

      {/* KHU VỰC THÔNG TIN TÀI KHOẢN */}
      <Link
        to="/profile"
        className="flex flex-col items-center py-6 border-b border-white/50 hover:bg-white/30 transition-colors cursor-pointer group"
        title="Xem thông tin cá nhân">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-sky-600 text-xl font-bold mb-3 shadow-lg shadow-black/5 overflow-hidden border-[3px] border-white bg-white/80 group-hover:scale-105 transition-transform duration-300">
          {/* HIỂN THỊ ẢNH ĐẠI DIỆN */}
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user?.fullName?.charAt(0)?.toUpperCase() || "U"}</span>
          )}
        </div>
        <p className="text-slate-800 font-bold text-center px-4">
          {user?.fullName}
        </p>
        <p className="text-xs text-teal-700 uppercase tracking-wider mt-1 font-bold">
          {getRoleName(user?.role)}
        </p>
      </Link>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleMenu.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3
                px-4 py-3
                rounded-xl
                transition-all duration-300
                group
                ${
                  isActive
                    ? `
                      bg-white/70
                      backdrop-blur-md
                      shadow-sm
                      text-sky-700
                      border border-white
                      font-bold
                    `
                    : `
                      text-slate-600
                      hover:bg-white/50
                      hover:text-sky-700
                      hover:translate-x-1
                    `
                }
              `}>
              <span
                className={`
                  transition-transform duration-300
                  ${!isActive && "group-hover:scale-110"}
                `}>
                {item.icon}
              </span>

              <span
                className={`text-sm ${isActive ? "font-bold" : "font-semibold"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/50">
        <button
          onClick={() => {
            if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
              logout();
            }
          }}
          className="
            flex items-center gap-3
            w-full
            px-4 py-3
            rounded-xl
            text-slate-600
            hover:bg-rose-50
            hover:text-rose-600
            transition-all duration-300
            font-semibold
          ">
          <LogOut size={20} />
          <span className="text-sm">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
