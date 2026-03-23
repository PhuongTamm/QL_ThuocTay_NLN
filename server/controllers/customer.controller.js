const Customer = require("../models/Customer");

// Lấy danh sách toàn bộ khách hàng để hiển thị gợi ý (Autocomplete) trên POS
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .select("name phone points")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
