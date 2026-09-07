const jwt = require("jsonwebtoken");

/*
  Two ways in.

  1. The browser app logs in with a password and gets a JWT. That token is
     what the React client sends on every request.

  2. Automation (phone shortcuts, cron jobs, curl) sends a fixed API key in
     the x-api-key header instead. Shortcuts cannot reasonably do a login
     flow, and this key only unlocks a narrow set of write endpoints.

  There is one user, so there is no user table. The password hash and the
  key both live in Lambda environment variables.
*/

function signToken() {
  return jwt.sign({ sub: "owner" }, process.env.JWT_SECRET, {
    expiresIn: process.env.TOKEN_TTL || "30d",
  });
}

function readBearer(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) return null;

  return header.slice(7).trim();
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function requireAuth(req, res, next) {
  const token = readBearer(req);

  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);

      req.authMethod = "jwt";

      return next();
    } catch (error) {
      return res.status(401).json({ error: "Session expired. Sign in again." });
    }
  }

  return res.status(401).json({ error: "Authentication required." });
}

/*
  Used on endpoints that automation is allowed to hit. Accepts either a
  valid session token or the API key.
*/

function requireAuthOrApiKey(req, res, next) {
  const key = req.headers["x-api-key"];

  if (key && process.env.API_KEY && timingSafeEqual(key, process.env.API_KEY)) {
    req.authMethod = "apikey";

    return next();
  }

  return requireAuth(req, res, next);
}

module.exports = { signToken, requireAuth, requireAuthOrApiKey };
