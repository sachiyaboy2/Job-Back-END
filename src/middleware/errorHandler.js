import mongoose from "mongoose";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

/**
 * Central error handler.
 *
 * Always answers with { success: false, error: { message, statusCode, details? } }.
 * A top level `message` is repeated for clients that read `data.message`.
 */
export function errorHandler(error, req, res, _next) {
  let status = 500;
  let message = "Internal server error";
  let details;

  if (error instanceof ApiError) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
    status = 404;
    message = "Not found";
  } else if (error?.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyValue || {})[0] || "field";
    message = `Duplicate value for ${field}`;
    details = [{ field, message: `${field} already exists` }];
  } else if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      status = 413;
      message = "File is too large";
      details = [{ field: "file", message: `Maximum size is ${process.env.MAX_CV_SIZE_MB || 5} MB` }];
    } else {
      status = 400;
      message = error.message;
    }
  } else if (error?.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (error?.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  } else if (error?.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  } else if (error?.name === "TokenExpiredError") {
    status = 401;
    message = "Your session has expired. Please sign in again.";
  } else if (error?.message === "Not allowed by CORS") {
    status = 403;
    message = "Origin not allowed";
  } else if (error?.message) {
    message = error.message;
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  const body = {
    success: false,
    message,
    error: {
      message,
      statusCode: status,
      ...(details ? { details } : {}),
    },
  };

  res.status(status).json(body);
}

export default errorHandler;
