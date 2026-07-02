import React, { useState, useEffect } from "react";
import {
  Download,
  CheckCircle,
  Clock,
  PackageOpen,
  Loader2,
  Store,
  Package,
  Hash,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import api from "../../services/api";

const PendingImportPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions/pending-import");
      setTransactions(res.data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách chờ nhập:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleConfirm = async (id) => {
    if (
      window.confirm(
        "Kiểm tra hàng hóa thực tế đã khớp với phiếu. Bạn xác nhận đưa số hàng này vào tồn kho?",
      )
    ) {
      try {
        await api.put(`/transactions/${id}/confirm-import`);
        alert("Nhập kho thành công!");
        fetchPending();
      } catch (error) {
        alert("Lỗi: " + (error.response?.data?.message || error.message));
      }
    }
  };

  // Helper: Dịch lý do trả hàng
  const getReasonText = (reason) => {
    switch (reason) {
      case "OVERSTOCK":
        return "Bán chậm / Quá tồn";
      case "EXPIRED":
        return "Cận date / Hết hạn";
      case "DAMAGED":
        return "Hư hỏng / Lỗi NSX";
      default:
        return "---";
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "#f0f4f8",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(14,165,233,.4)",
            }}>
            <Loader2 size={26} color="white" className="animate-spin" />
          </div>
          <p style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "#f0f4f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        .pending-card {
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,.05);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pending-card:hover {
          border-color: #7dd3fc;
          box-shadow: 0 4px 18px rgba(14,165,233,.1);
        }

        .confirm-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(16,185,129,.35);
          transition: all 0.2s ease;
        }
        .confirm-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(16,185,129,.45);
        }
        .confirm-btn:active { transform: scale(0.97); }

        .detail-table thead th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 11px 18px;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .detail-table tbody tr {
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s;
        }
        .detail-table tbody tr:last-child { border-bottom: none; }
        .detail-table tbody tr:hover { background: #f0f9ff; }
        .detail-table tbody td { padding: 12px 18px; font-size: 13px; }
      `}</style>

      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 mb-7">
          <div
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              borderRadius: 14,
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(14,165,233,.35)",
              flexShrink: 0,
            }}>
            <Download size={22} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}>
              Phiếu Chờ Xác Nhận Nhận Hàng
            </h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {transactions.length > 0
                ? `${transactions.length} kiện hàng đang chờ xác nhận`
                : "Không có kiện hàng nào đang chờ"}
            </p>
          </div>
        </div>

        {/* ── Empty State ── */}
        {transactions.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1.5px dashed #cbd5e1",
              borderRadius: 20,
              padding: "72px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,.04)",
            }}>
            <div
              style={{
                width: 72,
                height: 72,
                background: "#f1f5f9",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
              <PackageOpen size={34} color="#cbd5e1" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8" }}>
              Không có kiện hàng nào đang chờ nhận
            </p>
            <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>
              Khi có luân chuyển hoặc trả hàng, phiếu sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {transactions.map((trans) => (
              <div key={trans._id} className="pending-card">
                {/* ── Card Header ── */}
                <div
                  style={{
                    padding: "16px 20px",
                    background:
                      trans.type === "RETURN_TO_WAREHOUSE"
                        ? "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" // Cam nhạt nếu là Phiếu trả hàng
                        : "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", // Xanh nếu là Phiếu luân chuyển
                    borderBottom: `1.5px solid ${trans.type === "RETURN_TO_WAREHOUSE" ? "#fed7aa" : "#bae6fd"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 14,
                  }}>
                  {/* Left: Meta info */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}>
                    {/* Mã phiếu & Nhãn phân loại */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          background:
                            trans.type === "RETURN_TO_WAREHOUSE"
                              ? "linear-gradient(135deg, #f97316, #ea580c)"
                              : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                          borderRadius: 8,
                          padding: "3px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}>
                        <Hash size={11} color="white" />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "white",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}>
                          Mã phiếu
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#0f172a",
                          letterSpacing: "0.04em",
                        }}>
                        {trans.code}
                      </span>

                      {/* BỔ SUNG: BADGE PHÂN LOẠI PHIẾU */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          background:
                            trans.type === "RETURN_TO_WAREHOUSE"
                              ? "white"
                              : "white",
                          color:
                            trans.type === "RETURN_TO_WAREHOUSE"
                              ? "#c2410c"
                              : "#0284c7",
                          border: `1px solid ${trans.type === "RETURN_TO_WAREHOUSE" ? "#fed7aa" : "#bae6fd"}`,
                        }}>
                        {trans.type === "RETURN_TO_WAREHOUSE"
                          ? "Phiếu Trả Hàng"
                          : "Phiếu Luân Chuyển"}
                      </span>
                    </div>

                    {/* Từ chi nhánh */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Store size={14} color="#64748b" />
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Từ:{" "}
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>
                          {trans.fromBranch?.name || "Kho Tổng"}
                        </span>
                      </span>
                    </div>

                    {/* Thời gian */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} color="#94a3b8" />
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {new Date(trans.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right: CTA button */}
                  <button
                    className="confirm-btn"
                    onClick={() => handleConfirm(trans._id)}>
                    <CheckCircle size={18} />
                    Xác Nhận Nhận Hàng
                  </button>
                </div>

                {/* ── Detail Table ── */}
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="detail-table"
                    style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center", width: 48 }}>STT</th>
                        <th>Mã SKU</th>
                        <th>Tên hàng hóa (Quy cách)</th>
                        <th>Mã Lô / HSD</th>
                        {/* HIỆN CỘT LÝ DO NẾU LÀ PHIẾU TRẢ HÀNG */}
                        {trans.type === "RETURN_TO_WAREHOUSE" && (
                          <th>Lý do trả hàng</th>
                        )}
                        <th style={{ textAlign: "right" }}>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trans.details.map((detail, idx) => (
                        <tr key={idx}>
                          {/* STT */}
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                background: "#f1f5f9",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#94a3b8",
                              }}>
                              {idx + 1}
                            </span>
                          </td>

                          {/* SKU */}
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "#64748b",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                padding: "2px 8px",
                              }}>
                              {detail.variantId?.sku}
                            </span>
                          </td>

                          {/* Tên thuốc */}
                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 7,
                              }}>
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  background: "#e0f2fe",
                                  borderRadius: 8,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}>
                                <Package size={14} color="#0284c7" />
                              </div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  fontSize: 13,
                                }}>
                                {detail.variantId?.name}
                              </span>
                            </div>
                          </td>

                          {/* Lô & HSD */}
                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  fontSize: 13,
                                }}>
                                {detail.batchCode}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                }}>
                                <CalendarDays size={11} color="#94a3b8" />
                                <span
                                  style={{ fontSize: 11, color: "#94a3b8" }}>
                                  HSD:{" "}
                                  {new Date(
                                    detail.expiryDate,
                                  ).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* BỔ SUNG: CỘT LÝ DO TRẢ HÀNG */}
                          {trans.type === "RETURN_TO_WAREHOUSE" && (
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color:
                                    detail.reason === "DAMAGED"
                                      ? "#b91c1c" // Đỏ
                                      : detail.reason === "EXPIRED"
                                        ? "#c2410c" // Cam
                                        : "#0f172a", // Đen nhạt
                                  background:
                                    detail.reason === "DAMAGED"
                                      ? "#fee2e2"
                                      : detail.reason === "EXPIRED"
                                        ? "#ffedd5"
                                        : "#f1f5f9",
                                  border: `1px solid ${
                                    detail.reason === "DAMAGED"
                                      ? "#fecaca"
                                      : detail.reason === "EXPIRED"
                                        ? "#fed7aa"
                                        : "#e2e8f0"
                                  }`,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  whiteSpace: "nowrap",
                                }}>
                                {getReasonText(detail.reason)}
                              </span>
                            </td>
                          )}

                          {/* Số lượng */}
                          <td style={{ textAlign: "right" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "baseline",
                                gap: 4,
                                background: "#f0f9ff",
                                border: "1.5px solid #bae6fd",
                                borderRadius: 10,
                                padding: "4px 12px",
                              }}>
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color: "#0284c7",
                                }}>
                                {detail.quantity}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#64748b",
                                }}>
                                {detail.variantId?.unit}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Card Footer ── */}
                <div
                  style={{
                    padding: "10px 20px",
                    background: "#f8fafc",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}>
                  <span
                    style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                    {trans.details.length} mặt hàng trong phiếu
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingImportPage;
