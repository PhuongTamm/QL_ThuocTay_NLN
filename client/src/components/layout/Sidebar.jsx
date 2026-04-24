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

  // Định nghĩa mảng menu có kèm phân quyền (roles)
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

    // Quản lý Dữ liệu
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

    // Quản lý Kho bãi
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

    // Hệ thống
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

  // LỌC MENU: Chỉ giữ lại những item mà role của user nằm trong mảng roles của item đó
  const visibleMenu = menuItems.filter((item) => {
    if (!user || !user.role) return false;
    return item.roles.includes(user.role);
  });

  return (
    <div className="min-h-screen w-64 bg-gray-900 text-white flex flex-col overflow-y-auto">
      <div className="p-6 text-2xl font-bold text-[#0ea5e9]">PharmaApp</div>

      <div className="px-6 pb-4 border-b border-gray-800 mb-4">
        <p className="font-bold text-gray-200">{user?.fullName}</p>
        <p className="text-xs text-[#0ea5e9] uppercase tracking-wider">
          {user?.role === "admin"
            ? "Quản trị viên"
            : user?.role === "warehouse_manager"
              ? "Quản lý kho"
              : user?.role === "branch_manager"
                ? "Quản lý chi nhánh"
                : "Dược sĩ"}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {/* Render danh sách menu ĐÃ ĐƯỢC LỌC */}
        {visibleMenu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path
                ? "bg-[#0ea5e9] text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}>
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => {
            if (window.confirm("Đăng xuất?")) logout();
          }}
          className="flex items-center gap-3 text-red-400 hover:bg-gray-800 hover:text-red-300 w-full px-4 py-3 rounded-lg transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
