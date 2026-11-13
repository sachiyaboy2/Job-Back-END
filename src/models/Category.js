import mongoose from "mongoose";
import { slugify } from "../utils/districts.js";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    icon: { type: String, trim: true, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false }
);

// Keep the slug in step with the name.
categorySchema.pre("validate", function syncSlug() {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

categorySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    icon: this.icon || "",
    order: this.order ?? 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
