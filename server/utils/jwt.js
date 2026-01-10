const jwt = require("jsonwebtoken");

// Secret keys nên được lưu trong biến môi trường (.env)
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "access-secret-key-123";
// const REFRESH_TOKEN_SECRET =
//   process.env.REFRESH_TOKEN_SECRET || "refresh-secret-key-123";

const generateAccessToken = (user) => {
  // Payload chứa id và role để tiện phân quyền
  return jwt.sign(
    { id: user._id, role: user.role, branchId: user.branchId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "20d" } // Token hết hạn sau 20 ngày
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
