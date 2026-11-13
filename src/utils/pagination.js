const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

/** Escape user input so it can be used safely inside a RegExp. */
export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Read pagination parameters from a query string.
 * @param {object} query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 */
export function readPagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  const rawPage = Number.parseInt(query.page, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = Number.parseInt(query.limit, 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export default { readPagination, buildMeta, escapeRegex };
