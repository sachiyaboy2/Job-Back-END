// Throw from any controller; the error handler turns it into the error envelope.
export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message = "Invalid request", details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Not authorized", details) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = "You do not have permission to do this", details) {
    return new ApiError(403, message, details);
  }

  static notFound(message = "Not found", details) {
    return new ApiError(404, message, details);
  }

  static conflict(message = "Already exists", details) {
    return new ApiError(409, message, details);
  }

  static payloadTooLarge(message = "File too large", details) {
    return new ApiError(413, message, details);
  }

  static tooManyRequests(message = "Too many requests", details) {
    return new ApiError(429, message, details);
  }

  static serviceUnavailable(message = "Service temporarily unavailable", details) {
    return new ApiError(503, message, details);
  }
}

export default ApiError;
