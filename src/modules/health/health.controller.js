export const getHealth = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "F-Wallet API is running",
    timestamp: new Date().toISOString(),
  });
};
