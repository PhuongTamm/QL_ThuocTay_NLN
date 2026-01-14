let medicines = [];
let branches = [];
let importQueue = [];
let distributeQueue = [];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Check quyền
  checkAuth(["admin", "warehouse_manager"]);

  // 2. Load dữ liệu ban đầu
  loadMedicines();
  loadBranches();
});

// === LOGIC TAB & LOGOUT ===
function switchTab(tabId) {
  document
    .querySelectorAll(".nav-link")
    .forEach((el) => el.classList.remove("active"));
  event.currentTarget.classList.add("active");

  document
    .querySelectorAll(".content-tab")
    .forEach((el) => el.classList.add("d-none"));
  document.getElementById(`tab-${tabId}`).classList.remove("d-none");
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// === LOGIC THUỐC ===
async function loadMedicines() {
  const res = await fetchAPI("/medicines");
  if (res && res.success) {
    medicines = res.data;
    renderMedicineTable();
    renderMedicineSelects(); // Cập nhật dropdown ở Tab Nhập/Xuất
  }
}

function renderMedicineTable() {
  const tbody = document.getElementById("medicineTableBody");
  tbody.innerHTML = medicines
    .map(
      (m) => `
        <tr>
            <td>${m.code}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.unit}</td>
            <td>${formatCurrency(m.price)}</td>
            <td>${m.manufacturer || "-"}</td>
        </tr>
    `
    )
    .join("");
}

function renderMedicineSelects() {
  const options = medicines
    .map((m) => `<option value="${m._id}">${m.code} - ${m.name}</option>`)
    .join("");
  document.getElementById("inpImportMed").innerHTML = options;
  document.getElementById("inpDistMed").innerHTML = options;
}

async function createNewMedicine() {
  const body = {
    code: document.getElementById("newMedCode").value,
    name: document.getElementById("newMedName").value,
    unit: document.getElementById("newMedUnit").value,
    price: document.getElementById("newMedPrice").value,
    manufacturer: document.getElementById("newMedManuf").value,
  };

  const res = await fetchAPI("/medicines", "POST", body);
  if (res && res.success) {
    alert("Thêm thành công!");
    location.reload(); // Reload để cập nhật
  } else {
    alert("Lỗi: " + res?.message);
  }
}

// === LOGIC NHẬP KHO TỪ NCC ===
function addToImportList() {
  const medId = document.getElementById("inpImportMed").value;
  const batch = document.getElementById("inpImportBatch").value;
  const qty = document.getElementById("inpImportQty").value;
  const price = document.getElementById("inpImportPrice").value;
  const mfg = document.getElementById("inpImportMfg").value;
  const exp = document.getElementById("inpImportExp").value;

  // Validate
  if (!batch || !qty || !price || !mfg || !exp)
    return alert("Vui lòng nhập đủ thông tin!");
  if (new Date(exp) <= new Date(mfg))
    return alert("Hạn sử dụng phải sau ngày sản xuất!");

  const med = medicines.find((m) => m._id === medId);

  importQueue.push({
    medicineId: medId,
    medicineName: med.name,
    batchCode: batch,
    quantity: parseInt(qty),
    price: parseInt(price),
    manufacturingDate: mfg,
    expiryDate: exp,
  });

  renderImportQueue();
}

function renderImportQueue() {
  document.getElementById("importListBody").innerHTML = importQueue
    .map(
      (item, idx) => `
        <tr>
            <td>${item.medicineName}</td>
            <td>${item.batchCode}</td>
            <td>${item.manufacturingDate} -> ${item.expiryDate}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="importQueue.splice(${idx}, 1); renderImportQueue()">X</button></td>
        </tr>
    `
    )
    .join("");
}

async function submitImportFromSupplier() {
  if (importQueue.length === 0) return alert("Danh sách trống!");

  const res = await fetchAPI("/transactions/import-supplier", "POST", {
    items: importQueue,
  });
  if (res && res.success) {
    alert("Nhập kho thành công!");
    importQueue = [];
    renderImportQueue();
  } else {
    alert("Lỗi: " + res?.message);
  }
}

// === LOGIC PHÂN PHỐI (XUẤT KHO) ===
async function loadBranches() {
  // API lấy danh sách chi nhánh (Bạn cần viết API này ở Backend nếu chưa có)
  // Tạm thời giả lập hoặc gọi nếu đã có endpoint
  // const res = await fetchAPI('/branches'); ...
  // Ở đây tôi mock data để demo frontend
  branches = [
    { _id: "br001", name: "Chi nhánh Cần Thơ" }, // ID này phải là ObjectID thật từ DB
    { _id: "br002", name: "Chi nhánh Sài Gòn" },
  ];

  // Nếu bạn có API: GET /api/branches thì dùng dòng dưới
  const res = await fetchAPI("/branches");
  if (res && res.success) branches = res.data.filter((b) => b.type === "store");

  document.getElementById("inpDistBranch").innerHTML = branches
    .map((b) => `<option value="${b._id}">${b.name}</option>`)
    .join("");
}

function addToDistList() {
  const branchId = document.getElementById("inpDistBranch").value;
  const medId = document.getElementById("inpDistMed").value;
  const qty = document.getElementById("inpDistQty").value;

  const branchName = branches.find((b) => b._id === branchId)?.name;
  const medName = medicines.find((m) => m._id === medId)?.name;

  distributeQueue.push({
    branchId,
    branchName,
    medicineId: medId,
    medicineName: medName,
    quantity: parseInt(qty),
  });

  document.getElementById("distListBody").innerHTML = distributeQueue
    .map(
      (item, idx) => `
        <tr>
            <td>${item.branchName}</td>
            <td>${item.medicineName}</td>
            <td>${item.quantity}</td>
            <td><button class="btn btn-sm btn-danger" onclick="distributeQueue.splice(${idx}, 1); addToDistList()">X</button></td>
        </tr>
    `
    )
    .join("");
}

async function submitDistribution() {
  if (distributeQueue.length === 0) return alert("Trống!");

  // Backend đang xử lý từng chi nhánh một trong API mẫu trước đó
  // Nên ta cần gom nhóm theo BranchId hoặc gọi API nhiều lần.
  // Để đơn giản, giả sử chỉ xuất cho 1 chi nhánh 1 lúc:

  const firstBranch = distributeQueue[0].branchId;
  if (distributeQueue.some((i) => i.branchId !== firstBranch)) {
    return alert("Vui lòng tạo phiếu xuất cho từng chi nhánh một!");
  }

  const payload = {
    toBranchId: firstBranch,
    items: distributeQueue.map((i) => ({
      medicineId: i.medicineId,
      quantity: i.quantity,
    })),
  };

  const res = await fetchAPI("/transactions/distribute", "POST", payload);
  if (res && res.success) {
    alert("Tạo phiếu xuất thành công! Chi nhánh cần xác nhận để nhận hàng.");
    distributeQueue = [];
    document.getElementById("distListBody").innerHTML = "";
  } else {
    alert("Lỗi: " + res?.message);
  }
}
