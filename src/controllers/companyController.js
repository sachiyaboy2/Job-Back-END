import Company from "../models/Company.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, escapeRegex, readPagination } from "../utils/pagination.js";
import { okList, okResource } from "../utils/response.js";
import { publicCompany } from "../utils/serialize.js";

/**
 * GET /api/companies
 * Public list with search and pagination.
 */
export async function listCompanies(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const { q, district } = req.query;

  const filter = {};
  if (district) filter.district = district;
  if (q && String(q).trim()) {
    const pattern = new RegExp(escapeRegex(String(q).trim()), "i");
    filter.$or = [{ name: pattern }, { industry: pattern }, { description: pattern }];
  }

  const [companies, total] = await Promise.all([
    Company.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Company.countDocuments(filter),
  ]);

  return okList(
    res,
    "companies",
    companies.map(publicCompany),
    buildMeta({ page, limit, total })
  );
}

/** GET /api/companies/:id */
export async function getCompanyById(req, res) {
  const company = await Company.findById(req.params.id);
  if (!company) throw ApiError.notFound("Company not found");

  return okResource(res, "company", publicCompany(company));
}

/** PATCH /api/companies/me - employer only. */
export async function updateMyCompany(req, res) {
  let company = null;

  if (req.user.company) {
    company = await Company.findById(req.user.company);
  }
  if (!company) {
    company = await Company.findOne({ owner: req.user._id });
  }
  if (!company) throw ApiError.notFound("You do not have a company yet");

  const body = req.body;
  const fields = [
    "name",
    "logoUrl",
    "description",
    "industry",
    "address",
    "district",
    "website",
    "contactPerson",
    "contactEmail",
    "contactPhone",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) company[field] = body[field];
  }

  await company.save();

  return okResource(res, "company", publicCompany(company), "Company updated");
}

export default { listCompanies, getCompanyById, updateMyCompany };
