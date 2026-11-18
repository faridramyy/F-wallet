const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;

  // Log unexpected server errors without exposing details to clients.
  if (statusCode >= 500) {
    console.error("Server error:", {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });
  }

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
