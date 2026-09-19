const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { connectToDatabase } = require("./db");
const {
  signToken,
  requireAuth,
  requireAuthOrApiKey,
  blockViewerWrites,
  requireOwner,
} = require("./auth");
const {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
} = require("./rateLimit");
const coreRoutes = require("./routes/core");
const transactionRoutes = require("./routes/transactions");

const app = express();

app.disable("x-powered-by");

/*
  The frontend is served from GitHub Pages, so requests are cross origin.
  ALLOWED_ORIGINS is a comma separated list, which keeps a local dev build
  and the deployed Pages site working at the same time.
*/

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No origin header means curl or a phone shortcut, which is allowed
      // because those requests still have to pass the API key check.

      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed."));
    },
    credentials: false,
  }),
);

app.use(express.json({ limit: "2mb" }));

/*
  Health check.

  Declared before the database middleware on purpose. A health endpoint
  that fails when Mongo is unreachable cannot tell you which half of the
  system is broken, which is the one moment you need it to.
*/

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/*
  Every other route needs the database. Connecting here rather than at
  module load keeps a cold Lambda from crashing before it can return a
  useful error message.
*/

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();

    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(503).json({ error: "Database unavailable." });
  }
});

/* ---------------------------------------------------------
   Login
--------------------------------------------------------- */

app.post("/auth/login", async (req, res) => {
  const { password } = req.body || {};

  const ownerHash = process.env.PASSWORD_HASH;
  const viewerHash = process.env.VIEWER_PASSWORD_HASH;

  if (!ownerHash) {
    return res.status(500).json({ error: "Server is missing PASSWORD_HASH." });
  }

  const limit = await checkLoginAllowed(req);

  if (!limit.allowed) {
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${limit.minutesLeft} minute${
        limit.minutesLeft === 1 ? "" : "s"
      }.`,
    });
  }

  if (!password) {
    await recordFailedLogin(req);
    return res.status(401).json({ error: "Incorrect password." });
  }

  const attempt = String(password);

  if (await bcrypt.compare(attempt, ownerHash)) {
    await clearLoginAttempts(req);
    return res.json({ token: signToken("owner"), role: "owner" });
  }

  if (viewerHash && (await bcrypt.compare(attempt, viewerHash))) {
    await clearLoginAttempts(req);
    return res.json({ token: signToken("viewer"), role: "viewer" });
  }

  await recordFailedLogin(req);
  return res.status(401).json({ error: "Incorrect password." });
});

app.get("/auth/check", requireAuth, (req, res) => {
  res.json({ ok: true, role: req.authRole });
});

/*
  Share links.

  The owner mints a viewer token with a short life and hands out a URL
  containing it. Anyone with the link gets read only access until it
  expires, with no password to remember and nothing to revoke by hand.
*/

app.post("/auth/share-link", requireAuth, requireOwner, (req, res) => {
  const days = Math.min(Math.max(Number(req.body?.days) || 7, 1), 90);

  res.json({
    token: signToken("viewer", `${days}d`),
    expiresInDays: days,
  });
});

/* ---------------------------------------------------------
   API

   POST /api/transactions accepts the API key so automation can add
   spending without a login. Everything else is session only, so a leaked
   key cannot read your balances or delete your history.
--------------------------------------------------------- */

app.use("/api", (req, res, next) => {
  const isAutomationEndpoint =
    req.method === "POST" && req.path === "/transactions";

  return isAutomationEndpoint
    ? requireAuthOrApiKey(req, res, next)
    : requireAuth(req, res, next);
});

// Read only enforcement sits after authentication, so the role is known,
// and before the routes, so every one of them is covered.
app.use("/api", blockViewerWrites);
app.use("/api", coreRoutes);
app.use("/api", transactionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error && error.code === 11000) {
    return res.status(409).json({ error: "That record already exists." });
  }

  res.status(500).json({ error: "Something went wrong." });
});

module.exports = app;
