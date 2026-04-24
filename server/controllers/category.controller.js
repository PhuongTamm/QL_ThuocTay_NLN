const Category = require("../models/Category");

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Kiểm tra trùng tên
    const exists = await Category.findOne({ name });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Danh mục này đã tồn tại" });

    const newCategory = await Category.create({ name, description });

    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }, // Trả về document sau khi cập nhật
    );

    if (!updatedCategory)
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    res.status(200).json({
      success: true,
      message: "Cập nhật danh mục thành công",
      updatedCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật danh mục", error: error.message });
  }
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Lưu ý: Trong thực tế, bạn nên kiểm tra xem có Thuốc nào đang dùng danh mục này không trước khi xóa
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory)
      return res.status(404).json({ message: "Không tìm thấy danh mục" });

    res.status(200).json({ success: true, message: "Xóa danh mục thành công" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi xóa danh mục", error: error.message });
  }
};
