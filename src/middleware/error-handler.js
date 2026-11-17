const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;

  const message =
    statusCode >= 500
      ? "Internal server error"
      : err.message || "Request failed";

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details && { errors: err.details }),
  });
};

export default errorHandler;
