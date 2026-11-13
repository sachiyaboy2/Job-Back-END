import mongoose from "mongoose";

const cvSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

cvSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    owner: this.owner ? this.owner.toString() : null,
    originalName: this.originalName,
    filename: this.filename,
    mimeType: this.mimeType,
    size: this.size,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const CV = mongoose.models.CV || mongoose.model("CV", cvSchema);
export default CV;
