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

/*
  Tokens carry a role. "owner" can do anything; "viewer" is read only.

  The role lives inside the signed token rather than being looked up per
  request, so it cannot be tampered with without invalidating the
  signature.
*/

function signToken(role = "owner", ttl) {
  return jwt.sign({ sub: role, role }, process.env.JWT_SECRET, {
    expiresIn: ttl || process.env.TOKEN_TTL || "30d",
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
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      req.authMethod = "jwt";
      req.authRole = payload.role;

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
    // The automation key is owner level but only reaches the one endpoint
    // it is mounted on.
    req.authRole = "owner";

    return next();
  }

  return requireAuth(req, res, next);
}

/*
  The actual read only rule.

  Anything that is not a GET is refused for a viewer. Enforcing it here
  rather than in the frontend is the whole point: hiding buttons stops
  nobody who can open dev tools and call the API directly.
*/

function blockViewerWrites(req, res, next) {
  if (req.authRole === "viewer" && req.method !== "GET") {
    return res.status(403).json({
      error:
        "This is a read only user. You do not have permission to make changes.",
    });
  }

  return next();
}

function requireOwner(req, res, next) {
  if (req.authRole !== "owner") {
    return res.status(403).json({
      error:
        "This is a read only user. You do not have permission to make changes.",
    });
  }

  return next();
}

module.exports = {
  signToken,
  requireAuth,
  requireAuthOrApiKey,
  blockViewerWrites,
  requireOwner,
};
