const notFound = (req, res, next) => {
  const error = new Error(`Not Found Route - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // có lỗi thì trả về 500, không có lỗi thì trả về 200
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  return res.status(statusCode).json({
    success: false,
    message: err.message,
  });
};

module.exports = { notFound, errorHandler };
