const User = require("../models/User");
const Attendance = require("../models/Attendance");

// Hàm tính khoảng cách Euclidean giữa 2 mảng 128 chiều
const euclideanDistance = (desc1, desc2) => {
  // Thêm check !desc1 và !desc2 để tránh lỗi undefined
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return 999;
  
  return Math.sqrt(
    desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0),
  );
};

// Ngưỡng sai số (Càng nhỏ càng khắt khe, 0.45 - 0.5 là chuẩn cho face-api)
const FACE_MATCHER_THRESHOLD = 0.45;

const COOLDOWN_MINUTES = 0.5;

exports.checkInWithFace = async (req, res) => {
  try {
    const { descriptor, branchId } = req.body;

    if (!descriptor || descriptor.length !== 128) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu khuôn mặt không hợp lệ." });
    }

    const usersWithFaces = await User.find({
      faceDescriptor: { $exists: true, $type: "array", $not: { $size: 0 } },
    }).lean();

    if (usersWithFaces.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Chưa có nhân viên đăng ký Face ID.",
        });
    }

    let bestMatch = { user: null, distance: 999 };
    for (const user of usersWithFaces) {
      if (!user.faceDescriptor) continue;
      const distance = euclideanDistance(descriptor, user.faceDescriptor);
      if (distance < bestMatch.distance) {
        bestMatch = { user, distance };
      }
    }

    if (bestMatch.distance > FACE_MATCHER_THRESHOLD || !bestMatch.user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Không nhận diện được khuôn mặt. Vui lòng thử lại!",
        });
    }

    const matchedUser = bestMatch.user;
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    let attendance = await Attendance.findOne({
      userId: matchedUser._id,
      date: dateStr,
    });

    // CHƯA CHẤM CÔNG LẦN NÀO TRONG NGÀY
    if (!attendance) {
      attendance = await Attendance.create({
        userId: matchedUser._id,
        branchId: matchedUser.branchId || branchId,
        date: dateStr,
        scanTimes: [today], // Đưa lần quét đầu tiên vào mảng
      });
      return res.status(200).json({
        success: true,
        message: `Xin chào ${matchedUser.fullName}. Check-in ca đầu tiên thành công!`,
      });
    }

    // ĐÃ CÓ DATA HÔM NAY -> KIỂM TRA COOLDOWN
    const lastScanTime = attendance.scanTimes[attendance.scanTimes.length - 1];
    const diffMinutes = (today - lastScanTime) / (1000 * 60);

    // Nếu vừa mới quét mặt chưa qua 10 phút, chặn lại báo lỗi
    if (diffMinutes < COOLDOWN_MINUTES) {
      return res.status(400).json({
        success: false,
        message: `Bạn vừa chấm công cách đây ${Math.floor(diffMinutes)} phút. Vui lòng không quét liên tục!`,
      });
    }

    // Đã qua thời gian Cooldown -> Cho phép ghi nhận
    attendance.scanTimes.push(today);
    await attendance.save();

    // XÁC ĐỊNH LÀ IN HAY OUT ĐỂ HIỂN THỊ THÔNG BÁO CHO ĐÚNG
    const isCheckIn = attendance.scanTimes.length % 2 !== 0; // Lẻ là Check-in, Chẵn là Check-out

    if (isCheckIn) {
      return res.status(200).json({
        success: true,
        message: `Xin chào ${matchedUser.fullName}. Ghi nhận Check-in vào ca!`,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: `Tạm biệt ${matchedUser.fullName}. Đã ghi nhận Check-out!`,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API dùng cho Admin/Nhân viên lúc mới vào làm để chụp mặt lần đầu
exports.registerFace = async (req, res) => {
  try {
    const { userId, descriptor } = req.body;
    await User.findByIdAndUpdate(userId, { faceDescriptor: descriptor });
    res
      .status(200)
      .json({ success: true, message: "Đăng ký khuôn mặt thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy lịch sử chấm công của user đang đăng nhập
exports.getMyAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let query = { userId: userId };

    // Lọc theo khoảng thời gian nếu có 
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const history = await Attendance.find(query).sort({ date: -1 }); // Mới nhất lên đầu

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};