import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Cổng server của bạn
  headers: {
    "Content-Type": "application/json",
  },
});

// Gắn token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    return error.response.data;
  },
);

// --- Auth & Users ---
export const login = (data) => api.post("/auth/login", data);
export const fetchUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// --- Categories ---
export const fetchCategories = () => api.get("/categories");
export const createCategory = (data) => api.post("/categories", data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// --- Medicines ---
export const fetchMedicines = () => api.get("/medicines");
export const createMedicine = (data) => api.post("/medicines", data);
export const updateMedicine = (id, data) => api.put(`/medicines/${id}`, data);
export const deleteMedicine = (id) => api.delete(`/medicines/${id}`);

// --- Transactions (POS & Import) ---
export const fetchTransactions = (params) =>
  api.get("/transactions", { params });
export const createTransaction = (data) => api.post("/transactions", data);

// --- Branches ---
export const getBranchById = (id) => api.get(`/branches/${id}`);

// --- Reports ---
export const fetchRevenueReport = (params) =>
  api.get("/reports/revenue", { params });
export const fetchTopMedicines = () => api.get("/reports/top-medicines");
// Báo cáo & Dashboard
export const fetchDashboardStats = (params) =>
  api.get("/reports/dashboard", { params });

export default api;
