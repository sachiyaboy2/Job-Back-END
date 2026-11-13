import mongoose from "mongoose";
import { ROLES } from "../utils/constants.js";
import { verifyPassword } from "../utils/password.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "seeker", index: true },
    phone: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    // Employers link to the company they own.
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false },
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return verifyPassword(plain, this.passwordHash);
};

/** Public shape of a user. The password hash is never part of it. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone || "",
    district: this.district || "",
    avatarUrl: this.avatarUrl || "",
    isVerified: Boolean(this.isVerified),
    isSuspended: Boolean(this.isSuspended),
    company: this.company ? this.company.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
