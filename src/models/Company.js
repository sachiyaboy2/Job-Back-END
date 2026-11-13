import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    logoUrl: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    industry: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "", index: true },
    website: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isVerified: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false },
);

companySchema.index({ name: "text", industry: "text", description: "text" });

companySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    logoUrl: this.logoUrl || "",
    description: this.description || "",
    industry: this.industry || "",
    address: this.address || "",
    district: this.district || "",
    website: this.website || "",
    contactPerson: this.contactPerson || "",
    contactEmail: this.contactEmail || "",
    contactPhone: this.contactPhone || "",
    owner: this.owner ? this.owner.toString() : null,
    isVerified: Boolean(this.isVerified),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
export default Company;
