import {
  Activity,
  ArrowRightLeft,
  BarChart,
  ClipboardList,
  DollarSign,
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
      label: "POS bán thuốc",
      roles: ["branch_manager", "pharmacist"],
    },
    {
      path: "/categories",
      icon: <Tags size={20} />,
      label: "Nhóm thuốc",
      roles: ["admin"],
    },
    {
      path: "/medicines",
      icon: <Pill size={20} />,
      label: "Danh sách thuốc",
      roles: ["admin", "warehouse_manager"],
    },
    {
      path: "/inventory",
      icon: <ClipboardList size={20} />,
      label: "Xem tồn kho",
      roles: ["admin", "warehouse_manager", "branch_manager", "pharmacist"],
    },
    {
      path: "/import-supplier",
      icon: <Truck size={20} />,
      label: "Nhập thuốc",
      roles: ["admin", "warehouse_manager"],
    },
    {
      path: "/distribute",
      icon: <ArrowRightLeft size={20} />,
      label: "Phân phối thuốc",
      roles: ["admin", "warehouse_manager", "branch_manager"],
    },
    {
      path: "/pending-imports",
      icon: <Download size={20} />,
      label: "Xác nhận nhận thuốc",
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
    {
      path: "/price-management",
      icon: <DollarSign size={20} />,
      label: "Quản lý Giá bán",
      roles: ["admin", "warehouse_manager"],
    },
    {
      path: "/profit-analysis",
      icon: <Activity size={20} />,
      label: "Hiệu quả Kinh doanh",
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
    <aside className="min-h-screen w-64 bg-gradient-to-b from-[#1068ec] to-[#51b2db] text-white flex flex-col shadow-xl overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-white/20">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-sm tracking-wide">
          PharmaSys
        </h1>
      </div>

      {/* THÔNG TIN TÀI KHOẢN */}
      <Link
        to="/profile"
        className="flex flex-col items-center py-6 border-b border-white/20 hover:bg-white/10 transition-colors cursor-pointer group"
        title="Xem thông tin cá nhân">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-[#0ea5e9] text-xl font-bold mb-3 shadow-lg shadow-black/10 overflow-hidden border-[3px] border-white bg-white group-hover:scale-105 transition-transform duration-300">
          {/* ẢNH ĐẠI DIỆN */}
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
        <p className="text-white font-bold text-center px-4">
          {user?.fullName}
        </p>
        <p className="text-xs text-sky-100 uppercase tracking-wider mt-1 font-bold">
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
                      bg-white/90
                      backdrop-blur-md
                      shadow-sm
                      text-[#0369a1]
                      border border-white/50
                      font-bold
                    `
                    : `
                      text-sky-50
                      hover:bg-white/20
                      hover:text-white
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
      <div className="p-4 border-t border-white/20">
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
            text-sky-50
            hover:bg-white/20
            hover:text-rose-200
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
