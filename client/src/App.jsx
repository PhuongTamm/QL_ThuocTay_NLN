import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import AIChatbot from "./components/Chatbot/AIChatbot";

import LoginPage from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";

import CategoryList from "./pages/categories/CategoryList";
import MedicineList from "./pages/medicines/MedicineList";
import AddMedicine from "./pages/medicines/AddMedicine";

import InventoryPage from "./pages/inventory/InventoryPage";
import ImportSupplier from "./pages/warehouse/ImportSupplier";
import DistributePage from "./pages/warehouse/DistributePage";
import PendingImportPage from "./pages/warehouse/PendingImportPage";

import POSPage from "./pages/pos/POSPage";

import FaceCheckIn from "./pages/attendance/FaceCheckIn";

import BranchUserManagement from "./pages/admin/BranchUserManagement"; // Trang gộp 2 Tabs

import TransactionHistoryPage from "./pages/transactions/TransactionHistoryPage";
import MonthlyReportPage from "./pages/reports/MonthlyReportPage";
import ProfilePage from "./pages/profile/ProfilePage";
import PriceManagement from "./pages/priceManagement/PriceManagement";
import ProfitAnalysis from "./pages/reports/ProfitAnalysis";

// Layout bọc các trang cần đăng nhập
const MainLayout = ({ children }) => (
  <div className="flex h-screen overflow-hidden relative">
    <Sidebar />
    <div className="flex-1 bg-gray-50 h-full overflow-y-auto">{children}</div>
    <AIChatbot />
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
          {/* PUBLIC ROUTE */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/check-in" element={<FaceCheckIn />} />

          {/* PRIVATE ROUTES (CÓ SIDEBAR) */}
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

          {/* POS BÁN THUỐC: Admin, Quản lý chi nhánh, Dược sĩ */}
          <Route
            path="/pos"
            element={
              <PrivateRoute allowedRoles={["branch_manager", "pharmacist"]}>
                <MainLayout>
                  <POSPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* QUẢN LÝ NHÓM THUỐC & THUỐC: Chỉ Admin và Quản lý kho */}
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

          {/* QUẢN LÝ KHO */}
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
              <PrivateRoute
                allowedRoles={["admin", "warehouse_manager", "branch_manager"]}>
                <MainLayout>
                  <DistributePage />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/monthly-reports"
            element={
              <PrivateRoute
                allowedRoles={["admin", "warehouse_manager", "branch_manager"]}>
                <MainLayout>
                  <MonthlyReportPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* CHI NHÁNH XÁC NHẬN NHẬN HÀNG: Admin, Quản lý CN, Quản lý kho */}
          <Route
            path="/pending-imports"
            element={
              <PrivateRoute
                allowedRoles={[
                  "admin",
                  "branch_manager",
                  "warehouse_manager",
                ]}>
                <MainLayout>
                  <PendingImportPage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute
                allowedRoles={[
                  "admin",
                  "warehouse_manager",
                  "branch_manager",
                  "pharmacist",
                ]}>
                <MainLayout>
                  <ProfilePage />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* BÁO CÁO */}
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
            path="/price-management"
            element={
              <PrivateRoute>
                <MainLayout>
                  <PriceManagement />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/profit-analysis"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ProfitAnalysis />
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
