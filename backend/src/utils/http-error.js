// Builds an error the central error handler (middleware/error-handler.js)
// turns into a JSON response:
//
//   next(createError("Account not found.", 404))
//   -> 404 { success: false, message: "Account not found." }
//
// `code` is an optional machine-readable reason the client can branch on
// (e.g. "token_expired"); `details` is an optional list of field errors.
export const createError = (message, statusCode, code, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  if (details) error.details = details;
  return error;
};

// An error handler for controllers whose writes can hit a unique constraint:
// Postgres code 23505 becomes a 409 with `message`; anything else goes on to
// the central error handler.
//
//   const handleError = conflictOnDuplicate("A budget already exists for this month.");
//   ... catch (error) { handleError(error, next); }
export const conflictOnDuplicate = (message) => (error, next) => {
  if (error.code === "23505") {
    return next(createError(message, 409));
  }

  next(error);
};
