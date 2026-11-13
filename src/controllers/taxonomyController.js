import Category from "../models/Category.js";
import District from "../models/District.js";
import { okList } from "../utils/response.js";

/** GET /api/categories */
export async function listCategories(req, res) {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  const items = categories.map((category) => category.toPublicJSON());

  return okList(res, "categories", items, {
    page: 1,
    limit: items.length,
    total: items.length,
    totalPages: items.length ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
}

/** GET /api/districts */
export async function listDistricts(req, res) {
  const districts = await District.find().sort({ order: 1, name: 1 });
  const items = districts.map((district) => district.toPublicJSON());

  return okList(res, "districts", items, {
    page: 1,
    limit: items.length,
    total: items.length,
    totalPages: items.length ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
}

export default { listCategories, listDistricts };
