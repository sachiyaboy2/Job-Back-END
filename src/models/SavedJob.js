import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

// A job can only be saved once per seeker.
savedJobSchema.index({ user: 1, job: 1 }, { unique: true });

savedJobSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    user: this.user ? this.user.toString() : null,
    job: this.job ? this.job.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SavedJob = mongoose.models.SavedJob || mongoose.model("SavedJob", savedJobSchema);
export default SavedJob;
