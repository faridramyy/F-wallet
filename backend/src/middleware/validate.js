import { createError } from "../utils/http-error.js";

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(createError("Validation failed", 400, undefined, details));
    }

    req.validated = result.data;

    next();
  };
};

export default validate;
