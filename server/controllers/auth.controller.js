// auth.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateAccessToken } = require("../utils/jwt");

const authController = {
  // 1. Đăng ký (Tạo tài khoản mới)
  register: async (req, res) => {
    try {
      const { username, password, fullName, role, branchId, email, phone } =
        req.body;

      // Kiểm tra username tồn tại
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Tên đăng nhập đã tồn tại.",
        });
      }

      // Hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Tạo user mới
      const newUser = new User({
        username,
        password: hashedPassword,
        fullName,
        role,
        branchId: role === "admin" ? null : branchId,
        email,
        phone,
      });

      await newUser.save();

      // Trả về thông tin (không bao gồm password)
      const { password: _, ...userInfo } = newUser._doc;

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản thành công.",
        user: userInfo,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi đăng ký.",
        error: error.message,
      });
    }
  },

  // 2. Đăng nhập
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Tìm user
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Sai tên đăng nhập hoặc mật khẩu.",
        });
      }

      // Kiểm tra mật khẩu
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Sai tên đăng nhập hoặc mật khẩu.",
        });
      }

      // Tạo token
      const accessToken = generateAccessToken(user);
      const { password: _, ...userInfo } = user._doc;

      return res.status(200).json({
        success: true,
        message: "Đăng nhập thành công.",
        accessToken,
        user: userInfo,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi đăng nhập.",
        error: error.message,
      });
    }
  },

  // 3. Lấy thông tin người dùng hiện tại
  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng.",
        });
      }
      return res.json({
        success: true,
        user: user,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thông tin.",
      });
    }
  },
};

module.exports = authController;
