import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../utils/constants.js";

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cv: { type: mongoose.Schema.Types.ObjectId, ref: "CV", default: null },
    coverLetter: { type: String, trim: true, default: "", maxlength: 4000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "applied", index: true },
    employerNote: { type: String, trim: true, default: "", maxlength: 2000 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

// One application per seeker per job.
applicationSchema.index({ job: 1, seeker: 1 }, { unique: true });

applicationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    job: this.job ? this.job.toString() : null,
    seeker: this.seeker ? this.seeker.toString() : null,
    cv: this.cv ? this.cv.toString() : null,
    coverLetter: this.coverLetter || "",
    status: this.status,
    employerNote: this.employerNote || "",
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);
export default Application;
