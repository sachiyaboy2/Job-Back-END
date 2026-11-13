import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../utils/constants.js";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, default: "", maxlength: 2000 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "system", index: true },
    link: { type: String, trim: true, default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

notificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    body: this.body || "",
    type: this.type,
    link: this.link || null,
    read: Boolean(this.read),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;
