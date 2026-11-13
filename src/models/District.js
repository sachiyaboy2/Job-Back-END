import mongoose from "mongoose";
import { slugify } from "../utils/districts.js";

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

// Keep the slug in step with the name.
districtSchema.pre("validate", function syncSlug() {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

districtSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    order: this.order ?? 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const District = mongoose.models.District || mongoose.model("District", districtSchema);
export default District;
