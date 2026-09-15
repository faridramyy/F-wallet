const mongoose = require("mongoose");

/*
  Login throttling.

  The API is public and guarded by a single password, so nothing stops
  someone trying passwords in a loop. bcrypt at cost 12 already makes each
  attempt slow, but slow is not the same as limited.

  The counter lives in MongoDB rather than in memory because Lambda
  discards memory between cold starts. An in-process counter would reset
  every few minutes, which is exactly the window an attacker needs.

  Records expire on their own via a TTL index, so nothing has to clean up
  after this.
*/

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

const loginAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // MongoDB deletes the document once this time passes, so the window
  // slides without a cron job or a cleanup query.
  expiresAt: { type: Date, required: true, expires: 0 },
});

const LoginAttempt =
  mongoose.models.LoginAttempt ||
  mongoose.model("LoginAttempt", loginAttemptSchema);

/*
  API Gateway puts the caller's address at the front of x-forwarded-for.
  It can be spoofed by anything upstream, but behind API Gateway the
  first entry is what the gateway observed, which is good enough to make
  bulk guessing expensive.
*/

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");

  return forwarded.split(",")[0].trim() || req.ip || "unknown";
}

async function checkLoginAllowed(req) {
  const record = await LoginAttempt.findOne({ key: clientKey(req) }).lean();

  if (!record) return { allowed: true };

  if (record.count < MAX_ATTEMPTS) return { allowed: true };

  const minutesLeft = Math.max(
    1,
    Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 60000),
  );

  return { allowed: false, minutesLeft };
}

async function recordFailedLogin(req) {
  const key = clientKey(req);

  /*
    setOnInsert on expiresAt means the window starts at the first failure
    and does not extend with each attempt. Otherwise someone could be
    locked out indefinitely by a script running in the background.
  */

  await LoginAttempt.updateOne(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt: new Date(Date.now() + WINDOW_MINUTES * 60000),
      },
    },
    { upsert: true },
  );
}

async function clearLoginAttempts(req) {
  await LoginAttempt.deleteOne({ key: clientKey(req) });
}

module.exports = {
  MAX_ATTEMPTS,
  WINDOW_MINUTES,
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
};
