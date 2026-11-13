import mongoose from "mongoose";
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
} from "../utils/constants.js";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    responsibilities: { type: String, trim: true, default: "" },
    qualifications: { type: String, trim: true, default: "" },
    experienceRequired: { type: String, trim: true, default: "" },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: "entry" },
    educationLevel: { type: String, enum: EDUCATION_LEVELS, default: "any" },
    skills: { type: [String], default: [] },
    location: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "", index: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "full-time", index: true },
    workMode: { type: String, enum: WORK_MODES, default: "onsite", index: true },
    salaryMin: { type: Number, default: 0, min: 0 },
    salaryMax: { type: Number, default: 0, min: 0 },
    salaryNegotiable: { type: Boolean, default: false },
    benefits: { type: String, trim: true, default: "" },
    vacancies: { type: Number, default: 1, min: 1 },
    deadline: { type: Date, default: null },
    status: { type: String, enum: JOB_STATUSES, default: "draft", index: true },
    isFeatured: { type: Boolean, default: false },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    applicationsCount: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, versionKey: false },
);

// Indexes for the common catalogue queries.
jobSchema.index({ category: 1, createdAt: -1 });
jobSchema.index({ district: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ title: "text", description: "text", skills: "text" });

/** Flat public shape. `employer` and `company` are plain ids here. */
jobSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    category: this.category,
    description: this.description,
    responsibilities: this.responsibilities || "",
    qualifications: this.qualifications || "",
    experienceRequired: this.experienceRequired || "",
    experienceLevel: this.experienceLevel,
    educationLevel: this.educationLevel,
    skills: this.skills || [],
    location: this.location || "",
    district: this.district || "",
    employmentType: this.employmentType,
    workMode: this.workMode,
    salaryMin: this.salaryMin ?? 0,
    salaryMax: this.salaryMax ?? 0,
    salaryNegotiable: Boolean(this.salaryNegotiable),
    benefits: this.benefits || "",
    vacancies: this.vacancies ?? 1,
    deadline: this.deadline,
    status: this.status,
    isFeatured: Boolean(this.isFeatured),
    employer: this.employer ? this.employer.toString() : null,
    company: this.company ? this.company.toString() : null,
    applicationsCount: this.applicationsCount ?? 0,
    views: this.views ?? 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
export default Job;
