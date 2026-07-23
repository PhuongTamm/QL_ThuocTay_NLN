import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ScanFace,
  Scan,
} from "lucide-react";
import api from "../../services/api"; // Đảm bảo đúng đường dẫn api.js của bạn

const FaceCheckIn = () => {
  const webcamRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({
    type: "idle",
    message: "Đang chờ quét khuôn mặt...",
  }); // idle, success, error

  // 1. Tải Model khi vào trang
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models"; // Đảm bảo bạn đã copy file vào thư mục public/models
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setStatus({
          type: "idle",
          message: "Hệ thống sẵn sàng. Vui lòng nhìn thẳng vào camera.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: "Lỗi tải mô hình AI. Vui lòng kiểm tra lại!",
        });
      }
    };
    loadModels();
  }, []);

  // 2. Hàm xử lý chụp và trích xuất khuôn mặt
  const handleCheckIn = async () => {
    if (!webcamRef.current || !isModelLoaded) return;

    setIsProcessing(true);
    setStatus({ type: "idle", message: "Đang phân tích khuôn mặt..." });

    try {
      // 1. Chụp ảnh từ webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Không lấy được ảnh từ Camera");

      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));

      // 2. AI Phân tích khuôn mặt
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error(
          "Không tìm thấy khuôn mặt! Vui lòng nhìn thẳng, không đeo khẩu trang và thử lại ở nơi đủ sáng.",
        );
      }

      const descriptor = Array.from(detection.descriptor);

      // 3. Gửi lên Backend
      const res = await api.post("/attendance/check-in", { descriptor });

      // SỬA LỖI Ở ĐÂY: Xử lý cách trả dữ liệu của interceptor trong api.js
      // Nếu backend báo lỗi (success: false), res chính là object lỗi đó.
      if (res && res.success === false) {
        throw new Error(res.message);
      }

      // Nếu thành công, lấy data (đề phòng res là Axios Response)
      const responseData = res.data || res;

      setStatus({
        type: "success",
        message: responseData.message || "Thao tác thành công!",
      });

      // Reset sau 3 giây
      setTimeout(() => {
        setStatus({
          type: "idle",
          message: "Hệ thống sẵn sàng. Vui lòng nhìn thẳng vào camera.",
        });
      }, 3000);
    } catch (error) {
      console.error(error);
      // Bắt mọi lỗi: Lỗi AI không thấy mặt, lỗi Backend trả về người lạ
      setStatus({
        type: "error",
        message:
          error.message || error.response?.data?.message || "Lỗi xác thực.",
      });

      setTimeout(() => {
        setStatus({
          type: "idle",
          message: "Hệ thống sẵn sàng. Vui lòng nhìn thẳng vào camera.",
        });
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />

      <div className="max-w-xl w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-sky-100 overflow-hidden relative z-10 p-8 flex flex-col items-center text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-sky-500/30">
          <ScanFace size={36} className="text-white" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Máy Chấm Công FaceID
        </h2>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-8">
          Chi nhánh Trung tâm - MediCore Pharmacy
        </p>

        {/* Khung Camera */}
        <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-sky-200 shadow-inner bg-slate-100 mb-8 flex items-center justify-center">
          {!isModelLoaded ? (
            <div className="flex flex-col items-center gap-2 text-sky-600">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-sm font-bold">Đang khởi động AI...</span>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 400,
                  height: 400,
                  facingMode: "user",
                }}
                className="object-cover w-full h-full transform scale-x-[-1]" // Lật gương
              />
              {/* Hiệu ứng tia quét */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/40 to-transparent w-full h-1/2 animate-[scan_2s_ease-in-out_infinite]" />
            </>
          )}
        </div>

        {/* Trạng thái thông báo */}
        <div
          className={`w-full p-4 rounded-xl flex items-center justify-center gap-2 mb-6 font-bold text-sm transition-all ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : status.type === "error"
                ? "bg-rose-50 text-rose-600 border border-rose-100"
                : "bg-slate-50 text-slate-500 border border-slate-100"
          }`}>
          {status.type === "success" && <CheckCircle size={18} />}
          {status.type === "error" && <AlertCircle size={18} />}
          {status.type === "idle" && <Scan size={18} />}
          {status.message}
        </div>

        {/* Nút bấm check-in thủ công */}
        <button
          onClick={handleCheckIn}
          disabled={!isModelLoaded || isProcessing}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-sky-500/30 flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none transition-all">
          {isProcessing ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            "Nhận Diện Chấm Công"
          )}
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
      `}</style>
    </div>
  );
};

export default FaceCheckIn;
