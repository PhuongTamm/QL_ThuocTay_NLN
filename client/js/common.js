// CẤU HÌNH API URL (Đổi port nếu backend của bạn khác)
const API_BASE_URL = "http://localhost:5000/api";

// 1. Hàm gọi API chuẩn (Tự động gắn Token)
async function fetchAPI(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    // Hiển thị loading (nếu có element)
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "flex";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (loader) loader.style.display = "none";

    // Xử lý hết hạn token (401)
    if (response.status === 401 || response.status === 403) {
      alert("Phiên đăng nhập hết hạn hoặc không có quyền.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    alert("Không thể kết nối đến máy chủ.");
    return null;
  }
}

// 2. Kiểm tra quyền truy cập trang
function checkAuth(allowedRoles = []) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userStr);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert("Bạn không có quyền truy cập trang này!");
    // Redirect về trang đúng với role
    redirectUser(user.role);
  }

  // Hiển thị tên user lên giao diện nếu có element
  const userNameEl = document.getElementById("currentUserName");
  if (userNameEl) userNameEl.textContent = user.fullName;
}

// 3. Điều hướng user
function redirectUser(role) {
  switch (role) {
    case "admin":
    case "warehouse_manager":
      window.location.href = "warehouse.html";
      break;
    case "branch_manager":
      window.location.href = "branch_manager.html";
      break;
    case "pharmacist":
      window.location.href = "pharmacist.html"; // (Bạn có thể tạo thêm file này sau)
      break;
    default:
      alert("Vai trò không hợp lệ");
  }
}

// 4. Format tiền tệ VND
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}
