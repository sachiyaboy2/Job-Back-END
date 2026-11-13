import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Turns failed express-validator rules into a 400 with a per-field details array.
 * Every write route runs through this, so clients always get the same shape.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((error) => ({
    field: error.path ?? error.param ?? error.type,
    message: error.msg,
  }));

  return next(ApiError.badRequest("Validation failed", details));
}

export default validate;
