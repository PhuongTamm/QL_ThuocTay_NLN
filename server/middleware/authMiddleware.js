const { verifyAccessToken } = require("../utils/jwt");

// Middleware xác thực đăng nhập
const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Không tìm thấy token, vui lòng đăng nhập.",
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }

  req.user = decoded;
  // console.log(req);
  // (req.user = { id: user._id, role: user.role, branchId: user.branchId });
    next();
};

// Middleware phân quyền
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này.",
      });
    }
    next();
  };
};

module.exports = { verifyToken, checkRole };
