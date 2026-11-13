import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { AUTH_COOKIE } from "../utils/constants.js";
import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

/** Read a single cookie from the request without a cookie-parser dependency. */
export function readCookie(req, cookieName) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== cookieName) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/** The token from the Authorization header, or from the httpOnly session cookie. */
export function tokenFromRequest(req) {
  const header = req.header("Authorization");
  const bearerToken = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearerToken || readCookie(req, AUTH_COOKIE);
}

/**
 * Resolve the current user from the request.
 * @returns {Promise<import('mongoose').Document|null>}
 */
export async function userFromRequest(req) {
  const token = tokenFromRequest(req);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.id) return null;

  return User.findById(decoded.id).select("+passwordHash");
}

/** Sets the httpOnly session cookie next to the token in the body. */
export function setSessionCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

/** Reads the user when a token is present, but never fails the request. */
export async function optionalAuth(req, _res, next) {
  try {
    const user = await userFromRequest(req);
    if (user) req.user = user;
  } catch {
    // An invalid token on a public route simply means "not signed in".
  }
  next();
}

/** Requires a valid token. 401 without one, 403 when the account is suspended. */
export async function requireAuth(req, _res, next) {
  let user;
  try {
    user = await userFromRequest(req);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Your session has expired. Please sign in again."));
    }
    return next(ApiError.unauthorized("Invalid or expired token"));
  }

  if (!user) return next(ApiError.unauthorized("Please log in first"));

  if (user.isSuspended) {
    return next(ApiError.forbidden("This account has been suspended"));
  }

  req.user = user;
  next();
}

/** Requires one of the given roles. 403 when the role does not match. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized("Please log in first"));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to do this"));
    }
    next();
  };
}

export default { requireAuth, requireRole, optionalAuth, tokenFromRequest, readCookie };
