/**
 * Shapes returned to clients. Everything that leaves the API goes through one
 * of these so the password hash can never reach a response.
 */

const isPlainId = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.toString === "function" &&
  !(value.name !== undefined && value._id !== undefined);

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return null;
};

const plain = (value) => {
  if (!value) return null;
  if (typeof value.toObject === "function") return value.toObject({ virtuals: false });
  return value;
};

/** A user without the password hash. */
export function publicUser(user) {
  if (!user) return null;
  const source = plain(user);

  return {
    id: idOf(source._id ?? source.id),
    name: source.name,
    email: source.email,
    role: source.role,
    phone: source.phone || "",
    district: source.district || "",
    avatarUrl: source.avatarUrl || "",
    isVerified: Boolean(source.isVerified),
    isSuspended: Boolean(source.isSuspended),
    company: idOf(source.company),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

/** A company. */
export function publicCompany(company) {
  if (!company) return null;
  const source = plain(company);

  return {
    id: idOf(source._id ?? source.id),
    name: source.name,
    logoUrl: source.logoUrl || "",
    description: source.description || "",
    industry: source.industry || "",
    address: source.address || "",
    district: source.district || "",
    website: source.website || "",
    contactPerson: source.contactPerson || "",
    contactEmail: source.contactEmail || "",
    contactPhone: source.contactPhone || "",
    owner: idOf(source.owner),
    isVerified: Boolean(source.isVerified),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

/** The employer shown on a job. Never the whole user document. */
export function embeddedEmployer(user) {
  if (!user) return null;
  if (isPlainId(user)) return { id: idOf(user) };

  return {
    id: idOf(user._id ?? user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    district: user.district || "",
    avatarUrl: user.avatarUrl || "",
    role: user.role,
  };
}

/** The company shown on a job. */
export function embeddedCompany(company) {
  if (!company) return null;
  if (isPlainId(company)) return { id: idOf(company) };

  return {
    id: idOf(company._id ?? company.id),
    name: company.name,
    logoUrl: company.logoUrl || "",
    industry: company.industry || "",
    district: company.district || "",
    description: company.description || "",
    isVerified: Boolean(company.isVerified),
  };
}

/** A job with its employer and company embedded. Accepts a Mongoose doc or a raw row. */
export function publicJob(job) {
  if (!job) return null;
  const source = plain(job);

  return {
    id: idOf(source._id ?? source.id),
    title: source.title,
    category: source.category,
    description: source.description,
    responsibilities: source.responsibilities || "",
    qualifications: source.qualifications || "",
    experienceRequired: source.experienceRequired || "",
    experienceLevel: source.experienceLevel,
    educationLevel: source.educationLevel,
    skills: source.skills || [],
    location: source.location || "",
    district: source.district || "",
    employmentType: source.employmentType,
    workMode: source.workMode,
    salaryMin: source.salaryMin ?? 0,
    salaryMax: source.salaryMax ?? 0,
    salaryNegotiable: Boolean(source.salaryNegotiable),
    benefits: source.benefits || "",
    vacancies: source.vacancies ?? 1,
    deadline: source.deadline || null,
    status: source.status,
    isFeatured: Boolean(source.isFeatured),
    employer: embeddedEmployer(source.employer),
    company: embeddedCompany(source.company),
    applicationsCount: source.applicationsCount ?? 0,
    views: source.views ?? 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export default { publicUser, publicCompany, publicJob, embeddedEmployer, embeddedCompany };
