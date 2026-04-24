import React, { useState, useRef, useEffect } from "react";
import api from "../../services/api";
import MarkdownFormatter from "../Markdown/MarkdownFormatter";

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Xin chào! Tôi là trợ lý AI nhà thuốc. Bạn cần tra cứu tồn kho, giá cả hay hết hạn gì hôm nay?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- STATE VÀ REF CHO CHỨC NĂNG KÉO THẢ ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartInfo = useRef({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
  });
  const hasDragged = useRef(false);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartInfo.current.startX;
    const dy = e.clientY - dragStartInfo.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }
    setPosition({
      x: dragStartInfo.current.initialPosX + dx,
      y: dragStartInfo.current.initialPosY + dy,
    });
  };

  const onMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const res = await api.post("/chatbot", {
        message: userMessage.text,
        history: messages.slice(1).map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages([...newMessages, { role: "bot", text: res.data.text }]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "bot",
          text: "❌ Xin lỗi, hệ thống AI đang bảo trì hoặc mất kết nối.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging.current ? "none" : "transform 0.05s ease-out",
      }}>
      {/* Nút mở Chatbot */}
      {!isOpen && (
        <button
          onMouseDown={onMouseDown}
          onClick={(e) => {
            if (hasDragged.current) {
              e.preventDefault();
              return;
            }
            setIsOpen(true);
          }}
          title="Kéo để di chuyển"
          className="group relative cursor-move"
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            border: "none",
            boxShadow: "0 4px 20px rgba(2, 132, 199, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
            e.currentTarget.style.boxShadow =
              "0 6px 28px rgba(2, 132, 199, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow =
              "0 4px 20px rgba(2, 132, 199, 0.45)";
          }}>
          {/* Pulse ring */}
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid rgba(14, 165, 233, 0.4)",
              animation: "pulse-ring 2s ease-out infinite",
            }}
          />
          {/* Cross / pharmacy icon */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {/* Dot badge */}
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid white",
            }}
          />
        </button>
      )}

      {/* Cửa sổ Chat */}
      {isOpen && (
        <div
          style={{
            width: 360,
            height: 520,
            borderRadius: 20,
            background: "#fff",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(14, 165, 233, 0.15)",
            animation: "slideUp 0.22s ease-out",
          }}>
          {/* Header */}
          <div
            onMouseDown={onMouseDown}
            title="Kéo để di chuyển"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "move",
              userSelect: "none",
              flexShrink: 0,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(4px)",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z" />
                  <path d="M10 9h4M12 7v4" />
                  <path d="M3 20a9 9 0 0 1 18 0" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontWeight: 600,
                    fontSize: 15,
                    lineHeight: 1.2,
                  }}>
                  Trợ lý Nhà thuốc
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#86efac",
                      display: "inline-block",
                    }}
                  />
                  Đang hoạt động
                </p>
              </div>
            </div>
            {/* Close button */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.28)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#f8fafc",
            }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 8,
                }}>
                {/* Bot avatar dot */}
                {msg.role === "bot" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 2,
                    }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zM10 9h4M12 7v4" />
                    </svg>
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "76%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #0ea5e9, #0369a1)"
                        : "#ffffff",
                    color: msg.role === "user" ? "white" : "#1e293b",
                    fontSize: 14,
                    lineHeight: 1.55,
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(2,132,199,0.3)"
                        : "0 1px 4px rgba(0,0,0,0.08)",
                    border:
                      msg.role === "bot"
                        ? "1px solid rgba(14,165,233,0.12)"
                        : "none",
                    wordBreak: "break-word",
                  }}>
                  <MarkdownFormatter value={msg.text} />
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zM10 9h4M12 7v4" />
                  </svg>
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "18px 18px 18px 4px",
                    background: "#ffffff",
                    border: "1px solid rgba(14,165,233,0.12)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                  }}>
                  {[0, 0.18, 0.36].map((delay, i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#94a3b8",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "12px 14px",
              background: "#ffffff",
              borderTop: "1px solid rgba(14,165,233,0.12)",
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexShrink: 0,
            }}>
            <input
              type="text"
              style={{
                flex: 1,
                background: "#f1f5f9",
                border: "1.5px solid transparent",
                borderRadius: 24,
                padding: "9px 16px",
                fontSize: 14,
                color: "#1e293b",
                outline: "none",
                transition: "border-color 0.15s, background 0.15s",
              }}
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={(e) => {
                e.target.style.background = "#fff";
                e.target.style.borderColor = "#0ea5e9";
              }}
              onBlur={(e) => {
                e.target.style.background = "#f1f5f9";
                e.target.style.borderColor = "transparent";
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background:
                  isLoading || !input.trim()
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #0ea5e9, #0369a1)",
                border: "none",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s, transform 0.15s",
                boxShadow:
                  isLoading || !input.trim()
                    ? "none"
                    : "0 2px 8px rgba(2,132,199,0.35)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim())
                  e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default AIChatbot;
