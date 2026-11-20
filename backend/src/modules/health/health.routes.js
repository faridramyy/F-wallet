import { Router } from "express";
import { getHealth, getDatabaseHealth } from "./health.controller.js";
import authenticate from "../../middleware/authenticate.js";

const router = Router();

router.get("/", getHealth);
router.get("/db", getDatabaseHealth);

// Temporary authentication test endpoint
router.get("/auth", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: {
      sub: req.user.sub,
      username: req.user.username,
    },
  });
});

export default router;
