import { Router } from "express";
import { getHealth, getDatabaseHealth } from "./health.controller.js";
import requireAuth from "../../middleware/auth.js";

const router = Router();

router.get("/", getHealth);
router.get("/db", getDatabaseHealth);

// Checks that the caller's Cognito tokens are accepted.
router.get("/auth", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: {
      sub: req.user.sub,
      email: req.user.email,
    },
  });
});

export default router;
