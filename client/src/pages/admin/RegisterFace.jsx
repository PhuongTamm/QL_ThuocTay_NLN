import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";
import api from "../../services/api";

const RegisterFace = ({ userId, onSuccess, onCancel }) => {
  const webcamRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({
    type: "idle",
    message: "Đang tải AI...",
  });

  // Tải mô hình
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models"; // Trỏ đúng vào thư mục public/models
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setStatus({
          type: "idle",
          message: "Sẵn sàng! Hãy nhìn thẳng vào camera.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: "Lỗi tải mô hình AI. Kiểm tra lại thư mục public/models.",
        });
      }
    };
    loadModels();
  }, []);

  // Chụp và trích xuất dữ liệu khuôn mặt
  const handleCaptureAndRegister = async () => {
    if (!webcamRef.current || !isModelLoaded) return;

    setIsProcessing(true);
    setStatus({
      type: "idle",
      message: "Đang phân tích và trích xuất dữ liệu...",
    });

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Không lấy được hình ảnh từ Camera");

      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));

      // Quét khuôn mặt
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error(
          "Không tìm thấy khuôn mặt! Đảm bảo đủ sáng và nhìn thẳng.",
        );
      }

      // Lấy mảng 128 số đặc trưng
      const descriptor = Array.from(detection.descriptor);

      // Gọi API đăng ký 
      await api.post("/attendance/register-face", {
        userId: userId,
        descriptor: descriptor,
      });

      setStatus({ type: "success", message: "Đăng ký khuôn mặt thành công!" });
      setTimeout(() => {
        if (onSuccess) onSuccess(); // Đóng modal/load lại danh sách
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Có lỗi xảy ra khi phân tích.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full mx-auto text-center border border-sky-100">
      <h3 className="text-xl font-bold text-slate-800 mb-2">
        Đăng ký khuôn mặt
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        Dữ liệu dùng để chấm công bằng FaceID
      </p>

      {/* Camera View */}
      <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-sky-100 shadow-inner bg-slate-100 mb-6">
        {!isModelLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-500">
            <Loader2 className="animate-spin mb-2" size={32} />
          </div>
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
            className="object-cover w-full h-full transform scale-x-[-1]"
          />
        )}
      </div>

      {/* Status Alert */}
      <div
        className={`p-3 rounded-xl mb-6 text-sm font-bold flex items-center justify-center gap-2 ${
          status.type === "success"
            ? "bg-emerald-50 text-emerald-600"
            : status.type === "error"
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-50 text-slate-500"
        }`}>
        {status.type === "success" && <CheckCircle size={18} />}
        {status.type === "error" && <AlertCircle size={18} />}
        {status.message}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">
          Hủy bỏ
        </button>
        <button
          onClick={handleCaptureAndRegister}
          disabled={!isModelLoaded || isProcessing}
          className="px-6 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-sky-500 to-cyan-500 hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
          {isProcessing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Camera size={18} />
          )}
          Chụp và Lưu
        </button>
      </div>
    </div>
  );
};

export default RegisterFace;
