const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },

    // Ngày tháng định dạng YYYY-MM-DD để dễ query
    date: { type: String, required: true },

    // MẢNG LƯU CÁC LẦN QUÉT MẶT TRONG NGÀY 
    scanTimes: [{ type: Date }],

    status: {
      type: String,
      enum: ["PRESENT", "LATE", "ABSENT"],
      default: "PRESENT",
    },
  },
  { timestamps: true },
);

// Đảm bảo mỗi nhân viên chỉ có 1 document (phiếu chấm công) duy nhất mỗi ngày
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
