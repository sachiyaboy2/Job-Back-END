import Company from "../models/Company.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/jwt.js";
import { hashPassword } from "../utils/password.js";
import { publicUser } from "../utils/serialize.js";
import { setSessionCookie } from "../middleware/auth.js";

/**
 * POST /api/auth/register
 * { name, email, password, role: 'seeker' | 'employer', companyName? }
 */
export async function register(req, res) {
  const { name, email, password, role, companyName, phone, district } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict("An account with that email already exists", [
      { field: "email", message: "Email is already registered" },
    ]);
  }

  // Employers always get a company of their own.
  let company = null;
  if (role === "employer") {
    if (!companyName) {
      throw ApiError.badRequest("Validation failed", [
        { field: "companyName", message: "Company name is required for employer accounts" },
      ]);
    }
    company = await Company.create({
      name: companyName,
      owner: null,
      contactEmail: email.toLowerCase(),
      isVerified: false,
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone: phone || "",
    district: district || "",
    company: company ? company._id : null,
  });

  if (company) {
    company.owner = user._id;
    await company.save();
  }

  const token = signToken(user);
  setSessionCookie(res, token);

  const payload = { token, user: publicUser(user) };
  res.status(201).json({ success: true, message: "Account created", ...payload, data: payload });
}

/**
 * POST /api/auth/login
 * { email, password }
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password", [
      { field: "email", message: "Invalid email or password" },
    ]);
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw ApiError.unauthorized("Invalid email or password", [
      { field: "password", message: "Invalid email or password" },
    ]);
  }

  if (user.isSuspended) {
    throw ApiError.forbidden("This account has been suspended");
  }

  const token = signToken(user);
  setSessionCookie(res, token);

  const payload = { token, user: publicUser(user) };
  res.status(200).json({ success: true, message: "Logged in", ...payload, data: payload });
}

/** GET /api/auth/me */
export async function me(req, res) {
  const user = publicUser(req.user);
  res.status(200).json({ success: true, user, data: user });
}

export default { register, login, me };
