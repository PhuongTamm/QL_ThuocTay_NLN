const User = require("../models/User");

// Lấy danh sách người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").populate("branch");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};

// Tạo người dùng mới
exports.createUser = async (req, res) => {
  try {
    const { username, password, fullName, role, branch, phone } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const newUser = new User({
      username,
      password,
      fullName,
      role,
      branch,
      phone,
    });
    await newUser.save();

    res.status(201).json({
      message: "Tạo người dùng thành công",
      user: { _id: newUser._id, username: newUser.username },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi tạo người dùng", error: error.message });
  }
};

// Cập nhật người dùng
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Không cho phép cập nhật password trực tiếp qua endpoint này
    if (updateData.password) delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");
    res.status(200).json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật người dùng", error: error.message });
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "Đã xóa người dùng" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa người dùng", error: error.message });
  }
};
