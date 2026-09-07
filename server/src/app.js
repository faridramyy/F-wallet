const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { connectToDatabase } = require("./db");
const { signToken, requireAuth, requireAuthOrApiKey } = require("./auth");
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
  Every route needs the database. Connecting here rather than at module
  load keeps a cold Lambda from crashing before it can return a useful
  error message.
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

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------------------------------------------------------
   Login
--------------------------------------------------------- */

app.post("/auth/login", async (req, res) => {
  const { password } = req.body || {};

  const hash = process.env.PASSWORD_HASH;

  if (!hash) {
    return res.status(500).json({ error: "Server is missing PASSWORD_HASH." });
  }

  if (!password || !(await bcrypt.compare(String(password), hash))) {
    // Deliberately vague, and deliberately slow because bcrypt already is.

    return res.status(401).json({ error: "Incorrect password." });
  }

  res.json({ token: signToken() });
});

app.get("/auth/check", requireAuth, (req, res) => {
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   API

   POST /api/transactions accepts the API key so automation can add
   spending without a login. Everything else is session only, so a leaked
   key cannot read your balances or delete your history.
--------------------------------------------------------- */

app.use("/api", (req, res, next) => {
  const isAutomationEndpoint = req.method === "POST" && req.path === "/transactions";

  return isAutomationEndpoint
    ? requireAuthOrApiKey(req, res, next)
    : requireAuth(req, res, next);
});

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
