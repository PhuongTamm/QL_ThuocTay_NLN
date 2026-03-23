import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";

// --- IMPORT CÁC TRANG (PAGES) ---
import LoginPage from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";

// Quản lý Dữ liệu
import CategoryList from "./pages/categories/CategoryList";
import MedicineList from "./pages/medicines/MedicineList";
import AddMedicine from "./pages/medicines/AddMedicine";

// Quản lý Kho bãi & Giao dịch
import InventoryPage from "./pages/inventory/InventoryPage";
import ImportSupplier from "./pages/warehouse/ImportSupplier";
import DistributePage from "./pages/warehouse/DistributePage";
import PendingImportPage from "./pages/warehouse/PendingImportPage";

// POS Bán Hàng
import POSPage from "./pages/pos/POSPage";

// Hệ thống & Báo cáo
import BranchUserManagement from "./pages/admin/BranchUserManagement"; // Trang gộp 2 Tabs
import ReportPage from "./pages/reports/ReportPage";

// (Giữ lại các file cũ nếu bạn cần tham khảo thêm, nhưng trên menu sẽ không gọi đến)
import TransactionDetail from "./pages/transactions/TransactionDetail";
import TransactionList from "./pages/transactions/TransactionList";
import TransactionHistoryPage from "./pages/transactions/TransactionHistoryPage";

// Layout bọc các trang cần đăng nhập
const MainLayout = ({ children }) => (
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <div className="flex-1 bg-gray-50 h-full overflow-y-auto">{children}</div>
  </div>
);

// Component bảo vệ route
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-blue-600 font-bold">
        Đang tải hệ thống...
      </div>
    );

  // 1. Chưa đăng nhập -> Đuổi ra trang Login
  if (!isAuthenticated) return <Navigate to="/login" />;

  // 2. Đã đăng nhập nhưng Role không nằm trong danh sách cho phép -> Báo lỗi 403 hoặc đẩy về trang mặc định
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    alert("Bạn không có quyền truy cập trang này!");
    // Dược sĩ mặc định đẩy về POS, các role khác đẩy về Dashboard
    return <Navigate to={user.role === "pharmacist" ? "/pos" : "/"} />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSlatPath: true,
          v7_relativeSplatPath: true,
        }}>
        <Routes>
          {/* --- PUBLIC ROUTE --- */}
          <Route path="/login" element={<LoginPage />} />

          {/* --- PRIVATE ROUTES (CÓ SIDEBAR) --- */}
          {/* DASHBOARD: Admin, Quản lý kho, Quản lý chi nhánh */}
          <Route
            path="/"
            element={
              <PrivateRoute
                allowedRoles={["admin", "warehouse_manager", "branch_manager"]}>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* POS BÁN HÀNG: Admin, Quản lý chi nhánh, Dược sĩ */}
          <Route
            path="/pos"
            element={
              <PrivateRoute
                allowedRoles={["admin", "branch_manager", "pharmacist"]}>
                <MainLayout>
                  <POSPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* QUẢN LÝ DANH MỤC & THUỐC: Chỉ Admin và Quản lý kho */}
          <Route
            path="/categories"
            element={
              <PrivateRoute allowedRoles={["admin", "warehouse_manager"]}>
                <MainLayout>
                  <CategoryList />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/medicines"
            element={
              <PrivateRoute allowedRoles={["admin", "warehouse_manager"]}>
                <MainLayout>
                  <MedicineList />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* QUẢN LÝ KHO BÃI */}
          <Route
            path="/inventory"
            element={
              <PrivateRoute
                allowedRoles={[
                  "admin",
                  "warehouse_manager",
                  "branch_manager",
                  "pharmacist",
                ]}>
                <MainLayout>
                  <InventoryPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* NHẬP HÀNG & PHÂN PHỐI TỪ KHO TỔNG: Chỉ Admin & Quản lý kho */}
          <Route
            path="/import-supplier"
            element={
              <PrivateRoute allowedRoles={["admin", "warehouse_manager"]}>
                <MainLayout>
                  <ImportSupplier />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/distribute"
            element={
              <PrivateRoute allowedRoles={["admin", "warehouse_manager"]}>
                <MainLayout>
                  <DistributePage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* CHI NHÁNH XÁC NHẬN NHẬN HÀNG: Admin, Quản lý CN, Dược sĩ */}
          <Route
            path="/pending-imports"
            element={
              <PrivateRoute
                allowedRoles={["admin", "branch_manager", "pharmacist"]}>
                <MainLayout>
                  <PendingImportPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* HỆ THỐNG & BÁO CÁO */}
          <Route
            path="/organization"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <MainLayout>
                  <BranchUserManagement />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute allowedRoles={["admin", "branch_manager"]}>
                <MainLayout>
                  <ReportPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/medicines/new"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <MainLayout>
                  <AddMedicine />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/history-imports"
            element={
              <PrivateRoute>
                <MainLayout>
                  <TransactionHistoryPage />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/pending-imports"
            element={
              <PrivateRoute>
                <MainLayout>
                  <PendingImportPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* Các route lịch sử giao dịch (Dùng để xem chi tiết khi click vào báo cáo) */}
          <Route
            path="/transactions"
            element={
              <PrivateRoute>
                <MainLayout>
                  <TransactionList />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <TransactionDetail />
                </MainLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
